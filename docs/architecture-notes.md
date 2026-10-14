# hatterm Architecture Notes

Based on Wave Terminal v0.14.5. Updated as hatterm diverges from upstream.

---

## 1. Overview

Wave Terminal is an Electron application with a TypeScript/React frontend and a Go backend (`wavesrv`). The two halves communicate over a custom RPC protocol (`wshrpc`) transported via WebSocket (frontend → backend) and Unix domain sockets (wsh agent → backend).

```
┌──────────────────────────────────────────┐
│  Electron main process  (emain/*.ts)     │
│   – window management                   │
│   – auto-updater                        │
│   – IPC bridge (preload.ts)             │
└────────────┬─────────────────────────────┘
             │ contextBridge / ipcMain
┌────────────▼─────────────────────────────┐
│  React renderer  (frontend/app/)         │
│   – Jotai state atoms                   │
│   – Block / layout model (tsunami)      │
│   – View components (term, preview, AI) │
└────────────┬─────────────────────────────┘
             │ wshrpc over WebSocket
┌────────────▼─────────────────────────────┐
│  wavesrv  (cmd/server/, pkg/)            │
│   – SQLite database (wstore)            │
│   – SSH connection manager              │
│   – AI backend (aiusechat)              │
│   – File operations (fileshare/wshfs)   │
│   – Telemetry / wcloud                  │
└────────────┬─────────────────────────────┘
             │ domain socket / stdin-stdout
┌────────────▼─────────────────────────────┐
│  wsh  (cmd/wsh/)                         │
│   – injected into remote shells         │
│   – forwards file / RPC ops back        │
└──────────────────────────────────────────┘
```

---

## 2. Electron / React frontend

### Entry points

| File | Role |
|------|------|
| `emain/emain.ts` | Electron main process — creates BrowserWindows, manages app lifecycle |
| `emain/preload.ts` | Context bridge — exposes `ElectronApi` to the renderer |
| `emain/emain-ipc.ts` | ipcMain handlers called from preload |
| `emain/emain-wavesrv.ts` | Spawns/monitors the `wavesrv` Go process |
| `frontend/app/app.tsx` | React root, sets up global Jotai store |

### State management

All shared state lives in Jotai atoms, mostly on singleton model classes (`*Model`). Components call `useAtomValue()` / `useAtom()` at the top level; models update state via `globalStore.set()`. The pattern is defined in `.kilocode/rules/rules.md`.

### Build system

`electron-vite` orchestrates three separate Vite builds: `emain` (Electron main), `preload`, and `frontend` (renderer). Config in `electron.vite.config.ts`.

---

## 3. Block and layout model

Blocks are the atomic UI units — each is a typed view (term, preview, ai, webview, …) rendered inside a resizable panel. The layout engine lives in `tsunami/frontend/` and is a separate workspace package.

Key types (in `pkg/waveobj/` and `frontend/types/gotypes.d.ts`):

- **Block** — a waveobj with a `view` type string, metadata, and per-block config.
- **Tab** — contains a list of block IDs and the tsunami layout state.
- **Workspace** — contains tabs, pinned blocks.
- **Window** — maps to an Electron BrowserWindow; references a workspace.

Blocks are created/deleted via wshrpc calls (`CreateBlockCommand`, `DeleteBlockCommand`). The frontend subscribes to waveobj change events via WPS (Wave PubSub, `pkg/wps/`).

---

## 4. wshrpc — the RPC layer

Source: `pkg/wshrpc/`

A bidirectional RPC protocol. Both sides can initiate calls. Transport adapters:

- **WebSocket** — renderer ↔ wavesrv (via `pkg/web/`)
- **Domain socket** — wsh agent ↔ wavesrv
- **stdin/stdout** — wsh running on a remote host

Type definitions live in `pkg/wshrpc/wshrpctypes.go`. After editing that file, run `go-task generate` to regenerate `frontend/types/gotypes.d.ts` and `frontend/app/store/wshclientapi.ts`.

The server-side handler is `pkg/wshrpc/wshserver/wshserver.go`.

---

## 5. wsh and remote connections

`wsh` (`cmd/wsh/`) is a small Go binary that gets injected into remote shells (SSH, Docker, etc.) by the connection controller (`pkg/remote/conncontroller/`). Once running on the remote side, it proxies wshrpc messages back over its stdin/stdout, giving wavesrv a unified interface regardless of where the shell is running.

Connection types handled:

- **SSH** — `pkg/remote/sshclient.go`, standard Go ssh library + agent forwarding
- **WSL** — `pkg/wsl/`, Windows-only
- **Local** — direct domain socket

File operations on remote hosts go through `pkg/remote/fileshare/wshfs/` which implements a virtual filesystem over wshrpc. The `wsh file` subcommands (`read`, `write`, `mkdir`, `stat`, `ls`) form the transport layer. Max transfer size: 32 MiB per call.

OSC 7 (`file://host/path`) is parsed in `frontend/app/view/term/osc-handlers.ts` to track the terminal's current working directory. This feeds the preview block's automatic directory following and will be used for drag-and-drop destination resolution.

---

## 6. Existing AI integration

Source: `pkg/aiusechat/`

Wave already has a multi-provider AI system. The frontend AI panel is `frontend/app/aipanel/` and the block view is `frontend/app/view/waveai/`.

### Providers (as of v0.14.5)

| Provider ID | API type | Notes |
|-------------|----------|-------|
| `wave` | openai-responses | Wave's managed cloud endpoint |
| `openai` | openai-responses / openai-chat | Direct OpenAI API |
| `google` | google-gemini | Google Generative AI SDK |
| `anthropic` | anthropic-messages | Anthropic Messages API |
| `groq` | openai-chat | OpenAI-compatible |
| `openrouter` | openai-chat | OpenAI-compatible |
| `nanogpt` | openai-chat | OpenAI-compatible |
| `azure` | openai-responses | Azure OpenAI |
| `azure-legacy` | openai-chat | Azure OpenAI legacy |
| `custom` | openai-chat / openai-responses | Configurable base URL |

### Provider backends

| Package | Implements |
|---------|-----------|
| `pkg/aiusechat/openai/` | OpenAI Responses API |
| `pkg/aiusechat/openaichat/` | OpenAI Chat Completions |
| `pkg/aiusechat/anthropic/` | Anthropic Messages |
| `pkg/aiusechat/gemini/` | Google Gemini (via SDK) |

The routing is in `pkg/aiusechat/usechat-backend.go`. Each backend returns a streaming response via SSE (`pkg/web/sse/`).

### API keys

Stored in `pkg/secretstore/` (encrypted local store). API keys are never written to plaintext config or logs. The Wave cloud provider authenticates via a JWT in `pkg/wavejwt/`.

### Configuration

AI is configured per-block via presets (`ai@<name>` in the config system). The global preset is `ai@global`. Key config fields: `ai:provider`, `ai:apitype`, `ai:model`, `ai:baseurl`, `ai:apitoken`, `ai:orgid`.

### What hatterm extends (Phase 3)

- Add `Anthropic` (`anthropic`) as a fully first-class provider in the UI
- Add `mistral`, `xai`, `deepseek`, `cohere`, `perplexity`, `together`, `aws-bedrock`
- Improve `custom` provider: configurable headers, model name, discovery endpoint
- Add Ollama, LM Studio, llama.cpp, vLLM, LocalAI with model auto-discovery
- Move API key storage to libsecret/KWallet via a new `pkg/keyring/` package
- Add a settings page for provider management and connection testing

---

## 7. File preview and directory blocks

Source: `frontend/app/view/preview/`

The preview block renders:
- **Directory view** (`preview-directory.tsx`) — a file browser with sorting, icons, and navigation.
- **File views** — text/code (Monaco), Markdown, CSV, images, PDFs.
- **Entry manager** (`entry-manager.tsx`) — handles file operations (rename, delete, open).

The directory view already displays file sizes and modification times. Drag-and-drop of files onto the AI panel exists (`aidroppedfiles.tsx`). Terminal-to-filesystem drag is not yet implemented.

---

## 8. Existing file copy support

`pkg/remote/fileshare/wshfs/` implements:
- `ReadFile` / `WriteFile` — single-file copy in ≤32 MiB chunks
- `MoveFile` / `CopyFile` — rename or copy on the same host
- `MkdirAll`, `ReadDir`, `Stat`, `DeleteFile`

The `wsh file copy` CLI command wraps these. There is no progress reporting, resume, or conflict UI at the file copy layer — these will be added in Phase 4.

---

## 9. Telemetry and upstream cloud features

### Endpoints (as of v0.14.5)

| Constant | URL | Purpose |
|----------|-----|---------|
| `WCloudEndpoint` | `https://api.waveterm.dev/central` | Telemetry, web-share upload |
| `WCloudPingEndpoint` | `https://ping.waveterm.dev/central` | Periodic ping / no-telemetry opt-out |

Source: `pkg/wcloud/wcloud.go`. Both endpoints are overridable via env vars `WCLOUD_ENDPOINT` and `WCLOUD_PING_ENDPOINT` (set to empty strings in the Taskfile dev env).

### What is sent

- **Telemetry events** (`/tevents`) — anonymous usage data: block type counts, active minutes, AI request counts. Enabled by default; user can disable via `telemetry:enabled = false`.
- **No-telemetry ping** (`/no-telemetry`) — sent once when user disables telemetry so Wave can adjust aggregate counts.
- **Activity** (`/telemetry`) — legacy activity records.
- **Web-share** (`/auth/web-share-update`) — only if user explicitly enables web sharing.

### Auto-update

`emain/updater.ts` uses `electron-updater`. The update feed URL comes from `electron-builder.config.cjs`. Config: `autoupdate:enabled`, `autoupdate:channel`, `autoupdate:intervalms`.

### What hatterm disables (Phase 3/6)

- Set `WCloudPingEndpoint` to `""` at compile time — disables the ping entirely.
- Set `WCloudEndpoint` to `""` — disables telemetry upload (data can still be collected locally).
- Set `telemetry:enabled = false` as the compiled default in `pkg/wconfig/`.
- Disable `autoupdate:enabled` by default; replace the update feed URL with hatterm's own GitHub releases.
- Remove `waveai:showcloudmodes` from the UI (Wave's managed AI endpoint).
- Document all changes in this file under "hatterm modifications".

---

## 10. hatterm modifications

*This section is updated as the fork diverges from upstream v0.14.5.*

| Area | Status | Notes |
|------|--------|-------|
| Telemetry disabled by default | Planned Phase 3 | `telemetry:enabled = false` |
| Wave cloud endpoints removed | Planned Phase 3 | Null out `WCloudEndpoint`, `WCloudPingEndpoint` |
| Auto-update pointing to hatterm releases | Planned Phase 7 | Update `electron-builder.config.cjs` |
| Rebrand (icons, app ID, window titles) | Planned Phase 3 | All user-facing strings |
| AI providers extended | Planned Phase 4 | See §6 |
| Drag-and-drop file copy | Planned Phase 5 | Extends §7–8 |
| Counter integration | Planned Phase 6 | Imports `hatterm-counter` |
