# Ortobor Workbook Bot

Telegram bot that drives the full workbook lifecycle — intake → preset → format → generate → cover → review → iterate. Runs on an exe.dev VM. Uses the LLM Gateway (free Anthropic via exe.dev subscription) when on-VM, falls back to a direct API key off-VM.

## Conversation map

```
/new        → upload .txt/.pdf/.pptx
            → bot extracts text
            → ask title
            → pick preset (🟢 green / 🔵 blue)
            → pick format (📄 simple / 📚 full)
            → GENERATE (1–3 min) → returns workbook.html + GitHub link

(post-generation, freeform — any of:)
            → send a photo  ⇒ replaces cover (data URL embedded)
            → send text     ⇒ treated as edit instruction, re-generates and re-commits
            → /done         ⇒ exits the session

/list       → grid of all topic slugs (from GitHub workbooks/)
            → tap → bot sends that workbook's HTML
                  → now you're in the freeform state for that workbook

/improve <slug>  → multi-turn iteration loop
                 → each message = one edit pass, full context retained
                 → /done to exit

/help        → menu
/cancel      → reset current flow
```

## Operator setup

### 1. One-time prerequisites

| What | How |
|---|---|
| Telegram bot token | Talk to [@BotFather](https://t.me/BotFather): `/newbot` → save the token |
| GitHub fine-grained PAT | Settings → Developer settings → Fine-grained tokens. Scope: this repo only, `Contents: Read and write` |
| exe.dev subscription | At least the tier that includes a VM with LLM Gateway tokens |
| Your Telegram user ID (optional) | Talk to [@userinfobot](https://t.me/userinfobot) — copy into `ALLOWED_TG_IDS` to lock the bot to just you |

### 2. Push this project to GitHub

```bash
cd /path/to/wb-creator
gh repo create <owner>/wb-creator --private --source=. --remote=origin --push
# or, if the repo already exists:
gh repo set-default <owner>/wb-creator
git push -u origin main
```

### 3. Provision the VM

```bash
ssh exe.dev new --json
# pick the vm name from the output, e.g. "wb-bot"
ssh exe.dev browser wb-bot
# this opens Shelley
```

### 4. Bootstrap via Shelley

Open Shelley (`https://wb-bot.shelley.exe.xyz/`). Paste the contents of `bot/shelley-prompt.md` with the four placeholders filled in. Shelley installs everything and starts the systemd service. Expected total time: 60–90s.

### 5. Sanity check

Open your bot in Telegram → `/start` → you should see the help menu.

Then `/new` → drop a short .txt source → walk the flow → confirm a workbook.html lands as a Telegram document AND as a commit in the GitHub repo under `workbooks/<slug>/out/`.

## Architecture

```
        ┌──────────────────┐
        │     Telegram     │  long-poll
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │   bot.py (FSM)   │  ConversationHandler per chat
        │                  │
        │  ┌─ extract ───┐ │  txt/pdf/pptx → plain text
        │  ├─ llm_call ──┤ │  Anthropic via LLM Gateway (or direct)
        │  ├─ gh_put ────┤ │  GitHub Contents API
        │  └─ session ───┘ │  per-chat dataclass in context.chat_data
        └────────┬─────────┘
                 │
   ┌─────────────┼──────────────┐
   ▼             ▼              ▼
GitHub        exe.dev VM     Anthropic
(workbooks)   (state +       (gateway —
              uploads)        no key needed)
```

## File layout (under `bot/`)

| File | Role |
|---|---|
| `bot.py` | Everything — handlers, LLM client, GitHub client, extractors, FSM wiring |
| `requirements.txt` | Pinned deps |
| `.env.example` | Template — copy to `.env`, fill in tokens |
| `shelley-prompt.md` | Paste into Shelley to provision a fresh VM |
| `README.md` | This file |

## Day-2 ops

| Task | Command |
|---|---|
| View live logs | `ssh wb-bot.exe.xyz 'tail -f ~/wb-bot.log'` |
| Restart bot | `ssh wb-bot.exe.xyz 'systemctl --user restart wb-bot.service'` |
| Pull latest code | `ssh wb-bot.exe.xyz 'cd ~/wb-creator && git pull && systemctl --user restart wb-bot'` |
| Rotate Telegram token | Edit `~/wb-creator/bot/.env`, restart service |
| Clear a stuck chat session | `ssh wb-bot.exe.xyz 'rm -rf ~/wb-data/<tg-user-id>'` |
| Migrate to a new VM | `ssh exe.dev cp <old> <new>` then re-run shelley-prompt on `<new>` |

## Cost & limits

- **VM**: included in the exe.dev subscription tier
- **LLM**: served via `169.254.169.254/gateway/llm/anthropic/` — included token allotment per tier, pay-as-you-go after. Each workbook is ~10–25K input + ~10–15K output tokens. Iteration turns add ~the same per turn (the HTML is re-sent each time)
- **Telegram**: free
- **GitHub**: free for private repos under the free plan

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `❌ LLM error 401` | Off-VM with no API key | Set `ANTHROPIC_API_KEY` in `.env`, `LLM_GATEWAY=0`, restart |
| `❌ GitHub error 404` on commit | PAT lacks repo access or wrong owner | Recreate PAT, scope to *this* repo with `Contents: write` |
| Bot doesn't respond | Service crashed | `systemctl --user status wb-bot` then `tail ~/wb-bot.log` |
| `❌ LLM error 429` | Tokens exhausted for the cycle | Wait for reset, or buy pay-as-you-go credits |
| Workbook output truncated | `max_tokens` hit during generation | Decrease source size, or bump `max_tokens` in `bot.py:llm_call()` |
| Cover replace doesn't survive reload | Image > localStorage quota (typically 5–10MB) | Resize image client-side before upload, or embed the data URL directly in HTML via /improve |

## Extending

The `SYSTEM_PROMPT` in `bot.py` is the authoritative design contract — keep it aligned with `skills/workbook-creator/SKILL.md` and `references/ukrainian-medical-style.md`. To add a new preset (e.g. dark mode), add a new CSS variable set to `SYSTEM_PROMPT`, add a button in `on_title`'s keyboard, and add the slug to `Session.preset` valid values.

The bot is intentionally a single file. If it grows past ~1000 lines, split by responsibility (`handlers.py`, `llm.py`, `extract.py`, `gh.py`) — but only then.
