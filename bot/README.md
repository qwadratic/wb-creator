# Ortobor Workbook Bot

Telegram bot that drives the full workbook lifecycle — intake → preset → format → generate → cover → review → iterate. Runs on an exe.dev VM. Uses the LLM Gateway (free Anthropic via exe.dev subscription) when on-VM; falls back to a direct API key off-VM. **Workbooks are stored on the VM's local disk** — no GitHub round-trip per save.

## Conversation map

```
/new        → upload .txt/.pdf/.pptx
            → bot extracts text
            → ask title
            → pick preset (🟢 green / 🔵 blue)
            → pick format (📄 simple / 📚 full)
            → GENERATE (1–3 min) → returns workbook.html via Telegram doc

(post-generation, freeform — any of:)
            → send a photo  ⇒ replaces cover (data URL embedded), re-saves
            → send text     ⇒ treated as edit instruction, re-generates, re-saves
            → /done         ⇒ exits the session

/list       → grid of all slugs found in $BOT_DATA_DIR/workbooks/
            → tap → bot sends that workbook's HTML
                  → now you're in the freeform state for that workbook

/improve <slug>  → multi-turn iteration loop with thread memory
                 → each message = one edit pass, full context retained
                 → /done to exit

/help        → menu
/cancel      → reset current flow
```

## Storage layout (on the VM)

```
$BOT_DATA_DIR/                       # default: /home/exedev/wb-data
└── workbooks/
    ├── <slug>/
    │   └── workbook-<slug>.html     # the workbook (interactive HTML)
    ├── <slug-2>/
    │   └── ...
    └── ...

$BOT_DATA_DIR/<tg-user-id>/          # per-user uploads (source materials)
    └── <original-filename>
```

`$BOT_DATA_DIR` is configurable via `.env`. The default sits under exe.dev's persistent disk — survives VM restarts.

## Operator setup

### 1. One-time prerequisites

| What | How |
|---|---|
| Telegram bot token | Talk to [@BotFather](https://t.me/BotFather): `/newbot` → save the token |
| exe.dev subscription | At least the tier that includes a VM + LLM Gateway tokens |
| Your Telegram user ID (optional) | Talk to [@userinfobot](https://t.me/userinfobot) — copy into `ALLOWED_TG_IDS` to lock the bot to just you |

No GitHub token needed at runtime — bot doesn't touch GitHub.

### 2. Provision the VM

```bash
ssh exe.dev new --json | tee /tmp/vm.json
VMNAME=$(jq -r .name /tmp/vm.json)
```

### 3. Push your .env to the VM

Write `.env` locally (from `bot/.env.example`), then:

```bash
ssh -o StrictHostKeyChecking=accept-new $VMNAME.exe.xyz 'mkdir -p ~/wb-creator-env'
scp .env $VMNAME.exe.xyz:~/wb-creator-env/.env
```

### 4. Bootstrap via Shelley

Open `https://$VMNAME.shelley.exe.xyz/`. Paste `bot/shelley-prompt.md`. Shelley installs deps, clones the repo, places `.env`, registers a systemd unit, starts polling. Total: ~90s.

### 5. Sanity check

Open the bot in Telegram → `/start` → help menu appears.
`/new` → send a short .txt → walk the flow → confirm a workbook.html lands in Telegram AND on the VM at `~/wb-data/workbooks/<slug>/workbook-<slug>.html`.

## Architecture

```
        ┌──────────────────┐
        │     Telegram     │  long-poll
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │   bot.py (FSM)   │
        │                  │
        │  ┌─ extract ───┐ │  txt/pdf/pptx → plain text
        │  ├─ llm_call ──┤ │  Anthropic via LLM Gateway (or direct)
        │  ├─ save ──────┤ │  Local FS under $BOT_DATA_DIR/workbooks/
        │  └─ session ───┘ │  per-chat dataclass in context.chat_data
        └────────┬─────────┘
                 │
   ┌─────────────┼──────────────┐
   ▼             ▼              ▼
exe.dev VM    Telegram      Anthropic
($BOT_DATA_DIR (long-poll +  (LLM Gateway —
 persistent    documents)    no key needed)
 disk)
```

## File layout (under `bot/`)

| File | Role |
|---|---|
| `bot.py` | Everything — handlers, LLM client, local storage, extractors, FSM wiring |
| `requirements.txt` | Pinned deps |
| `.env.example` | Template — copy to `.env`, fill in tokens |
| `shelley-prompt.md` | Paste into Shelley to provision a fresh VM |
| `README.md` | This file |

## Day-2 ops

| Task | Command |
|---|---|
| Live logs | `ssh $VMNAME.exe.xyz 'tail -f ~/wb-bot.log'` |
| Restart bot | `ssh $VMNAME.exe.xyz 'systemctl --user restart wb-bot.service'` |
| Pull latest code | `ssh $VMNAME.exe.xyz 'cd ~/wb-creator && git pull && systemctl --user restart wb-bot'` |
| Rotate Telegram token | `ssh $VMNAME.exe.xyz`, edit `~/wb-creator/bot/.env`, restart service |
| Backup workbooks | `rsync -av $VMNAME.exe.xyz:~/wb-data/workbooks/ ./workbooks-backup-$(date +%F)/` |
| Seed VM with existing workbooks | See "Optional: seed the VM" section in `shelley-prompt.md` |
| Migrate to a new VM | `ssh exe.dev cp <old> <new>` (clones disk, near-instant) |
| Free up disk space | `ssh $VMNAME.exe.xyz 'du -sh ~/wb-data/* \| sort -h'` then prune per-user upload dirs |

## Cost & limits

- **VM**: included in exe.dev subscription tier
- **LLM**: via `169.254.169.254/gateway/llm/anthropic/` — included token allotment per tier, pay-as-you-go after. Each workbook: ~10–25K input + ~10–15K output tokens. Iteration turns add ~the same per turn (the HTML is re-sent each time)
- **Telegram**: free
- **Storage**: limited by the VM's persistent disk (typically generous on subscription tiers; each workbook is ~30–60 KB)

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `❌ LLM error 401` | Off-VM, no API key | Set `ANTHROPIC_API_KEY` in `.env`, `LLM_GATEWAY=0`, restart |
| Bot doesn't respond | Service crashed | `systemctl --user status wb-bot` then `tail ~/wb-bot.log` |
| `❌ LLM error 429` | Tokens exhausted | Wait for cycle reset, or buy pay-as-you-go credits |
| Workbook output truncated | `max_tokens` hit | Decrease source size, or bump `max_tokens` in `bot.py:llm_call()` |
| `/list` empty after restart | Wrong `BOT_DATA_DIR` or new VM | Re-run the "seed the VM" rsync from `shelley-prompt.md` |
| Cover replace doesn't survive reload (in browser) | localStorage quota — image too big | Resize before upload, or commit the data URL via /improve |

## Extending

The `SYSTEM_PROMPT` in `bot.py` is the authoritative design contract — keep aligned with `skills/workbook-creator/SKILL.md` and `references/ukrainian-medical-style.md`. To add a new preset (e.g. dark mode), add a CSS variable set to `SYSTEM_PROMPT`, add a button in `on_title`, and accept the new slug in `Session.preset`.

The bot is intentionally a single file. Past ~1000 lines: split by responsibility — but only then.
