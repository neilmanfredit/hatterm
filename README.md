<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./frontend/logos/hatterm-logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./frontend/logos/hatterm-logo.png">
    <img alt="hatterm logo" src="./frontend/logos/hatterm-logo.png" width="200">
  </picture>
</p>

# hatterm

**Open-Source AI-Native Terminal**

hatterm is a fork of [Wave Terminal](https://github.com/wavetermdev/waveterm) (Apache 2.0) with three additional capabilities:

- **Broad AI provider layer** — any LLM with a callable API, plus local models (Ollama, LM Studio, llama.cpp, vLLM, LocalAI)
- **Drag-and-drop file copy** — drop files from your file manager or the built-in file browser directly into any terminal session (local or SSH)
- **Native generative AI usage counter** — track tokens, cost, and rate limits across Claude Code, Gemini CLI, and more

Wave Terminal attribution: hatterm is built on Wave Terminal © Command Line Inc. The Wave name and brand remain the property of Command Line Inc.; hatterm makes no claim to them. See [NOTICE](NOTICE) and [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

---

## Features

Everything in Wave Terminal, plus:

| Feature | Detail |
|---------|--------|
| AI providers | OpenAI, Anthropic (direct), Google Gemini, Mistral, xAI Grok, DeepSeek, Cohere, Perplexity, Together AI, Groq, OpenRouter, + local providers |
| Local inference | Ollama, LM Studio, llama.cpp, vLLM, LocalAI — zero API cost, auto-detected endpoint |
| Drag-and-drop | Drop files from Dolphin/Finder or the wave file browser onto any terminal; progress overlay; conflict handling |
| AI usage counter | `hatterm-counter` library tracks Claude Code + Gemini sessions; statusLine hook + standalone dashboard |
| No telemetry | Wave cloud endpoints disabled by default; no data sent to Command Line Inc. servers |
| No auto-update | Update check disabled by default; updates are manual via GitHub Releases |
| SSH + tmux new-tab | Open a new tab directly into an SSH host or an existing tmux session on that host |

---

## Connecting to remote hosts

### Opening an SSH terminal in a new tab

Click the **New Tab** button (the `+` at the bottom of the tab bar) to reveal a dropdown with three options:

| Option | What it opens |
|--------|---------------|
| **Local** | Standard local shell tab (same as before) |
| **Tmux (local)** | Lists tmux sessions on the local machine → opens a new tab attached to the chosen session |
| **SSH** | Picks an SSH connection → opens a new tab with that host's shell |
| **SSH + Tmux** | Picks an SSH connection → lists existing tmux sessions on that host → opens a new tab attached to the chosen session |

#### Tmux (local)

1. Click **New Tab → Tmux (local)**.
2. hatterm queries your local tmux server for existing sessions.
3. Pick a session to attach to, or choose **New tmux session** to start a fresh one.

> **tmux not running locally?** Choose **New tmux session** and hatterm will start one, provided `tmux` is on your `PATH`.

#### SSH

1. Click **New Tab → SSH**.
2. A picker appears listing all connections defined in your `connections.json` (Settings → Connections).
3. Type to filter, then click a host. A new tab opens with a remote shell on that host.

> **First time connecting to a host?** Add it first via **Settings → Connections** or type a new `user@host` address directly in the connection picker. hatterm installs its `wsh` agent on the remote automatically on first connect.

#### SSH + Tmux

1. Click **New Tab → SSH + Tmux**.
2. Pick a host from the connection picker (same as above). hatterm connects and queries tmux for existing sessions.
3. A session list appears:
   - **New tmux session** — starts a fresh `tmux new-session` on the remote.
   - Any existing session name — attaches to that session with `tmux attach-session -t <name>`.
4. A new tab opens running the chosen session inside the SSH connection.

> **tmux not installed?** The session list will be empty. Choose **New tmux session** and hatterm will start one, provided `tmux` is on the remote's `PATH`.

### Switching connections on an existing terminal

To move an already-open terminal block to a different host, click the **connection indicator** in the block's title bar (top-left corner, shows the current host name or a computer icon for local). This opens the same connection picker used elsewhere.

---

## Installation

### Pre-built packages (GitHub Releases)

Download the latest release from [Releases](https://github.com/neilmanfredit/hatterm/releases).

| Platform | File |
|----------|------|
| Arch Linux (x86\_64) | `hatterm-linux-x64-*.pacman` |
| Debian/Ubuntu (x86\_64) | `hatterm-linux-x64-*.deb` |
| AppImage (x86\_64) | `hatterm-linux-x64-*.AppImage` |
| macOS (Apple Silicon) | `hatterm-darwin-arm64-*.dmg` |
| macOS (Intel) | `hatterm-darwin-x64-*.dmg` |
| Windows (x64) | `hatterm-win32-x64-*.exe` (NSIS installer) |

### Arch Linux (pacman)

```bash
sudo pacman -U hatterm-linux-x64-*.pacman
```

### Debian / Ubuntu

```bash
sudo dpkg -i hatterm-linux-x64-*.deb
```

### Windows

Run the `.exe` NSIS installer. Windows may show a SmartScreen warning on first launch because the build is unsigned — click **More info → Run anyway**. Once you've confirmed it's safe you won't see the warning again.

---

## Building from Source

### Prerequisites

| Tool | Arch | Debian/Ubuntu | macOS |
|------|------|--------------|-------|
| Go ≥ 1.27 | `sudo pacman -S go` | `sudo apt install golang` | `brew install go` |
| Node.js 22 | `sudo pacman -S nodejs npm` | `sudo apt install nodejs npm` | `brew install node` |
| Zig | `sudo pacman -S zig` | [ziglang.org](https://ziglang.org/download/) | `brew install zig` |
| go-task | `sudo pacman -S go-task` | [taskfile.dev](https://taskfile.dev/installation/) | `brew install go-task` |
| FPM (Linux) | `sudo gem install fpm` | `sudo gem install fpm` | — |
| rpm/squashfs tools | `sudo pacman -S rpm-tools squashfs-tools` | `sudo apt install rpm squashfs-tools` | — |

> **Note:** The Arch package for the task runner is `go-task`, not `task`.

### Clone

```bash
git clone https://github.com/neilmanfredit/hatterm.git
cd hatterm
```

### Install dependencies

```bash
npm ci --no-audit --no-fund
```

> If you see `EALLOWREMOTE` errors (Claude Code security policy blocks remote tarballs):
> ```bash
> npm install --allow-remote=all
> ```

### Build

```bash
# Development build (fast, no packaging)
npm run build:dev

# Production build + all platform packages
task package
```

Build artifacts land in `./make/`.

### Clean build artifacts

```bash
task clean
```

---

## Configuration

### AI providers

Open **Settings → AI** and select a provider preset, or set manually:

```json
{
    "ai:provider": "anthropic",
    "ai:model": "claude-sonnet-4-5-20251022",
    "ai:apitokensecretname": "ANTHROPIC_KEY"
}
```

API keys are stored in the system keyring (KWallet on KDE, GNOME Keyring on GNOME, Keychain on macOS) via `wsh secret set <NAME>`.

```bash
wsh secret set ANTHROPIC_KEY
wsh secret set OPENAI_API_KEY
wsh secret set MISTRAL_KEY
```

### Local providers (no API key needed)

| Provider | Default endpoint | Config key |
|----------|-----------------|------------|
| Ollama | `http://localhost:11434/v1` | `"ai:provider": "ollama"` |
| LM Studio | `http://localhost:1234/v1` | `"ai:provider": "lmstudio"` |
| llama.cpp | `http://localhost:8080/v1` | `"ai:provider": "llamacpp"` |
| vLLM | `http://localhost:8000/v1` | `"ai:provider": "vllm"` |
| LocalAI | `http://localhost:8080/v1` | `"ai:provider": "localai"` |

Override the endpoint with `"ai:endpoint"` if your server uses a different port.

### Drag-and-drop file copy

Drop any file onto an open terminal session. hatterm reads the terminal's current working directory (via OSC 7) and copies the file there using `wsh` file transfer. Works for:

- Local terminals (direct copy)
- SSH sessions (wsh-proxied copy to the remote host)
- Drag from the wave file browser (`FILE_ITEM`)
- Drag from the OS file manager (Dolphin, Nautilus, Finder)

### AI usage counter

`hatterm-counter` is **bundled inside the hatterm install** — no separate pip install needed. It is shipped as part of the app package under the `resources/hatterm-counter/` directory.

Installed paths:

| Platform | Path |
|----------|------|
| Linux (deb/pacman) | `/opt/hatterm/resources/hatterm-counter/hatterm-counter` |
| macOS | `/Applications/hatterm.app/Contents/Resources/hatterm-counter/hatterm-counter` |
| Windows | `%LOCALAPPDATA%\Programs\hatterm\resources\hatterm-counter\hatterm-counter` |

Python 3.10+ must be available on your `PATH` (it is on most systems by default).

**Standalone dashboard** (run directly):
```bash
# Linux
python3 /opt/hatterm/resources/hatterm-counter/hatterm-counter

# macOS
python3 /Applications/hatterm.app/Contents/Resources/hatterm-counter/hatterm-counter
```

**Claude Code statusLine hook** — add to `~/.claude/settings.json`:
```json
{
    "statusLine": {
        "command": "python3 /opt/hatterm/resources/hatterm-counter/hatterm-counter",
        "timeout": 5000
    }
}
```
On macOS replace the path with the macOS one above.

**Gemini CLI hook** — add to `~/.gemini/settings.json`:
```json
{
    "hooks": {
        "AfterAgent": "python3 /opt/hatterm/resources/hatterm-counter/hatterm-counter"
    }
}
```

**Optional: add a shell alias** for convenience:
```bash
# add to ~/.bashrc or ~/.zshrc
alias hatterm-counter='python3 /opt/hatterm/resources/hatterm-counter/hatterm-counter'
```

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HATTERM_CONFIG_HOME` | `~/.config/hatterm` | Config directory override |
| `HATTERM_DATA_HOME` | `~/.local/share/hatterm` | Data directory override |
| `HATTERM_DEV` | — | Set to `1` to enable dev mode |
| `HATTERM_AUTH_KEY` | — | Internal use (set by Electron) |

Remote agent data lives in `~/.hatterm/` on each connected host.

---

## Licence

hatterm is licensed under the **Apache License 2.0**.

hatterm is a fork of [Wave Terminal](https://github.com/wavetermdev/waveterm), copyright 2025 Command Line Inc., also Apache 2.0.
New and modified files: copyright 2026 Neil Manfred. See [NOTICE](NOTICE) for the full modifications summary.

Dependencies: see [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

`hatterm-counter` is a separate Apache 2.0 library in [`../hatterm-counter/`](https://github.com/neilmanfredit/hatterm-counter).
