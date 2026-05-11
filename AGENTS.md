# Project guidance for Shelley / coding agents

## What this repo is

A Telegram-bot-driven workbook factory for the Ortobor podology academy.
Source-of-truth structure:

```
.
├── bot/                   Telegram bot (python-telegram-bot, runs on exe.dev)
├── skills/workbook-creator/   Reusable skill: design contract, style guide, templates
├── workbooks/<slug>/{in,out}/  Per-topic source material + generated HTML
├── scripts/sync-sessions.sh   Mirrors Claude/agent session logs into .sessions/
├── reference/             Misc references (PDF dumps, etc.)
└── .planning/             Internal planning docs (EDITS-CONSOLIDATED.md, …)
```

The bot calls the Anthropic API (via the exe.dev LLM Gateway when on-VM) using
the prompts in `bot/bot.py:SYSTEM_PROMPT`. It mirrors the contract codified in
`skills/workbook-creator/SKILL.md` + `references/ukrainian-medical-style.md`.

## Hard rules

1. **Ukrainian medical style is mandatory** for Ortobor / `lang=uk` content.
   Read `skills/workbook-creator/references/ukrainian-medical-style.md` before
   generating or editing any Ukrainian workbook. The most-violated rules
   (top 3 by frequency in past expert review):
   - "Хірургія" → **"Хірургічне лікування"**
   - "Рецидив неминуче / гарантовано" → **"Високий ризик рецидиву"**
   - "Поперечне плоскостопість" → **"Поперечна розпластаність"**

2. **Workbook HTML is self-contained.** All CSS + JS + (optionally) cover image
   inlined. Open in any browser, no external assets. The cover-replace feature
   (toolbar 🖼 button) writes a data URL into `localStorage` under
   `wb-cover:<title>` and rehydrates on every load.

3. **Don't fabricate clinical cases.** If the source transcript doesn't contain
   one, leave a placeholder. The expert provides clinical cases.

4. **Podologist ≠ orderer.** Workbook algorithms must frame podologist actions
   as referrals ("скеровує до ортопеда"), never as ordering imaging/labs
   directly.

5. **Session logs auto-mirror** into `.sessions/` via Stop + SessionEnd hooks
   in `.claude/settings.json`. Don't disable.

## Common tasks

| Goal | Where to start |
|---|---|
| Add a new topic | `workbooks/<slug>/in/` → drop source → use bot `/new` |
| Edit an existing workbook | Bot `/improve <slug>` |
| Bulk style-fix across all workbooks | `/tmp/patch-cover-replace.py` is the template — copy + adapt |
| Update the bot | Edit `bot/bot.py`, push to GitHub, on VM: `git pull && systemctl --user restart wb-bot` |
| Tune the workbook design contract | `bot/bot.py:SYSTEM_PROMPT` AND `skills/workbook-creator/SKILL.md` — keep them aligned |
| Fix recurring expert edits | Document in `.planning/EDITS-CONSOLIDATED.md` then update `ukrainian-medical-style.md` |

## When in doubt

- Check `.planning/EDITS-CONSOLIDATED.md` for what's already known to break.
- Mirror the structure of the most recently-edited workbook
  (currently `workbooks/morton-neuroma/out/workbook-morton-neuroma.html`).
- The editor's interactive layer (toolbar + per-block actions + comment popovers)
  must be inlined verbatim — don't reimplement.

## Bot operations

The bot's runbook lives in `bot/README.md`. Shelley bootstrap prompt is in
`bot/shelley-prompt.md`. Both are kept in sync with `bot/bot.py`.
