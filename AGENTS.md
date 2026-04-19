# Pixel Agents

VS Code extension with embedded React webview: pixel art office where AI agents (Claude Code terminals) are animated characters.

## Build & Test

```sh
npm install && cd webview-ui && npm install && cd ../server && npm install && cd .. && npm run build
```

Press **F5** in VS Code to launch Extension Development Host.

**Command order matters**: `compile` (package.json) runs type-check → lint → esbuild → vite build.

**Testing**:

- `npm test` — all tests (webview + server)
- `npm run test:server` — server Vitest tests only
- `npm run test:webview` — webview tests (Node runner, uses `tsx/esm`)
- `npm run e2e` — Playwright E2E tests

## Architecture

- `src/` — Extension backend (Node.js, VS Code API)
- `server/` — Standalone HTTP server for Claude Code hooks (no VS Code deps)
- `webview-ui/` — React 19 + Vite + Canvas 2D (separate tsconfig, separate node_modules)
- `scripts/` — Asset extraction/editing pipeline (not part of extension build)

Extension ↔ Webview: `postMessage` protocol. Key messages: `agentCreated/Closed`, `agentToolStart/Done/Clear`, `agentStatus`, `layoutLoaded`, `furnitureAssetsLoaded`.

## TypeScript Constraints

- **No `enum`** (`erasableSyntaxOnly`) — use `as const` objects
- **`import type` required** for type-only imports (`verbatimModuleSyntax`)
- **`noUnusedLocals` / `noUnusedParameters`**

## Constants

All magic numbers centralized in:

- `src/constants.ts` — extension backend
- `webview-ui/src/constants.ts` — webview (grid, animation, rendering, editor)
- `webview-ui/src/index.css` `:root` — CSS variables for UI styling

## Key Patterns & Gotchas

- **`fs.watch` unreliable on Windows** — always pair with polling backup (500ms interval)
- **Partial line buffering** — essential for append-only JSONL file reads
- **Delay `agentToolDone` 300ms** — prevents React batching from hiding brief active states
- **OfficeCanvas selection changes** — imperative (`editorState.selectedFurnitureUid`); must call `onEditorSelectionChange()` to trigger React re-render
- **`crypto.randomUUID()`** — works in VS Code extension host
- **`--output-format stream-json`** — needs non-TTY stdin, can't use with VS Code terminals

## Persistence

- Layout: `~/.pixel-agents/layout.json` (user-level, cross-window)
- Config: `~/.pixel-agents/config.json` (external asset directories)
- Agents: `workspaceState` (VS Code, per-workspace)
- Transcript: `~/.claude/projects/<project-hash>/<session-id>.jsonl`

## Extension ↔ Server

- Server bundled via `esbuild.js` `buildHooks()` → `dist/hooks/claude-hook.js`
- Hook discovery via `~/.pixel-agents/server.json` (port + PID + auth token)
- Server always starts; only hook installation is gated by setting
