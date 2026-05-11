# Shelley bootstrap — Ortobor Workbook Bot

Paste the block below into Shelley on a fresh exe.dev exeuntu VM. Shelley will
execute it step by step. Before pasting, edit the four `<<...>>` placeholders.

──────────────────────────────────────────────────────────────────────────
**PROMPT TO PASTE**:

You are bootstrapping the Ortobor Workbook Telegram bot on this VM. Do the steps below in order. If any step fails, stop and report.

PLACEHOLDERS (replace before running):
- TELEGRAM_TOKEN = `<<your BotFather token>>`
- GITHUB_REPO    = `<<github_owner/wb-creator>>`
- GITHUB_TOKEN   = `<<fine-grained PAT with contents:write on the repo>>`
- ALLOWED_TG_IDS = `<<comma-separated Telegram user IDs, or leave blank for open>>`

Steps:

1. **Install system deps** (sudo is passwordless on exeuntu):
   ```bash
   sudo apt-get update -y
   sudo apt-get install -y python3.11 python3.11-venv python3-pip git curl ca-certificates
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
   sudo apt-get update -y && sudo apt-get install -y gh
   ```

2. **Authenticate gh** with the provided token, then clone the repo:
   ```bash
   echo "<<GITHUB_TOKEN>>" | gh auth login --with-token
   gh auth setup-git
   cd ~ && rm -rf wb-creator && gh repo clone <<GITHUB_REPO>> wb-creator
   ```

3. **Create venv + install bot deps**:
   ```bash
   cd ~/wb-creator/bot
   python3.11 -m venv .venv
   .venv/bin/pip install --upgrade pip
   .venv/bin/pip install -r requirements.txt
   ```

4. **Write the .env file**:
   ```bash
   cat > ~/wb-creator/bot/.env <<EOF
   TELEGRAM_TOKEN=<<TELEGRAM_TOKEN>>
   GITHUB_REPO=<<GITHUB_REPO>>
   GITHUB_TOKEN=<<GITHUB_TOKEN>>
   ALLOWED_TG_IDS=<<ALLOWED_TG_IDS>>
   LLM_GATEWAY=1
   ANTHROPIC_MODEL=claude-sonnet-4-6
   BOT_DATA_DIR=/home/exedev/wb-data
   LOG_LEVEL=INFO
   EOF
   chmod 600 ~/wb-creator/bot/.env
   mkdir -p ~/wb-data
   ```

5. **Smoke-test the LLM Gateway** (no API key needed inside the VM):
   ```bash
   curl -s http://169.254.169.254/gateway/llm/anthropic/v1/messages \
     -H "content-type: application/json" \
     -H "anthropic-version: 2023-06-01" \
     -d '{"model":"claude-sonnet-4-6","max_tokens":32,"messages":[{"role":"user","content":"ping"}]}' \
     | head -c 400
   ```
   Expect JSON with `"content":[{"type":"text",...}]`. If it 4xx's, stop and tell me.

6. **Create systemd user service** so the bot survives reboots:
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
   sleep 2
   systemctl --user status wb-bot.service --no-pager | head -20
   tail -n 30 ~/wb-bot.log || true
   ```

7. **Report back**:
   - VM name (from `hostname`)
   - `systemctl --user status wb-bot.service` summary
   - Last 10 lines of `~/wb-bot.log`
   - Telegram bot username (extract from the token's `me` endpoint)

8. **Done**. The bot is now polling Telegram. Open the bot in Telegram, send `/start`, and you should see the help menu. Send `/new` to create a workbook from a transcript.

If a step fails, paste the failing command and its stderr and stop. Don't guess fixes — wait for me to redirect.
──────────────────────────────────────────────────────────────────────────

## Manual restart / inspection

```bash
ssh <vmname>.exe.xyz
systemctl --user restart wb-bot.service
journalctl --user -u wb-bot.service -f      # live logs
tail -f ~/wb-bot.log
```

## Updating the bot from GitHub

```bash
ssh <vmname>.exe.xyz
cd ~/wb-creator && git pull
~/wb-creator/bot/.venv/bin/pip install -r ~/wb-creator/bot/requirements.txt
systemctl --user restart wb-bot.service
```

## Rotating the Telegram token

```bash
ssh <vmname>.exe.xyz
sed -i 's|^TELEGRAM_TOKEN=.*|TELEGRAM_TOKEN=NEW|' ~/wb-creator/bot/.env
systemctl --user restart wb-bot.service
```
