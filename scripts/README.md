# scripts/

Project utilities. Portable — drop into any project and they work.

## sync-sessions.sh

Mirrors Claude Code session JSONL logs from `~/.claude/projects/<encoded-path>/` into `<project>/.sessions/`. Uses hardlinks where possible — near-zero cost.

```bash
./scripts/sync-sessions.sh             # sync current project
./scripts/sync-sessions.sh --list      # preview without copying
./scripts/sync-sessions.sh --since 7d  # only last 7 days
./scripts/sync-sessions.sh /some/path  # sync a different project
```

### Automatic capture for future sessions

This project's `.claude/settings.json` registers two hooks:

- **`Stop`** — fires after every assistant turn → quietly syncs files modified in the last day
- **`SessionEnd`** — fires when the session terminates → full sync of last 30 days

Result: every session you run in this project ends with its JSONL log already mirrored into `.sessions/`. No manual action needed.

### Porting to other projects

Copy `scripts/sync-sessions.sh` and `.claude/settings.json` into the target project. The script auto-detects the cwd and handles path encoding — no hard-coded paths.

### Why mirror at all?

- Survive `~/.claude/projects/` cleanup or reinstall
- Make session history part of the project's own backup story
- Enable cross-session analysis (e.g. extracting recurring edit patterns — see `.planning/EDITS-CONSOLIDATED.md`)
