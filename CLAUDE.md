# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Pixel Agents is a pixel-art UI for Claude Code agents.

There are currently two hosts sharing similar concepts:

- `src/` + `webview-ui/`: the main VS Code extension
- `app/`: a standalone Electron app that is being built alongside the extension
- `server/`: the Claude Code hooks HTTP server used by the extension/hook flow
- `shared/`: host-agnostic shared types/utilities
- `scripts/`: asset generation/import tooling, not the core runtime

The extension is the mature path. The Electron app is newer and reuses the same general ideas: launch Claude Code sessions, watch JSONL transcripts, and forward agent events into a React/canvas UI.

## Common commands

### Install

```sh
npm install
cd webview-ui && npm install && cd ..
cd server && npm install && cd ..
cd app && npm install && cd ..
```

### Extension development

- `npm run build` — full extension build
- `npm run watch` — watch TypeScript + esbuild for extension work
- Press `F5` in VS Code to launch the Extension Development Host
- `npm run package` — production-style extension bundle

Build order matters: root `compile` runs type-check → lint → esbuild → webview build.
The extension build depends on `webview-ui/` being installed and built as part of the root scripts.

### Lint, format, type-check

- `npm run lint`
- `npm run lint:fix`
- `npm run format`
- `npm run format:check`
- `npm run check-types` — root extension types plus `server/tsconfig.test.json`
- `npm run knip`

### Tests

- `npm test` — all webview + server tests
- `npm run test:webview` — webview tests only
- `npm run test:server` — server Vitest tests only
- `npm run e2e` — Playwright tests against a real VS Code instance
- `npm run e2e:debug` — Playwright debug mode

### Run a single test

- Server single file: `cd server && npx vitest run __tests__/server.test.ts`
- Server single test name: `cd server && npx vitest run __tests__/server.test.ts -t "test name"`
- Webview single file: `cd webview-ui && node --import tsx/esm --test test/some.test.ts`
- Webview single test name: `cd webview-ui && node --import tsx/esm --test --test-name-pattern "test name" test/some.test.ts`

### Electron app

- `cd app && npm run dev` — build and launch Electron app
- `cd app && npm run build` — rebuild `webview-ui/`, then compile Electron TypeScript
- `cd app && npm run build:bin` — build CLI wrapper
- `cd app && npm run pack` — unpackaged Electron build
- `cd app && npm run dist` — packaged build
- `cd app && npm run dist:mac` — macOS package

## Big-picture architecture

### 1. Host/runtime split

The core product is not just a React app. It is a host runtime plus a pixel-art UI:

- Host layer launches/manages Claude Code sessions and discovers transcript files
- Transcript/hook layer converts Claude activity into higher-level agent events
- Web UI renders those events as characters in an office simulation

The VS Code extension host and the Electron app are two different shells around that same product idea.

### 2. VS Code extension flow

Key files:

- `src/extension.ts` — activation and command registration
- `src/PixelAgentsViewProvider.ts` — main extension orchestrator
- `src/agentManager.ts` — terminal/session lifecycle and persistence
- `src/fileWatcher.ts` — transcript polling, adoption, `/clear` handling
- `src/transcriptParser.ts` — JSONL line parsing into agent/tool events
- `src/layoutPersistence.ts` / `src/configPersistence.ts` — user-level persistence
- `src/assetLoader.ts` — loads sprites/catalog/default layout

Mental model:

1. The extension registers a `WebviewViewProvider`.
2. The provider starts the server, loads assets/layout/config, restores agents, and bridges messages.
3. Creating an agent launches a Claude terminal with a session id.
4. The extension locates `~/.claude/projects/<project-hash>/<session-id>.jsonl`.
5. Transcript lines and/or hook events are parsed into messages like `agentToolStart`, `agentToolDone`, `agentStatus`, `layoutLoaded`.
6. The webview updates the office simulation from those messages.

### 3. Hook mode vs heuristic mode

This distinction matters whenever agent status logic looks wrong.

- Preferred path: hooks delivered through the standalone server in `server/src/server.ts`
- Fallback path: JSONL polling heuristics in `src/fileWatcher.ts`

Important behavior:

- Hooks improve start/stop/waiting detection
- JSONL polling still runs for tool content and animation/status text
- When hooks are active, heuristic timers/scanners are suppressed, not the underlying transcript parsing

### 4. Server responsibilities

The `server/` package is not a generic backend; it is a local hooks transport for Claude Code.

Key files:

- `server/src/server.ts` — local HTTP server, health checks, `server.json` discovery
- `server/src/hookEventHandler.ts` — buffers and routes hook events to agents
- `server/src/providers/file/claudeHookInstaller.ts` — installs hooks into `~/.claude/settings.json`
- `server/src/providers/file/hooks/claude-hook.ts` — hook script Claude executes

The root `esbuild.js` bundles the hook script into `dist/hooks/claude-hook.js` during extension builds.

### 5. Webview architecture

The UI is a React shell around an imperative simulation.

Key files:

- `webview-ui/src/App.tsx` — composition root
- `webview-ui/src/hooks/useExtensionMessages.ts` — message ingress and state updates
- `webview-ui/src/office/engine/officeState.ts` — main world state
- `webview-ui/src/office/engine/gameLoop.ts` — requestAnimationFrame loop
- `webview-ui/src/office/engine/renderer.ts` — canvas rendering
- `webview-ui/src/office/components/OfficeCanvas.tsx` — canvas interaction bridge
- `webview-ui/src/office/editor/*` — layout editor operations/state
- `webview-ui/src/office/layout/*` — seat derivation, tile map, furniture catalog

Important design choice:

- The office world is imperative and canvas-driven, not modeled as fine-grained React state
- If a selection/editing change looks “stuck”, check whether imperative state changed without the corresponding React callback

### 6. Electron app architecture

The Electron app in `app/` is its own host, not a wrapper around the VS Code extension. It reuses the built `webview-ui/` output rather than embedding the extension webview directly.

Key files:

- `app/src/main/index.ts` — BrowserWindow, tray, menu, IPC wiring
- `app/src/main/processManager.ts` — launches `claude`, tracks child processes, waits for JSONL files
- `app/src/main/agentManager.ts` — maps sessions/files into agent events
- `app/src/preload.ts` — safe IPC bridge exposed as `window.electronAPI`
- `app/src/renderer/*` — Electron renderer UI

The Electron main process launches Claude Code directly with a session id, waits for the JSONL transcript file to appear, then creates/updates agents and forwards events over IPC.

## Persistence and data locations

These paths are important when debugging behavior that survives reloads:

- Claude transcripts: `~/.claude/projects/<project-hash>/<session-id>.jsonl`
- Shared layout: `~/.pixel-agents/layout.json`
- Shared config: `~/.pixel-agents/config.json`
- Hook server discovery: `~/.pixel-agents/server.json`
- Installed local hooks: `~/.pixel-agents/hooks/`
- VS Code agent persistence: extension `workspaceState`

The layout/config files are user-level and shared across windows/workspaces. Bugs here often reproduce across separate VS Code sessions.

## Asset system

The extension/webview ship with bundled assets under `webview-ui/public/assets/`, which are copied into `dist/assets/` during build.

Important facts:

- Furniture is data-driven from manifests/catalog, not hardcoded enums
- Rotation/state behavior is derived from `groupId`, `orientation`, and `state`
- Floor and wall coloring are runtime transforms, not separate exported assets
- Default layout comes from bundled assets when no saved layout exists
- External asset directories can override bundled items by id

If a rendering bug only affects one furniture family, check manifest/catalog metadata before changing placement or renderer logic.

## Constraints and conventions

### TypeScript

- Do not use `enum`; use `as const` objects
- Use `import type` for type-only imports
- `noUnusedLocals` and `noUnusedParameters` are enforced
- Keep changes compatible with separate TypeScript projects in the root, `server/`, `webview-ui/`, and `app/`

### Constants

Do not introduce inline magic numbers/strings. Add or reuse constants in:

- `src/constants.ts` — extension-only values
- `server/src/constants.ts` — shared timing/scanning values used by server/extension
- `webview-ui/src/constants.ts` — rendering, editor, camera, animation, layout values
- `webview-ui/src/index.css` `:root` — UI color/style variables

### UI styling

Keep the pixel-art style intact:

- Sharp corners, no rounded modern UI defaults
- Solid backgrounds
- Hard-offset shadows instead of blurred shadows
- Integer zoom / pixel-perfect rendering assumptions

## Known gotchas

- `fs.watch` is not reliable enough by itself; polling backups are intentional
- Partial-line buffering is required when reading append-only JSONL files
- `agentToolDone` is intentionally delayed slightly to avoid UI flicker
- `/clear` creates a new JSONL file instead of truncating the old one
- Text-only turns and tool-using turns use different completion signals
- The webview uses imperative editor/world state; React state alone is not the source of truth
- `--output-format stream-json` requires non-TTY stdin and is not suitable for VS Code terminal flows

## Product behavior worth remembering

- One agent character corresponds to one Claude terminal/session
- Sub-agents are temporary characters linked to a parent and are not persisted
- Seat assignment is derived from chair furniture, not stored independently of layout semantics
- Layout editing, office simulation, and agent activity rendering all meet in the same canvas world; bugs often cross those boundaries
- The extension is currently the canonical implementation, but new work may also need matching changes in `app/`

## Docs worth checking

- `README.md` — user-facing overview and asset workflow
- `AGENTS.md` — shorter local working notes
- `docs/external-assets.md` — external asset pack format
- `CHANGELOG.md` — recent shipped behavior and feature phases
