"""Ortobor Workbook Creator — Telegram bot.

Single-file FSM bot. Runs on an exe.dev VM. Uses the LLM Gateway for free
Anthropic access when available, or a direct API key off-VM.

State machine (per chat):

    /new ─► WAIT_FILE ─► WAIT_TITLE ─► WAIT_PRESET ─► WAIT_FORMAT ─► GENERATING
                                                                       │
                                                                       ▼
                                                                    READY ◄─┐
                                                                       │    │
                                          ┌────────────────┬───────────┘    │
                                          ▼                ▼                │
                                     WAIT_COVER       WAIT_FEEDBACK         │
                                          │                │                │
                                          └────────────────┴────────────────┘

`/improve <slug>` enters a parallel multi-turn loop on an existing workbook.
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import re
import shutil
import sys
import textwrap
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import httpx
from dotenv import load_dotenv
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputFile,
    Update,
)
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None  # type: ignore

# ──────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────
load_dotenv()
log = logging.getLogger("wb-bot")

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
GITHUB_REPO = os.environ["GITHUB_REPO"]               # "owner/repo"
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
LLM_GATEWAY = os.getenv("LLM_GATEWAY", "1") == "1"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
DATA_DIR = Path(os.getenv("BOT_DATA_DIR", "/home/exedev/wb-data")).expanduser()
ALLOWED_IDS = {int(x) for x in os.getenv("ALLOWED_TG_IDS", "").split(",") if x.strip()}
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

DATA_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# ──────────────────────────────────────────────────────────────────────────
# FSM states
# ──────────────────────────────────────────────────────────────────────────
(
    WAIT_FILE,
    WAIT_TITLE,
    WAIT_PRESET,
    WAIT_FORMAT,
    READY,
    WAIT_COVER,
    WAIT_FEEDBACK,
    IMPROVE_LOOP,
) = range(8)

# ──────────────────────────────────────────────────────────────────────────
# Per-chat data lives in context.chat_data; this is just typed access.
# ──────────────────────────────────────────────────────────────────────────
@dataclass
class Session:
    source_text: str = ""
    source_filename: str = ""
    title: str = ""
    slug: str = ""
    preset: str = "green"          # green | blue
    fmt: str = "simple"            # simple | full
    workbook_html: str = ""
    workbook_path: str = ""        # workbooks/<slug>/out/workbook-<slug>.html
    thread: list[dict] = field(default_factory=list)  # for improve mode


def session(ctx: ContextTypes.DEFAULT_TYPE) -> Session:
    if "session" not in ctx.chat_data:
        ctx.chat_data["session"] = Session()
    return ctx.chat_data["session"]


# ──────────────────────────────────────────────────────────────────────────
# Auth gate
# ──────────────────────────────────────────────────────────────────────────
def auth_ok(update: Update) -> bool:
    if not ALLOWED_IDS:
        return True
    uid = update.effective_user.id if update.effective_user else 0
    return uid in ALLOWED_IDS


# ──────────────────────────────────────────────────────────────────────────
# Slug helpers
# ──────────────────────────────────────────────────────────────────────────
_SLUG_TR = str.maketrans({
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e",
    "є": "ie", "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "i", "й": "i",
    "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch",
    "ш": "sh", "щ": "shch", "ь": "", "ю": "iu", "я": "ia",
})

def slugify(s: str) -> str:
    s = s.strip().lower().translate(_SLUG_TR)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "workbook"


# ──────────────────────────────────────────────────────────────────────────
# Text extraction
# ──────────────────────────────────────────────────────────────────────────
def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        if PdfReader is None:
            return f"[pypdf not installed — cannot read {path.name}]"
        reader = PdfReader(str(path))
        return "\n\n".join(
            f"===== page {i+1} =====\n{p.extract_text() or ''}"
            for i, p in enumerate(reader.pages)
        )
    if suffix == ".pptx":
        return _extract_pptx_text(path)
    return f"[unsupported file type: {suffix}]"


def _extract_pptx_text(path: Path) -> str:
    """Unzip pptx, pull every <a:t> from each slide XML in slide order."""
    ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}t"
    out = []
    with zipfile.ZipFile(path) as zf:
        slide_names = sorted(
            (n for n in zf.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")),
            key=lambda n: int(re.search(r"slide(\d+)\.xml", n).group(1)),
        )
        for sn in slide_names:
            with zf.open(sn) as fh:
                tree = ET.parse(fh)
            texts = [t.text.strip() for t in tree.iter(ns) if t.text and t.text.strip()]
            n = int(re.search(r"slide(\d+)\.xml", sn).group(1))
            out.append(f"===== slide {n:02d} =====\n" + "\n".join(texts))
    return "\n\n".join(out)


# ──────────────────────────────────────────────────────────────────────────
# Anthropic client (LLM Gateway or direct)
# ──────────────────────────────────────────────────────────────────────────
def _llm_url() -> str:
    if LLM_GATEWAY:
        return "http://169.254.169.254/gateway/llm/anthropic/v1/messages"
    return "https://api.anthropic.com/v1/messages"


def _llm_headers() -> dict[str, str]:
    h = {"content-type": "application/json", "anthropic-version": "2023-06-01"}
    if not LLM_GATEWAY:
        h["x-api-key"] = ANTHROPIC_API_KEY
    return h


async def llm_call(
    *,
    system: str,
    messages: list[dict],
    max_tokens: int = 32_000,
    temperature: float = 0.4,
) -> str:
    payload = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": messages,
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=15.0)) as client:
        r = await client.post(_llm_url(), headers=_llm_headers(), json=payload)
        if r.status_code >= 400:
            raise RuntimeError(f"LLM error {r.status_code}: {r.text[:400]}")
        data = r.json()
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")


# ──────────────────────────────────────────────────────────────────────────
# GitHub
# ──────────────────────────────────────────────────────────────────────────
GH_API = "https://api.github.com"


async def gh_get_sha(repo: str, path: str) -> str | None:
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.get(
            f"{GH_API}/repos/{repo}/contents/{path}",
            headers={"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"},
        )
        if r.status_code == 200:
            return r.json().get("sha")
        return None


async def gh_put_file(repo: str, path: str, content_bytes: bytes, message: str) -> str:
    """Create or update a file. Returns html_url of the file."""
    sha = await gh_get_sha(repo, path)
    payload = {
        "message": message,
        "content": base64.b64encode(content_bytes).decode("ascii"),
    }
    if sha:
        payload["sha"] = sha
    async with httpx.AsyncClient(timeout=60.0) as c:
        r = await c.put(
            f"{GH_API}/repos/{repo}/contents/{path}",
            headers={"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"GitHub error {r.status_code}: {r.text[:400]}")
        return r.json().get("content", {}).get("html_url", "")


async def gh_list_workbooks(repo: str) -> list[str]:
    """Return list of topic slugs under workbooks/."""
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.get(
            f"{GH_API}/repos/{repo}/contents/workbooks",
            headers={"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"},
        )
        if r.status_code >= 400:
            return []
        return sorted(
            entry["name"]
            for entry in r.json()
            if entry["type"] == "dir" and not entry["name"].startswith("_")
        )


async def gh_get_file(repo: str, path: str) -> str | None:
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.get(
            f"{GH_API}/repos/{repo}/contents/{path}",
            headers={"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"},
        )
        if r.status_code != 200:
            return None
        return base64.b64decode(r.json()["content"]).decode("utf-8", errors="ignore")


# ──────────────────────────────────────────────────────────────────────────
# Prompts
# ──────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = textwrap.dedent("""\
    You generate printable HTML workbooks (A4, single self-contained file with embedded CSS+JS) for the Ortobor podology academy. Output ONE complete HTML document — nothing else, no preamble, no markdown fences.

    DESIGN CONTRACT (must follow exactly):
    - Page dim: width 794px × height 1123px (A4 @ 96dpi), fixed (not min-height)
    - Header bar with brand + section number, footer with page number, dashed cut-line between pages
    - Section title 20px / 800 weight / brand colour
    - Key-idea callout: left brand border, light tint background, 12px body, 9px uppercase label "КЛЮЧОВА ІДЕЯ" / "КЛЮЧЕВАЯ ИДЕЯ"
    - Task pills (colored chips above each task block): pill-table/pill-question/pill-chain/pill-checklist/pill-practice/pill-numbered/pill-reflect/pill-notes
    - Tables: dark header, alternating row tint, fill cells use class fill-cell italic
    - Reasoning chain: chain-block (filled) → chain-arrow → chain-empty (dashed) → ...
    - Reflection question: question-icon circle "?" + question-text + answer-line dashed lines
    - Checklist: checkbox + label

    PRESETS — apply by overriding `:root` CSS vars exactly:
    GREEN (Ortobor default):
        --primary:#014948; --primary-mid:#328A8A; --primary-light:#E8F5F3;
        --accent:#008C89; --accent-bright:#C6EE68; --key-idea-bg:#E8F5F3;
        --table-header:#014948; --table-row-alt:#F4FAF8; --border:#D0E8E4;
    BLUE:
        --primary:#0D1B5E; --primary-mid:#3A4A8C; --primary-light:#E6EBF7;
        --accent:#2563EB; --accent-bright:#7DD3FC; --key-idea-bg:#E6EBF7;
        --table-header:#0D1B5E; --table-row-alt:#F2F5FB; --border:#D4DBED;

    FORMAT — apply by page count:
    SIMPLE = cover + 4–7 content pages + reflection + final quote (8–10 total)
    FULL   = cover + intro + 3 blocks × (block-title + 3 sections) + reflection + final quote (15–20 total)

    UKRAINIAN MEDICAL STYLE (mandatory when lang=uk):
    - "хірургічне лікування" (never "хірургія"/"операція")
    - "Високий ризик …" (never "неминуче"/"гарантовано")
    - "одні з основних" (never "три причини")
    - "сесамоподібні", "згиначі", "розростання", "піднігтьовий" (correct spellings)
    - "поперечна розпластаність" (never "поперечне плоскостопість")
    - Adjective AFTER size for medical entities: "екзостоз великого розміру"
    - Podologist refers to specialist; podologist does NOT order imaging
    - "індивідуальні ортопедичні устілки" (never "устілки з пелотом")
    - No invented clinical cases — use placeholder text if source has none
    - Closing quote format: "<Condition> — це <mechanism>. <First action> — це перший крок до вирішення проблеми."

    INTERACTIVE LAYER (must be inlined verbatim near end of body):
    - Toolbar: brand pill, title, comment count badge, buttons: "Копіювати нотатки", "Замінити обкладинку" (icon 🖼), "Експорт PDF"
    - Each content block gets data-block="<unique-id>"; the JS auto-wraps with action buttons (move, comment, extend, remove)
    - Comments persist to localStorage under `wb-<slug>-comments`
    - Cover replace persists to localStorage under `wb-cover:<title>` and rehydrates on load
    - Print CSS hides editor chrome and forces A4 + background colors

    Output: COMPLETE HTML, ready to open in a browser.
""")


def user_prompt_for_generation(s: Session) -> str:
    lang_hint = "Ukrainian (uk)" if s.preset == "green" else "Russian (ru)"
    return textwrap.dedent(f"""\
        Generate a {s.fmt.upper()} workbook in the {s.preset.upper()} preset.

        Language: {lang_hint} (match the source material — if it's in another Slavic language, use that).
        Title: {s.title}
        Slug (for localStorage keys): {s.slug}
        Author: Євгеній Боровський · Ortobor Academy
        Handle: @ortobor_academy

        Source material (use this as the only source of facts — do not invent):

        ──────── BEGIN SOURCE ────────
        {s.source_text}
        ───────── END SOURCE ─────────

        Produce the full HTML now.
    """)


# ──────────────────────────────────────────────────────────────────────────
# Telegram handlers
# ──────────────────────────────────────────────────────────────────────────
HELP_TEXT = (
    "🩺 *Ortobor Workbook Bot*\n\n"
    "/new — створити новий зошит\n"
    "/list — мої зошити\n"
    "/improve `<slug>` — режим ітеративного покращення\n"
    "/cancel — скасувати поточну дію\n"
    "/help — ця довідка"
)


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not auth_ok(update):
        await update.message.reply_text("🚫 Доступ обмежено.")
        return
    await update.message.reply_text(HELP_TEXT, parse_mode=ParseMode.MARKDOWN)


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(HELP_TEXT, parse_mode=ParseMode.MARKDOWN)


async def cmd_cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.chat_data.pop("session", None)
    await update.message.reply_text("Скасовано. /new щоб почати знову.")
    return ConversationHandler.END


# ── /new flow ───────────────────────────────────────────────────────────
async def cmd_new(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    if not auth_ok(update):
        await update.message.reply_text("🚫")
        return ConversationHandler.END
    ctx.chat_data["session"] = Session()
    await update.message.reply_text(
        "📥 Надішліть джерело матеріалу — *.txt*, *.pdf* або *.pptx* (до 50 МБ).",
        parse_mode=ParseMode.MARKDOWN,
    )
    return WAIT_FILE


async def on_file(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    doc = update.message.document
    if not doc:
        await update.message.reply_text("Це не файл. Надішліть документ.")
        return WAIT_FILE
    name = doc.file_name or "source"
    if not name.lower().endswith((".txt", ".md", ".pdf", ".pptx")):
        await update.message.reply_text("Формат не підтримується. Очікую txt / pdf / pptx.")
        return WAIT_FILE
    await update.message.chat.send_action(ChatAction.TYPING)

    user_dir = DATA_DIR / str(update.effective_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    path = user_dir / name
    f = await doc.get_file()
    await f.download_to_drive(custom_path=str(path))

    text = extract_text(path)
    s = session(ctx)
    s.source_text = text
    s.source_filename = name

    kb = len(text) // 1024
    if kb < 1:
        await update.message.reply_text("⚠️ Витягнуто мало тексту — перевірте файл. Все одно продовжуємо.")
    await update.message.reply_text(
        f"✓ Прийнято: *{name}* — {kb} КБ тексту витягнуто.\n\n"
        "Як називається зошит? (наприклад: «Подагра»)",
        parse_mode=ParseMode.MARKDOWN,
    )
    return WAIT_TITLE


async def on_title(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    s = session(ctx)
    title = (update.message.text or "").strip()
    if not title or len(title) > 80:
        await update.message.reply_text("Дайте назву (1–80 символів).")
        return WAIT_TITLE
    s.title = title
    s.slug = slugify(title)
    kb = InlineKeyboardMarkup([[
        InlineKeyboardButton("🟢 Green (Ortobor)", callback_data="preset:green"),
        InlineKeyboardButton("🔵 Blue", callback_data="preset:blue"),
    ]])
    await update.message.reply_text(
        f"Назва: *{title}* (slug: `{s.slug}`)\n\nКольорова схема?",
        reply_markup=kb,
        parse_mode=ParseMode.MARKDOWN,
    )
    return WAIT_PRESET


async def on_preset(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    q = update.callback_query
    await q.answer()
    s = session(ctx)
    s.preset = q.data.split(":")[1]
    kb = InlineKeyboardMarkup([[
        InlineKeyboardButton("📄 SIMPLE (8–10 ст.)", callback_data="fmt:simple"),
        InlineKeyboardButton("📚 FULL (15–20 ст.)", callback_data="fmt:full"),
    ]])
    await q.edit_message_text(
        f"Тема: *{s.title}*\nКолір: *{s.preset}*\n\nФормат?",
        reply_markup=kb,
        parse_mode=ParseMode.MARKDOWN,
    )
    return WAIT_FORMAT


async def on_format(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    q = update.callback_query
    await q.answer()
    s = session(ctx)
    s.fmt = q.data.split(":")[1]
    await q.edit_message_text(
        f"⚙️ Генерую *{s.fmt.upper()}* зошит з кольором *{s.preset}*…\nЦе може зайняти 1–3 хвилини.",
        parse_mode=ParseMode.MARKDOWN,
    )

    chat_id = update.effective_chat.id
    asyncio.create_task(_generate_and_publish(chat_id, ctx))
    return GENERATING


async def _generate_and_publish(chat_id: int, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    s = session(ctx)
    bot = ctx.application.bot
    try:
        await bot.send_chat_action(chat_id, ChatAction.TYPING)
        html = await llm_call(
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt_for_generation(s)}],
        )
        html = _strip_md_fences(html)
        s.workbook_html = html
        s.workbook_path = f"workbooks/{s.slug}/out/workbook-{s.slug}.html"

        url = await gh_put_file(
            GITHUB_REPO,
            s.workbook_path,
            html.encode("utf-8"),
            f"workbook: add {s.slug} ({s.fmt}/{s.preset})",
        )

        await bot.send_document(
            chat_id,
            document=InputFile(io.BytesIO(html.encode("utf-8")), filename=f"workbook-{s.slug}.html"),
            caption=f"✓ Готово: *{s.title}*\n[Переглянути на GitHub]({url})\n\n"
                    f"Далі: надішліть фото для обкладинки, або текст із правками, або /done.",
            parse_mode=ParseMode.MARKDOWN,
        )
        ctx.chat_data["state"] = READY
    except Exception as exc:
        log.exception("generation failed")
        await bot.send_message(chat_id, f"❌ Помилка генерації: {exc}")


def _strip_md_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\n?", "", s)
        s = re.sub(r"\n?```$", "", s)
    return s.strip()


# ── /cancel global ───
async def cmd_done(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.chat_data.pop("session", None)
    ctx.chat_data.pop("state", None)
    await update.message.reply_text("👍 Завершено.")
    return ConversationHandler.END


# ── Cover replace ────────────────────────────────────────────────────────
async def on_photo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """If we just generated a workbook, swap the cover with this image."""
    s: Session | None = ctx.chat_data.get("session")
    if not s or not s.workbook_html:
        await update.message.reply_text("Спочатку згенеруйте зошит через /new.")
        return
    photo = update.message.photo[-1] if update.message.photo else None
    if not photo and update.message.document and update.message.document.mime_type.startswith("image/"):
        photo = update.message.document
    if not photo:
        return

    await update.message.chat.send_action(ChatAction.UPLOAD_DOCUMENT)
    f = await photo.get_file()
    buf = io.BytesIO()
    await f.download_to_memory(buf)
    data = buf.getvalue()
    mime = "image/jpeg"
    data_url = f"data:{mime};base64,{base64.b64encode(data).decode()}"

    new_html = _inject_cover_image(s.workbook_html, data_url)
    s.workbook_html = new_html
    url = await gh_put_file(
        GITHUB_REPO,
        s.workbook_path,
        new_html.encode("utf-8"),
        f"workbook: replace cover for {s.slug}",
    )
    await update.message.reply_document(
        InputFile(io.BytesIO(new_html.encode("utf-8")), filename=f"workbook-{s.slug}.html"),
        caption=f"🖼 Обкладинку замінено.\n[GitHub]({url})",
        parse_mode=ParseMode.MARKDOWN,
    )


def _inject_cover_image(html: str, data_url: str) -> str:
    """Replace the first .page.page-cover block content with a full-bleed img."""
    pat = re.compile(
        r'(<div\s+class="page page-cover"[^>]*>)(.*?)(</div>\s*<hr\s+class="cut-line">)',
        re.DOTALL,
    )
    repl_inner = (
        f'<img src="{data_url}" style="width:100%;height:100%;object-fit:cover;display:block;">'
    )
    new = pat.sub(
        lambda m: (
            '<div class="page page-cover" style="padding:0;background:none;display:block;">'
            + repl_inner + m.group(3)
        ),
        html,
        count=1,
    )
    return new


# ── Feedback / iterate ───────────────────────────────────────────────────
async def on_freeform_feedback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Free-text after a workbook is ready → treat as edit instruction."""
    s: Session | None = ctx.chat_data.get("session")
    if not s or not s.workbook_html:
        return
    instr = update.message.text or ""
    await update.message.chat.send_action(ChatAction.TYPING)
    edit_system = (
        "You edit Ortobor workbook HTML. Apply the user's instruction faithfully to the "
        "provided HTML and return the COMPLETE updated HTML. No preamble, no markdown fences. "
        "Preserve all interactive scripts, data-block IDs, CSS variables, and the toolbar. "
        "Only change what the user asked for. Honour the Ukrainian medical style guide rules "
        "(see system prompt of original generation)."
    )
    msg = (
        f"Current HTML:\n──────── BEGIN HTML ────────\n{s.workbook_html}\n───────── END HTML ─────────\n\n"
        f"User instruction:\n{instr}\n\nReturn the updated HTML now."
    )
    try:
        new_html = _strip_md_fences(await llm_call(system=edit_system, messages=[{"role": "user", "content": msg}]))
        s.workbook_html = new_html
        url = await gh_put_file(
            GITHUB_REPO,
            s.workbook_path,
            new_html.encode("utf-8"),
            f"workbook: edit {s.slug} — {instr[:60]}",
        )
        await update.message.reply_document(
            InputFile(io.BytesIO(new_html.encode("utf-8")), filename=f"workbook-{s.slug}.html"),
            caption=f"✓ Правки застосовано.\n[GitHub]({url})\n\nНаступна правка або /done.",
            parse_mode=ParseMode.MARKDOWN,
        )
    except Exception as exc:
        log.exception("edit failed")
        await update.message.reply_text(f"❌ {exc}")


# ── /list ────────────────────────────────────────────────────────────────
async def cmd_list(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not auth_ok(update):
        return
    slugs = await gh_list_workbooks(GITHUB_REPO)
    if not slugs:
        await update.message.reply_text("Поки що порожньо. /new щоб створити перший.")
        return
    btns = [
        [InlineKeyboardButton(s, callback_data=f"open:{s}")]
        for s in slugs
    ]
    await update.message.reply_text(
        f"📚 Зошитів: {len(slugs)}",
        reply_markup=InlineKeyboardMarkup(btns),
    )


async def on_open(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    await q.answer()
    slug = q.data.split(":", 1)[1]
    path = f"workbooks/{slug}/out/workbook-{slug}.html"
    html = await gh_get_file(GITHUB_REPO, path)
    if not html:
        await q.edit_message_text(f"⚠️ Не знайдено: {path}")
        return
    s = session(ctx)
    s.slug = slug
    s.title = slug.replace("-", " ").title()
    s.workbook_html = html
    s.workbook_path = path
    await q.message.reply_document(
        InputFile(io.BytesIO(html.encode("utf-8")), filename=f"workbook-{slug}.html"),
        caption=f"📂 *{slug}* — надішліть фото для обкладинки або текст із правками, або /improve {slug} для режиму ітерацій.",
        parse_mode=ParseMode.MARKDOWN,
    )


# ── /improve <slug> — guided iteration loop ─────────────────────────────
async def cmd_improve(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    args = ctx.args or []
    if not args:
        await update.message.reply_text("Використання: /improve <slug>")
        return ConversationHandler.END
    slug = args[0]
    path = f"workbooks/{slug}/out/workbook-{slug}.html"
    html = await gh_get_file(GITHUB_REPO, path)
    if not html:
        await update.message.reply_text(f"⚠️ Не знайдено: {path}")
        return ConversationHandler.END
    s = session(ctx)
    s.slug = slug
    s.workbook_html = html
    s.workbook_path = path
    s.thread = []
    await update.message.reply_text(
        f"🛠 Режим ітерацій: *{slug}*\n\n"
        "Пишіть інструкції природною мовою — кожне повідомлення = одна ітерація.\n"
        "Я зберігаю контекст всіх правок у цій сесії.\n\n"
        "/done щоб вийти.",
        parse_mode=ParseMode.MARKDOWN,
    )
    return IMPROVE_LOOP


async def on_improve_turn(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    s = session(ctx)
    instr = update.message.text or ""
    if instr.startswith("/"):
        return IMPROVE_LOOP  # let other command handlers see it
    await update.message.chat.send_action(ChatAction.TYPING)

    if not s.thread:
        # Seed thread with current HTML on first turn
        s.thread.append({
            "role": "user",
            "content": f"This is the current workbook HTML. I'll send iterative edit instructions; "
                       f"reply each time with the FULL updated HTML (no fences, no preamble).\n\n"
                       f"──── HTML ────\n{s.workbook_html}\n──── /HTML ────"
        })
        s.thread.append({"role": "assistant", "content": s.workbook_html})

    s.thread.append({"role": "user", "content": instr})
    edit_system = (
        "You are iteratively editing an Ortobor podology workbook HTML across multiple turns. "
        "Reply EACH turn with the complete updated HTML — no markdown fences, no commentary. "
        "Preserve data-block IDs, scripts, toolbar, CSS variables, and the interactive layer. "
        "Honour the Ukrainian medical style guide. Only change what each turn requests."
    )
    try:
        # Trim thread to fit context — keep system + first seed pair + last 12 turns
        msgs = s.thread[:2] + s.thread[-12:] if len(s.thread) > 14 else s.thread
        new_html = _strip_md_fences(await llm_call(system=edit_system, messages=msgs))
        s.thread.append({"role": "assistant", "content": new_html})
        s.workbook_html = new_html
        url = await gh_put_file(
            GITHUB_REPO,
            s.workbook_path,
            new_html.encode("utf-8"),
            f"workbook: improve {s.slug} — {instr[:60]}",
        )
        await update.message.reply_document(
            InputFile(io.BytesIO(new_html.encode("utf-8")), filename=f"workbook-{s.slug}.html"),
            caption=f"✓ {instr[:80]}\n[GitHub]({url})",
            parse_mode=ParseMode.MARKDOWN,
        )
    except Exception as exc:
        log.exception("improve turn failed")
        await update.message.reply_text(f"❌ {exc}")
    return IMPROVE_LOOP


# ──────────────────────────────────────────────────────────────────────────
# Wiring
# ──────────────────────────────────────────────────────────────────────────
def build_app() -> Application:
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    new_flow = ConversationHandler(
        entry_points=[CommandHandler("new", cmd_new)],
        states={
            WAIT_FILE: [MessageHandler(filters.Document.ALL, on_file)],
            WAIT_TITLE: [MessageHandler(filters.TEXT & ~filters.COMMAND, on_title)],
            WAIT_PRESET: [CallbackQueryHandler(on_preset, pattern=r"^preset:")],
            WAIT_FORMAT: [CallbackQueryHandler(on_format, pattern=r"^fmt:")],
            GENERATING: [CommandHandler("cancel", cmd_cancel)],
        },
        fallbacks=[CommandHandler("cancel", cmd_cancel), CommandHandler("done", cmd_done)],
        per_chat=True,
    )

    improve_flow = ConversationHandler(
        entry_points=[CommandHandler("improve", cmd_improve)],
        states={IMPROVE_LOOP: [MessageHandler(filters.TEXT & ~filters.COMMAND, on_improve_turn)]},
        fallbacks=[CommandHandler("done", cmd_done), CommandHandler("cancel", cmd_cancel)],
        per_chat=True,
    )

    app.add_handler(CommandHandler(["start", "help"], cmd_help))
    app.add_handler(CommandHandler("list", cmd_list))
    app.add_handler(CommandHandler("done", cmd_done))
    app.add_handler(new_flow)
    app.add_handler(improve_flow)
    app.add_handler(CallbackQueryHandler(on_open, pattern=r"^open:"))
    app.add_handler(MessageHandler(filters.PHOTO, on_photo))
    app.add_handler(MessageHandler(filters.Document.IMAGE, on_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_freeform_feedback))
    return app


def main() -> None:
    app = build_app()
    log.info("starting bot — model=%s gateway=%s repo=%s", MODEL, LLM_GATEWAY, GITHUB_REPO)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
