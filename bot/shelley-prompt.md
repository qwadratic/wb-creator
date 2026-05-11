# Shelley bootstrap — Ortobor Workbook Bot

Paste this prompt into Shelley on a fresh exe.dev exeuntu VM. Prerequisites:

1. Repo `qwadratic/wb-creator` is **public** (no auth needed to clone), OR `gh` is already logged in on the VM.
2. You have already `scp`'d `.env` to the VM's home dir:
   ```bash
   ssh -o StrictHostKeyChecking=accept-new $VMNAME.exe.xyz 'mkdir -p ~/wb-creator-env'
   scp .env $VMNAME.exe.xyz:~/wb-creator-env/.env
   ```

──────────────────────────────────────────────────────────────────────────
**PROMPT TO PASTE:**

You are bootstrapping the Ortobor Workbook Bot on this VM. Storage is purely local — the bot reads/writes workbooks under ~/wb-data. Execute these steps in order; stop and report if any fails.

1) Install system deps:
   ```bash
   sudo apt-get update -y
   sudo apt-get install -y python3.11 python3.11-venv python3-pip git curl ca-certificates
   ```

2) Clone the repo (public, anonymous clone — no token needed):
   ```bash
   cd ~ && rm -rf wb-creator
   git clone https://github.com/qwadratic/wb-creator.git ~/wb-creator
   ```

3) Place the .env that was scp'd to ~/wb-creator-env/.env:
   ```bash
   test -f ~/wb-creator-env/.env || { echo "FATAL: ~/wb-creator-env/.env missing — re-run scp from laptop"; exit 1; }
   mv ~/wb-creator-env/.env ~/wb-creator/bot/.env
   chmod 600 ~/wb-creator/bot/.env
   rmdir ~/wb-creator-env 2>/dev/null || true
   ```

4) Install Python deps:
   ```bash
   cd ~/wb-creator/bot
   python3.11 -m venv .venv
   .venv/bin/pip install --upgrade pip
   .venv/bin/pip install -r requirements.txt
   ```

5) Smoke-test the LLM Gateway (no API key needed inside the VM):
   ```bash
   curl -s http://169.254.169.254/gateway/llm/anthropic/v1/messages \
     -H "content-type: application/json" -H "anthropic-version: 2023-06-01" \
     -d '{"model":"claude-sonnet-4-6","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}' | head -c 300
   ```
   Expect a JSON response with `content[0].text`. If it 4xx's, stop and report.

6) Ensure data dir exists:
   ```bash
   mkdir -p ~/wb-data/workbooks
   ```

7) Install systemd user unit:
   ```bash
   mkdir -p ~/.config/systemd/user
   cat > ~/.config/systemd/user/wb-bot.service <<'UNIT'
   [Unit]
   Description=Ortobor Workbook Bot
   After=network-online.target

   [Service]
   Type=simple
   WorkingDirectory=%h/wb-creator/bot
   EnvironmentFile=%h/wb-creator/bot/.env
   ExecStart=%h/wb-creator/bot/.venv/bin/python %h/wb-creator/bot/bot.py
   Restart=always
   RestartSec=5
   StandardOutput=append:%h/wb-bot.log
   StandardError=append:%h/wb-bot.log

   [Install]
   WantedBy=default.target
   UNIT
   loginctl enable-linger exedev || true
   systemctl --user daemon-reload
   systemctl --user enable --now wb-bot.service
   ```

8) Report back — do NOT cat ~/wb-creator/bot/.env or echo secrets. Just:
   - hostname
   - `systemctl --user is-active wb-bot.service`
   - `tail -n 20 ~/wb-bot.log`
   - Telegram bot username:
     ```bash
     TOKEN=$(grep '^TELEGRAM_TOKEN=' ~/wb-creator/bot/.env | cut -d= -f2-)
     curl -s "https://api.telegram.org/bot${TOKEN}/getMe" | python3 -c "import sys,json; d=json.load(sys.stdin); print('@'+d['result']['username'])"
     unset TOKEN
     ```

Done. Open the bot in Telegram and send /start.
──────────────────────────────────────────────────────────────────────────

## Optional: seed the VM with existing workbooks

If you want past workbooks accessible via /list on day one, scp them from your laptop:

```bash
# from laptop, after the bot is running
rsync -av --include='*/' --include='out/workbook-*.html' --exclude='*' \
  workbooks/ $VMNAME.exe.xyz:~/wb-data/workbooks-staged/
ssh $VMNAME.exe.xyz 'cd ~/wb-data/workbooks-staged && for d in */; do
  slug="${d%/}"
  mkdir -p ~/wb-data/workbooks/$slug
  cp $d/out/workbook-$slug.html ~/wb-data/workbooks/$slug/ 2>/dev/null || true
done && rm -rf ~/wb-data/workbooks-staged'
```

This puts your existing 14 workbooks under `~/wb-data/workbooks/<slug>/workbook-<slug>.html` — the same layout the bot uses for new ones.

## Operations

```bash
ssh <vmname>.exe.xyz                                    # shell in
systemctl --user status wb-bot.service                  # service state
tail -f ~/wb-bot.log                                    # live logs
systemctl --user restart wb-bot.service                 # restart
ls -la ~/wb-data/workbooks/                             # list workbooks on disk
```

## Update the bot from GitHub

```bash
ssh <vmname>.exe.xyz
cd ~/wb-creator && git pull
~/wb-creator/bot/.venv/bin/pip install -r ~/wb-creator/bot/requirements.txt
systemctl --user restart wb-bot.service
```

## Backup workbooks

```bash
# from laptop
rsync -av $VMNAME.exe.xyz:~/wb-data/workbooks/ ./workbooks-backup-$(date +%F)/
```
