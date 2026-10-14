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

---

## Installation

### Pre-built packages (GitHub Releases)

Download the latest release from [Releases](https://github.com/neilmanfredit/hatterm/releases).

| Platform | File |
|----------|------|
| Arch Linux (x86\_64) | `hatterm-linux-x64-*.pacman` |
| Arch Linux (aarch64) | `hatterm-linux-arm64-*.pacman` |
| Debian/Ubuntu (x86\_64) | `hatterm-linux-x64-*.deb` |
| Debian/Ubuntu (arm64) | `hatterm-linux-arm64-*.deb` |
| AppImage (x86\_64) | `hatterm-linux-x64-*.AppImage` |
| macOS (Apple Silicon) | `hatterm-darwin-arm64-*.dmg` |
| macOS (Intel) | `hatterm-darwin-x64-*.dmg` |

### Arch Linux (pacman)

```bash
sudo pacman -U hatterm-linux-x64-*.pacman
```

### Debian / Ubuntu

```bash
sudo dpkg -i hatterm-linux-x64-*.deb
```

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

Install the `hatterm-counter` Python library (Apache 2.0):

```bash
pip install --user /path/to/hatterm-counter
# or, once published to PyPI:
pip install hatterm-counter
```

**Standalone dashboard:**
```bash
hatterm-counter
```

**Claude Code statusLine hook** — add to `~/.claude/settings.json`:
```json
{
    "statusLine": {
        "command": "hatterm-counter",
        "timeout": 5000
    }
}
```

**Gemini CLI hook** — add to `~/.gemini/settings.json`:
```json
{
    "hooks": {
        "AfterAgent": "hatterm-counter"
    }
}
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
