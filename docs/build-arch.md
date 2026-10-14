# Building hatterm on Arch Linux

## Prerequisites

Install all build tools in one command:

```sh
sudo pacman -S go zig go-task zip
```

| Tool | Required version | Notes |
|------|-----------------|-------|
| Node.js | 22+ LTS | `nodejs` pacman package; 26.x works fine |
| npm | 10+ | bundled with nodejs |
| Go | 1.25+ | `go` pacman package |
| Zig | any stable | required for CGO cross-compilation of `wavesrv` |
| go-task | any | Arch packages this as `go-task`, not `task` |
| zip | any | required by backend build |

> **Arch note:** The pacman package is named `go-task`; the binary is also `go-task`. All commands below use `go-task`. Upstream docs say `task` — substitute accordingly.

## First-time setup

```sh
# 1. Install Node dependencies
#    --allow-remote=all is required: docs/package.json contains a GitHub tarball
#    dependency (@waveterm/docusaurus-og) that npm would otherwise block.
cd ~/repos/hatterm
npm install --allow-remote=all

# Accept pending install scripts when prompted (electron, esbuild, etc.)
npm install-scripts approve --all
npm install --allow-remote=all   # re-run after approvals

# 2. Build the Go backend (wavesrv + wsh binaries)
go-task build:backend

# 3. Build the frontend
npm run build:prod
```

## Development workflow

```sh
# Build backend + run with Vite HMR (hot reload):
go-task dev

# Build backend + run standalone (no hot reload):
go-task start
```

## Non-fatal warning: `sharp` not found

The `vite-plugin-image-optimizer` emits warnings about a missing `sharp` package during `build:prod`. This only affects PNG compression of logo assets and does not affect functionality. To silence it:

```sh
npm install --allow-remote=all --allow-scripts=@img/sharp-linux-x64
```

## Observed issues and fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `npm error code EALLOWREMOTE` | Claude Code security policy blocks remote tarball fetches | Pass `--allow-remote=all` to `npm install` |
| `go: command not found` | Go not in PATH after fresh Arch install | `sudo pacman -S go`; restart shell |
| `zig: not found` | Required for CGO static linking | `sudo pacman -S zig` |
| `task: not found` | Arch binary is `go-task` | `sudo pacman -S go-task` |

## Package build (AppImage / deb)

See `docs/packaging.md` (to be written in Phase 7). Additional pacman packages required:
`fpm` (via gem), `rpm-tools`, `squashfs-tools`, `libarchive`, `binutils`.
