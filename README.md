<h1 align="center">
    <a href="https://github.com/LouisEleven/pixel-agents-electron">
        <img src="webview-ui/public/banner.png" alt="Pixel Agents">
    </a>
</h1>

<h2 align="center" style="padding-bottom: 20px;">
  The game interface where AI agents build real things
  <br/>
  AI 智能体真正干活的游戏化界面
</h2>

<div align="center" style="margin-top: 25px;">

[![license](https://img.shields.io/github/license/LouisEleven/pixel-agents-electron?color=0183ff&style=flat)](LICENSE)

</div>

<div align="center">
<a href="CHANGELOG.md">📋 Changelog</a> • <a href="docs/product-ideas.md">🧠 Product Ideas</a>
</div>

<br/>

## 中文

`pixel-agents-electron` 是一个独立的 Electron 桌面应用，用像素办公室的方式可视化和管理 AI agents。每个 agent 都会变成办公室里的角色：会移动、会坐到工位、会根据当前行为展示状态——写代码时打字、搜索文件时阅读、等待你处理时停下来。

这个项目已经不再以 VS Code 插件为主要形态，而是聚焦在独立桌面端体验，适合直接运行、打包和分发 Electron 应用。

本项目基于另一个作者的优秀开源项目二次开发，特别感谢原项目作者：<https://github.com/pablodelucca/pixel-agents>。

## English

`pixel-agents-electron` is a standalone Electron desktop app for visualizing and managing AI agents through a pixel-art office interface. Each agent becomes a character in the office: walking around, sitting at a desk, and reflecting what it is doing in real time — typing when coding, reading when searching files, and waiting when it needs your attention.

This project is no longer positioned as a VS Code extension. It is now focused on the standalone desktop experience so it can be run, packaged, and distributed as an Electron application.

This project is derived from another author's excellent open-source work. Special thanks to the original project author: <https://github.com/pablodelucca/pixel-agents>.

![Pixel Agents screenshot](webview-ui/public/Screenshot.jpg)

## Features

- **One agent, one character** — every Claude Code terminal gets its own animated character
- **Live activity tracking** — characters animate based on what the agent is actually doing (writing, reading, running commands)
- **Office layout editor** — design your office with floors, walls, and furniture using a built-in editor
- **Speech bubbles** — visual indicators when an agent is waiting for input or needs permission
- **Sound notifications** — optional chime when an agent finishes its turn
- **Sub-agent visualization** — Task tool sub-agents spawn as separate characters linked to their parent
- **Persistent layouts** — your office design is saved locally and restored across app launches
- **External asset directories** — load custom or third-party furniture packs from any folder on your machine
- **Diverse characters** — 6 diverse characters. These are based on the amazing work of [JIK-A-4, Metro City](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack).

<p align="center">
  <img src="webview-ui/public/characters.png" alt="Pixel Agents characters" width="320" height="72" style="image-rendering: pixelated;">
</p>

## Requirements / 环境要求

### 中文

- 已安装并配置 [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- 支持平台：macOS、Windows、Linux

### English

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- Supported platforms: macOS, Windows, and Linux

## Getting Started / 快速开始

### 中文

如果你想直接运行这个独立 Electron 应用，可以按下面步骤开始：

```bash
git clone https://github.com/LouisEleven/pixel-agents-electron.git
cd pixel-agents-electron
npm install
cd webview-ui && npm install && cd ..
cd app && npm install && cd ..
cd app && npm run dev
```

如果你想打包桌面应用：

```bash
cd app
npm run dist:mac
npm run dist:win
```

### English

If you want to run the standalone Electron app locally, use:

```bash
git clone https://github.com/LouisEleven/pixel-agents-electron.git
cd pixel-agents-electron
npm install
cd webview-ui && npm install && cd ..
cd app && npm install && cd ..
cd app && npm run dev
```

If you want to package the desktop app:

```bash
cd app
npm run dist:mac
npm run dist:win
```

## Usage / 使用方式

1. Open the **Pixel Agents** panel (it appears in the bottom panel area alongside your terminal)
2. Click **+ Agent** to spawn a new Claude Code terminal and its character. Right-click for the option to launch with `--dangerously-skip-permissions` (bypasses all tool approval prompts)
3. Start coding with Claude — watch the character react in real time
4. Click a character to select it, then click a seat to reassign it
5. Click **Layout** to open the office editor and customize your space

## Layout Editor

The built-in editor lets you design your office:

- **Floor** — Full HSB color control
- **Walls** — Auto-tiling walls with color customization
- **Tools** — Select, paint, erase, place, eyedropper, pick
- **Undo/Redo** — 50 levels with Ctrl+Z / Ctrl+Y
- **Export/Import** — Share layouts as JSON files via the Settings modal

The grid is expandable up to 64×64 tiles. Click the ghost border outside the current grid to grow it.

### Office Assets

All office assets (furniture, floors, walls) are now **fully open-source** and included in this repository under `webview-ui/public/assets/`. No external purchases or imports are needed — everything works out of the box.

Each furniture item lives in its own folder under `assets/furniture/` with a `manifest.json` that declares its sprites, rotation groups, state groups (on/off), and animation frames. Floor tiles are individual PNGs in `assets/floors/`, and wall tile sets are in `assets/walls/`. This modular structure makes it easy to add, remove, or modify assets without touching any code.

To add a new furniture item, create a folder in `webview-ui/public/assets/furniture/` with your PNG sprite(s) and a `manifest.json`, then rebuild. The asset manager (`scripts/asset-manager.html`) provides a visual editor for creating and editing manifests.

To use furniture from an external directory, open Settings → **Add Asset Directory**. See [docs/external-assets.md](docs/external-assets.md) for the full manifest format and how to use third-party asset packs.

Characters are based on the amazing work of [JIK-A-4, Metro City](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack).

## How It Works / 工作原理

### 中文

`pixel-agents-electron` 会监听 Claude Code 的 JSONL transcript 文件，追踪每个 agent 当前在做什么。当 agent 调用工具（比如写文件、运行命令、读取内容）时，桌面应用会更新角色动画和状态展示。整个过程不需要改动 Claude Code 本身。

前端界面运行的是一个轻量级 canvas 游戏循环，包含渲染、寻路和角色状态机（idle → walk → type/read），以像素风方式实时表现 agent 的活动。

### English

`pixel-agents-electron` watches Claude Code JSONL transcript files to track what each agent is doing. When an agent uses a tool such as writing a file or running a command, the desktop app updates the character animation and status in real time. No modification to Claude Code itself is required.

The UI runs a lightweight canvas game loop with rendering, pathfinding, and a character state machine (`idle → walk → type/read`) to visualize agent activity in a pixel-perfect style.

## Tech Stack

- **Desktop app**: Electron, TypeScript, `node-pty`, `electron-builder`
- **Webview/UI**: React 19, TypeScript, Vite, Canvas 2D
- **Shared logic**: TypeScript, Claude transcript parsing, asset loading, persistence

## Known Limitations

- **Agent-terminal sync** — the way agents are connected to Claude Code terminal instances is not super robust and sometimes desyncs, especially when terminals are rapidly opened/closed or restored across sessions.
- **Heuristic-based status detection** — Claude Code's JSONL transcript format does not provide clear signals for when an agent is waiting for user input or when it has finished its turn. The current detection is based on heuristics (idle timers, turn-duration events) and often misfires — agents may briefly show the wrong status or miss transitions.
- **Linux/macOS tip** — if you launch the app without explicitly choosing a project folder, agents may start in your home directory. This is supported; Claude sessions will still be tracked under `~/.claude/projects/` using your home directory as the project root.

## Troubleshooting

If your agent appears stuck on idle or doesn't spawn:

1. **Debug View** — Open app settings and enable **Debug View** to inspect each agent's JSONL file status, parsed lines, last activity timestamp, and file path. If you see `JSONL not found`, the app cannot locate the session transcript.
2. **Logs** — If you're running from source, check the Electron app logs for `[Pixel Agents]` messages related to project directory resolution, JSONL polling, path mismatches, and unrecognized transcript record types.

## Where This Is Going

The long-term vision is an interface where managing AI agents feels like playing the Sims, but the results are real things built.

- **Agents as characters** you can see, assign, monitor, and redirect, each with visible roles (designer, coder, writer, reviewer), stats, context usage, and tools.
- **Desks as directories** — drag an agent to a desk to assign it to a project or working directory.
- **An office as a project** — with a Kanban board on the wall where idle agents can pick up tasks autonomously.
- **Deep inspection** — click any agent to see its model, branch, system prompt, and full work history. Interrupt it, chat with it, or redirect it.
- **Token health bars** — rate limits and context windows visualized as in-game stats.
- **Fully customizable** — upload your own character sprites, themes, and office assets. Eventually maybe even move beyond pixel art into 3D or VR.

For this to work, the architecture needs to be modular at every level:

- **Platform-agnostic**: Electron desktop app today, with room for web or other host environments tomorrow.
- **Agent-agnostic**: Claude Code today, but built to support Codex, OpenCode, Gemini, Cursor, Copilot, and others through composable adapters.
- **Theme-agnostic**: community-created assets, skins, and themes from any contributor.

We're actively refining the core runtime and adapter architecture to make this possible.


## Product Notes / 产品思路

- See `docs/product-ideas.md` for a bilingual product direction and feature ideas document.
- 查看 `docs/product-ideas.md` 获取一份中英双语的产品方向与玩法构想。

## Community & Contributing

- Repository: <https://github.com/LouisEleven/pixel-agents-electron>
- Product notes: `docs/product-ideas.md`
- Contribution guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`

## License

This project is licensed under the [MIT License](LICENSE).
