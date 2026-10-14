# Counter Integration Proposal

**For:** hatterm (Wave Terminal fork)
**Date:** 2026-10-14
**Status:** Awaiting licence confirmation before proceeding

---

## 1. Source repos reviewed

| Repo path | README title | Licence |
|-----------|-------------|---------|
| `~/repos/GenerativeAI-usage-Counter` | konsole-claude-counter | CC BY-NC-SA 4.0 |

The `konsole-claude-counter` repo referenced in the brief does not exist as a separate directory; `GenerativeAI-usage-Counter` **is** that repo — the README title and the `statusline.py` file header both read "konsole-claude-counter". All analysis below applies to this single codebase.

---

## 2. What the counter does

### 2a. Live statusLine (Claude Code integration)

Hooks into Claude Code's `statusLine` command. On every prompt, Claude Code pipes a JSON payload to the configured command; the script reads it from stdin and prints ANSI-coloured lines back.

Three output lines:

```
  [Claude Sonnet] 📁 hatterm | 🌿 hatterm-main ~3
  ██████░░░░ 61% (122.0k/200k) | $0.83
  5h 12% | 7d 4%
```

- **Line 1** — model name, current directory, git branch + staged/modified counts.
- **Line 2** — context-window progress bar, percentage, tokens/context-size, session cost. Bar colour: green <70 %, yellow 70–89 %, red ≥90 %. Shows `context: warming up…` before the first API response.
- **Line 3** — 5-hour and 7-day rolling rate-limit percentages with countdown timers. Shows `usage limits: warming up…` until live data arrives.

### 2b. Live hooks (Gemini CLI)

Integrates with Gemini's `SessionStart` / `AfterAgent` hook events. Produces equivalent three-line output for Gemini Flash / Pro. Falls back to the most recent session for the same CWD when the current transcript is empty (e.g. at session start).

### 2c. Standalone cognitive dashboard (`cognitive-report`)

Reads local log files for all six providers and prints an executive summary table.

| Provider | Log source |
|----------|-----------|
| Claude Code | `~/.claude/projects/**/*.jsonl` — `message.usage` fields |
| Gemini CLI | `~/.gemini/session-*.jsonl`, `~/.gemini/projects.json` |
| Aider | `~/.aider/analytics.jsonl` |
| ChatGPT / Codex | `~/.openai/`, `~/.codex/` |
| GitHub Copilot | VS Code / Visual Studio telemetry log dirs (OS-specific) |

De-duplication is by `message.id` for Claude and Gemini. Per-project breakdown sorted by cost.

### 2d. VS Code extension

TypeScript extension (`vscode-extension/`) providing status bar item, sidebar tree view, and webview dashboard — shares no runtime code with the Python engine; it re-parses the same log files.

---

## 3. Key functions for extraction into a shared module

| Function | Purpose | Lines |
|----------|---------|-------|
| `run_statusline_with_data(data)` | Render the three-line Claude Code statusline from a parsed JSON payload | 299–446 |
| `get_claude_quota_usage(claude_dir)` | Rolling 24h / 7d turn and cost stats from JSONL logs | 600–655 |
| `get_aider_session_stats()` | Current Aider session tokens and cost | 448–501 |
| `get_aider_alltime_stats()` | All-time Aider aggregates | 504–539 |
| `PRICING` dict | Token prices per million for all providers | 39–68 |
| Colour constants + threshold logic | GREEN/YELLOW/RED at <70 / 70–89 / ≥90 % | 29–37, inline |
| `"warming up…"` state strings | Shown before first data arrives | 305, 355, 427 |

---

## 4. Proposed architecture: shared module

Rather than copying `statusline.py` into hatterm, the proposal is to extract a minimal, provider-agnostic library (`hatterm-counter`) that both the standalone repos and hatterm can import.

```
hatterm-counter/          ← new Apache 2.0 library
  __init__.py
  claude.py               ← Claude Code log parsing + statusline rendering
  gemini.py               ← Gemini CLI log parsing
  aider.py                ← Aider analytics
  providers.py            ← Pricing table, colour thresholds, warm-up state
  dashboard.py            ← Standalone cognitive report (optional)
```

**hatterm** imports `hatterm-counter` as a Go-called subprocess or as a bundled Python helper and feeds it:

- The live Claude Code `statusLine` JSON payload (for the per-block status strip in Step 5).
- hatterm's own AI block token/cost data (for the unified dashboard).

**GenerativeAI-usage-Counter** retains its own `statusline.py` (CC BY-NC-SA 4.0) but delegates parsing logic to `hatterm-counter`. This means the standalone tool keeps its licence and the shared library is separately licensed.

### Integration points in hatterm

1. **Per-block status strip** — when a terminal block is running Claude Code (detected via the `statusLine` hook), hatterm renders the three-line strip beneath the prompt using the shared module's output.
2. **Dashboard block** — an optional hatterm block type that calls the shared module's `cognitive-report` equivalent and renders it in a panel.
3. **AI block metering** — hatterm records token counts and cost for its own AI blocks and passes them to the shared module so all usage appears in one place.

---

## 5. Licence incompatibility — STOP

**This is the blocker. No code can be integrated until it is resolved.**

CC BY-NC-SA 4.0 and Apache 2.0 are **incompatible**:

| Constraint | CC BY-NC-SA 4.0 | Apache 2.0 |
|-----------|----------------|-----------|
| Commercial use | **Prohibited** (NC) | Permitted |
| Derivatives | Must use same licence (SA) | Permissive |
| Compatibility | **Incompatible with Apache 2.0** | — |

Incorporating CC BY-NC-SA 4.0 code into an Apache 2.0 project would require recipients to comply with both licences simultaneously, which is impossible: Apache 2.0 permits commercial use, CC BY-NC-SA prohibits it.

### Proposed resolution

Release `hatterm-counter` (the extracted shared library) under **Apache 2.0**, authored by Neil Manfred. This is permissible because:

1. Neil Manfred is the sole copyright holder of `GenerativeAI-usage-Counter` — he can dual-licence or re-licence his own work at will.
2. The standalone repos (`GenerativeAI-usage-Counter` as presented to end users) **keep CC BY-NC-SA 4.0** — no existing downstream user is affected.
3. `hatterm-counter` is a clean re-extraction of the logic, not a verbatim copy of the CC-licensed files. It carries a fresh Apache 2.0 header with Neil Manfred's copyright.
4. `THIRD_PARTY_NOTICES.md` in hatterm notes that the counter logic was derived from Neil Manfred's own prior work and re-licensed.

### What changes (if confirmed)

| File / repo | Change |
|-------------|--------|
| `~/repos/GenerativeAI-usage-Counter/LICENSE` | **No change** — stays CC BY-NC-SA 4.0 |
| New `~/repos/hatterm-counter/` | New repo, Apache 2.0, extracts shared logic |
| `hatterm/THIRD_PARTY_NOTICES.md` | Documents hatterm-counter and its Apache 2.0 licence |
| `hatterm/NOTICE` | Notes derivation from author's own prior work |

---

## 6. Decision required

**Please confirm one of the following before Phase 2 begins:**

**A. Proceed as proposed** — extract `hatterm-counter` as a new Apache 2.0 library, keep the standalone repos on CC BY-NC-SA 4.0, integrate into hatterm via the shared module.

**B. Alternative: no shared module** — rewrite the counter logic in Go/TypeScript natively in hatterm under Apache 2.0, with no code shared with the CC-licensed repos. Clean-room implementation, no licence risk, but duplicates maintenance effort.

**C. Alternative: keep CC BY-NC-SA in a sandboxed plugin** — hatterm ships a plugin loader; the CC-licensed counter runs as an optional external plugin that users install separately. The main hatterm binary stays Apache 2.0. This avoids any combination of the licences but means the counter is not built-in.

No counter code will be written, copied or integrated until confirmation is received.
