# Pixel Agents Electron App 架构

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │processManager│  │  ptyManager  │  │    agentManager      │  │
│  │  (Claude)    │  │  (Terminal)  │  │  (Agent State/JSONL)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └────────┬────────┴──────────────────────┘              │
│                  │ IPC                                           │
├──────────────────┼──────────────────────────────────────────────┤
│                  │ preload.ts                                    │
├──────────────────┼──────────────────────────────────────────────┤
│                  ▼          Renderer Process (React)            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    vscodeApi / electronAPI                  │  │
│  │                         │                                   │  │
│  │  ┌─────────────────────┼─────────────────────────────┐    │  │
│  │  ▼                     ▼                             ▼    │  │
│  │ OfficeCanvas    TerminalPanel              ToolOverlay     │  │
│  │ (游戏画面)       (xterm.js)                 (小人动画)     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 核心组件

### Main Process (`app/src/main/`)

#### 1. processManager.ts - Claude Code 进程管理

```
职责：启动和管理 Claude Code 子进程

关键方法：
- launchClaudeCode(cwd?, bypassPermissions?) → id
  1. 生成 sessionId
  2. 构建项目目录 ~/.claude/projects/<hash>/
  3. 用 `script -q /dev/null claude --session-id <id> --output-format stream-json` 启动
  4. 等待 JSONL 文件创建
  5. 调用 onProcessStart 回调

- sendInput(id, text) → 发送输入到进程 stdin

回调：
- onProcessStart: 进程启动时调用
- onJsonlReady: JSONL 文件就绪时调用
- onProcessExit: 进程退出时调用
- onProcessOutput: 捕获 stdout/stderr
```

#### 2. ptyManager.ts - PTY 终端管理

```
职责：管理交互式 shell 终端（用于 xterm.js 渲染）

关键方法：
- spawn(cwd?, folderName?, shell?) → id
  1. 用 node-pty 创建 PTY
  2. 启动 shell (zsh/bash)
  3. 监听 PTY 数据和退出事件

- write(id, data) → 写入 PTY
- resize(id, cols, rows) → 调整大小
- kill(id) → 终止 PTY

回调：
- onOutput: PTY 输出数据
- onExit: PTY 退出
```

#### 3. agentManager.ts - Agent 状态管理

```
职责：解析 JSONL transcript，管理 agent 状态

关键方法：
- createAgent(id, sessionId, jsonlFile, projectDir, folderName?)
  1. 创建 AgentState 对象
  2. 启动文件轮询 (每 500ms 读取新内容)
  3. 解析 JSONL 行
  4. 发送 agentCreated/agentToolStart/agentToolDone 等事件

- removeAgent(id) → 清理状态和定时器

事件类型：
- agentCreated / agentClosed
- agentToolStart / agentToolDone / agentToolsClear
- agentStatus (idle/active/waiting)
```

#### 4. index.ts - 主入口

```
职责：
- 创建 BrowserWindow
- 注册 IPC handlers
- 设置 tray 和 menu
- 转发 agent 事件到 renderer
```

## IPC 通信

### Renderer → Main

| IPC Channel      | Handler                           | 说明             |
| ---------------- | --------------------------------- | ---------------- |
| `launchAgent`    | processManager.launchClaudeCode() | 启动 Claude Code |
| `killAgent`      | 终止进程 + 移除 agent             | 关闭 agent       |
| `sendToAgent`    | processManager.sendInput()        | 发送输入         |
| `getAgents`      | 返回所有 agent 列表               | 获取状态         |
| `spawnTerminal`  | ptyManager.spawn()                | 创建 PTY 终端    |
| `terminalInput`  | ptyManager.write()                | PTY 输入         |
| `terminalResize` | ptyManager.resize()               | PTY 调整大小     |
| `killTerminal`   | ptyManager.kill()                 | 关闭 PTY         |

### Main → Renderer (via preload event listeners)

| 事件              | 来源                      | 数据         |
| ----------------- | ------------------------- | ------------ |
| `agent:event`     | agentManager              | 状态变化事件 |
| `terminal:event`  | ptyManager/processManager | 终端事件     |
| `menu-action`     | menu                      | 菜单动作     |
| `webview:message` | index.ts                  | 初始化数据   |

## Terminal 事件类型

```typescript
type TerminalEvent =
  | { type: 'terminal-session'; session: { id; sessionId; folderName } }
  | { type: 'terminal-output'; id: number; chunk: string }
  | { type: 'terminal-exit'; id: number };
```

## 点击 +Agent 的完整流程

```
1. 用户点击 BottomToolbar 的 +Agent 按钮
   ↓
2. openClaude() 被调用
   ↓
3. 检查 electronAPI.launchAgent 是否存在 (Electron 模式)
   ├── 存在：调用它
   └── 不存在：fallback 到 vscode.postMessage({ type: 'openClaude' })
   ↓
4. Main process: ipcMain.handle('launchAgent', ...)
   ↓
5. processManager.launchClaudeCode()
   ├── 创建子进程 (script + claude)
   ├── 调用 onProcessStart(info)
   │   ├── agentManager.createAgent(...) → 发送 agentCreated 事件
   │   └── postTerminalEvent({ type: 'terminal-session', ... }) → TerminalPanel 自动打开
   └── 调用 onProcessOutput(id, chunk)
       └── postTerminalEvent({ type: 'terminal-output', ... }) → xterm 显示输出
   ↓
6. Renderer:
   ├── useExtensionMessages 收到 agentCreated → OfficeCanvas 显示小人
   └── useTerminalSessions 收到 terminal-session → TerminalPanel 打开并连接 xterm
```

## 当前问题排查

### 问题：点击 +Agent 无反应

检查清单：

1. [ ] preload.ts 是否暴露了 `launchAgent` API ✓
2. [ ] main process 是否注册了 `launchAgent` handler ✓
3. [ ] `processManager.launchClaudeCode` 是否被调用
4. [ ] `[IPC] launchAgent` 日志是否出现在终端

调试命令：

```bash
cd app && npm run dev
# 观察终端输出
```

### 问题：TerminalPanel 不显示

检查清单：

1. [ ] TerminalPanel 使用 xterm.js 渲染 ✓
2. [ ] `terminal-session` 事件是否被发送
3. [ ] `setActiveSessionId` 是否被调用
4. [ ] `onNewSession` 回调是否打开面板

## 文件路径

```
pixel-agents/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts          # 主入口、窗口管理
│   │   │   ├── processManager.ts # Claude Code 进程
│   │   │   ├── ptyManager.ts     # PTY 终端
│   │   │   ├── agentManager.ts   # Agent 状态/JSONL
│   │   │   ├── tray.ts           # 系统托盘
│   │   │   └── menu.ts           # 应用菜单
│   │   ├── preload.ts            # IPC 桥接
│   │   └── preload.d.ts          # 类型定义
│   └── dist/                     # 编译输出
│
├── webview-ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TerminalPanel.tsx # xterm.js 终端面板
│   │   │   ├── BottomToolbar.tsx # +Agent 按钮
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useTerminalSessions.ts # Terminal 状态管理
│   │   │   ├── useExtensionMessages.ts # IPC 消息处理
│   │   │   └── ...
│   │   └── ...
│   └── dist/                     # 编译输出
│
└── dist/                         # 最终打包
```

## VS Code Extension vs Electron App

| 功能       | VS Code                          | Electron                            |
| ---------- | -------------------------------- | ----------------------------------- |
| Agent 启动 | `vscode.window.createTerminal()` | `processManager.launchClaudeCode()` |
| PTY 终端   | VS Code 内置                     | `ptyManager.spawn()` + xterm.js     |
| 消息传递   | `webview.postMessage()`          | `webContents.send()`                |
| Agent 状态 | `workspaceState`                 | `agentManager` in-memory            |

## 关键差异

### 1. Claude Code 进程 vs PTY

- **Claude Code 进程**: 由 `processManager` 管理，输出 JSONL transcript
- **PTY 终端**: 由 `ptyManager` 管理，用于交互式 shell 输入/输出

### 2. xterm.js 渲染

TerminalPanel 使用 xterm.js：

- 接收 `terminal:event` 事件
- 将输出写入 xterm 实例
- 键盘输入通过 `sendTerminalInput` 发送

### 3. Agent 小人显示

由 `agentCreated` 事件触发：

- `agentManager.createAgent()` 创建状态
- 发送 `agentCreated` 事件到 renderer
- OfficeCanvas 根据 agent 状态渲染小人
