# Pixel Agents Electron 迁移计划

## 背景

当前仓库已经同时包含两条宿主路线：

- `src/` + `webview-ui/`：VS Code 扩展版，功能最完整
- `app/`：独立 Electron 应用，已完成基础宿主搭建与打包接入，但仍是 MVP

这份计划文档的目标不是重新定义一个全新项目，而是基于当前仓库现状，明确 Electron 迁移已经完成了什么、还缺什么、下一步应该按什么顺序推进。

## 当前状态总结

### 已完成

- `app/` 已具备 Electron 应用骨架：窗口、菜单、托盘、通知、打包配置
- 主进程已能直接启动 Claude Code 子进程，并按 session id 等待 JSONL transcript 文件出现
- Electron 侧已具备基础 `AgentManager`，可将 transcript 解析为 agent/tool/status 事件
- preload IPC 桥已接通，renderer 可通过 `window.electronAPI` 与主进程通信
- renderer 已具备基础办公室画布与 agent 可视化能力
- `electron-builder` 已接入，构建会进入正式打包阶段

### 未完成

- Electron 版还没有和扩展版能力对齐
- hooks/server 主链路还没有成为 Electron 的稳定主路径
- 布局编辑器、设置、外部资产目录、完整持久化等关键业务能力仍未迁完
- 当前 renderer 仍是简化版实现，不是 `webview-ui/` 的完整复用
- 打包链路受本机 Electron 缓存权限影响，产物尚未稳定验证

## 迁移目标

Electron 迁移完成的判定标准分为两层。

### 最低完成线

Electron 应用可以稳定完成以下闭环：

1. 启动应用
2. 创建 Claude Code agent
3. 定位并解析 transcript / hook 事件
4. 正确显示 active / waiting / tool / subagent 状态
5. 稳定打包并产出可运行应用

### 完整完成线

Electron 版具备与 VS Code 扩展版接近的核心体验：

- hooks 模式稳定可用
- 具备布局编辑与布局持久化
- 具备设置、通知、声音、调试视图
- 支持外部资产目录与完整资产系统
- 支持子代理可视化与权限提示完整链路
- 尽可能复用 `webview-ui/` 的成熟业务逻辑，而不是长期维护一套分叉实现

## 迁移原则

### 1. 宿主迁移优先于新功能

当前重点是把已有产品能力迁到 Electron，而不是为 Electron 版增加额外特性。

### 2. 优先复用成熟逻辑

能从以下位置复用的，优先复用，不要在 `app/` 里重新发明一套：

- `server/`
- `shared/`
- `webview-ui/src/office/`
- `src/` 中与 VS Code API 无强耦合的逻辑

### 3. 事件模型必须统一

扩展版和 Electron 版不能长期维护两套不同语义的 agent/tool/status 事件。协议应逐步收敛到共享定义。

### 4. 打包问题不等于架构失败

当前打包阻塞主要是本机缓存权限问题，不应误判为 Electron 迁移失败。

## 分阶段计划

## Phase 0：稳定当前打包与运行闭环

### 目标

先把当前 `app/` 的 MVP 跑稳，确保它不是“能编译但不能交付”的状态。

### 任务

- 修复本机或构建环境中的 Electron 缓存权限问题，稳定通过：
  - `cd app && npm run pack`
  - `cd app && npm run dist:mac`
- 验证产物可以正常：
  - 启动
  - 隐藏到托盘
  - 再次唤起窗口
  - 创建 agent
  - 退出应用并清理 Claude 子进程
- 检查 `app/assets/`、托盘图标、打包后资源路径是否正确
- 确认 `app/bin/` 与 `dist/bin/` 产物是否符合预期

### 完成标准

`app/` 可以稳定打出可运行的 macOS 包，且最小主流程可用。

## Phase 1：补齐宿主核心链路

### 目标

让 Electron 成为一个稳定的 Claude 宿主，而不是只是一个能打开窗口的 demo。

### 任务

#### 1.1 进程管理收口

- 对齐 `app/src/main/processManager.ts`
- 检查 Claude 启动参数、cwd 传递、session id 生成逻辑
- 明确以下场景的行为：
  - agent 主动退出
  - Claude 进程异常崩溃
  - 关闭窗口但不退出应用
  - 退出应用时批量清理所有进程
- 检查是否真的需要始终传 `--dangerously-skip-permissions`

#### 1.2 Transcript 监听稳定化

- 对齐 JSONL 路径规则与扩展版逻辑
- 保留部分行缓冲、append-only 文件读取、tool done 延迟等成熟细节
- 验证以下 transcript 行为：
  - `assistant.tool_use`
  - `user.tool_result`
  - `system.turn_duration`
  - 文本-only turn
  - `/clear` 后新文件切换

#### 1.3 生命周期与事件清理

- 检查 agent 创建/关闭后各类 timer 是否完整释放
- 确保 renderer 不会收到陈旧 agent 事件
- 明确 `existingAgents` 的初始化行为与顺序

### 完成标准

Electron 在不依赖 VS Code 的情况下，可以稳定运行多个 agent，会话和状态不会明显错乱。

## Phase 2：接入 hooks 主链路

### 目标

让 Electron 版不再主要依赖 JSONL 轮询启发式，而是接入扩展版已经成熟的 hooks/server 模式。

### 任务

- 评估 `server/` 是否可以直接被 Electron 主进程复用
- 迁移或复用：
  - 本地 HTTP server
  - hook installer
  - `~/.pixel-agents/server.json` 发现逻辑
  - `~/.pixel-agents/hooks/` 中的 hook 产物管理
- 让 Electron 正确处理关键 hook 事件：
  - `SessionStart`
  - `SessionEnd`
  - `Stop`
  - `PermissionRequest`
  - `Notification`
  - `UserPromptSubmit`
  - `PreToolUse`
  - `PostToolUse`
  - `PostToolUseFailure`
  - `SubagentStart`
  - `SubagentStop`
- 明确 hooks 与 JSONL 的职责边界：
  - hooks 负责时序和状态
  - JSONL 负责工具详情和渲染内容

### 完成标准

Electron 中 agent 的 waiting / active / permission / subagent 时序主要由 hooks 决定，轮询逻辑退居辅助角色。

## Phase 3：统一事件协议与共享层

### 目标

避免扩展版和 Electron 版长期平行演化。

### 任务

- 统一 agent 事件协议：
  - `agentCreated`
  - `agentClosed`
  - `agentToolStart`
  - `agentToolDone`
  - `agentToolsClear`
  - `agentStatus`
  - `existingAgents`
- 将共享类型尽量放入 `shared/` 或新的宿主无关模块
- 审视 `app/src/main/agentManager.ts` 与扩展侧 watcher/parser 是否可抽公共层
- 为 renderer 约束统一输入模型，避免 Electron 和 webview 各自维护不同 payload

### 完成标准

扩展版和 Electron 版的 agent 语义基本一致，共享逻辑占比明显提升。

## Phase 4：迁移 renderer 业务能力

### 目标

让 Electron 不只是“简化办公室视图”，而是逐步具备扩展版的核心交互体验。

### 任务

#### 4.1 优先复用 `webview-ui`

- 盘点 `app/src/renderer/` 与 `webview-ui/src/office/` 的重复实现
- 优先迁移或复用以下成熟模块：
  - office state
  - game loop
  - renderer
  - layout serializer
  - tile map
  - character FSM
  - tool overlay

#### 4.2 补齐基础交互

- 修复 canvas resize / DPR / pan / zoom
- 完成世界坐标命中测试
- 补齐选中态、camera follow、取消选中等细节

#### 4.3 补齐状态展示

- waiting bubble
- permission bubble
- tool 状态标签
- agent 完成通知
- 子代理显示与父子联动

### 完成标准

Electron renderer 的核心表现与扩展版接近，不再只是早期 MVP。

## Phase 5：迁移布局编辑器与持久化

### 目标

把 Pixel Agents 的核心产品体验之一——办公室布局编辑——迁入 Electron。

### 任务

#### 5.1 布局读写

- 复用布局数据结构与序列化逻辑
- 在 Electron 中兼容使用：
  - `~/.pixel-agents/layout.json`
- 明确 Electron 和扩展是否共享同一布局文件

#### 5.2 编辑器功能迁移

- 迁移 floor/wall/erase/furniture/select/pick 工具
- 迁移 undo/redo/save/reset
- 迁移 seat assignment 相关逻辑
- 迁移 ghost placement、rotate/toggle state 等编辑器行为

#### 5.3 导入导出

- 支持导出 layout
- 支持导入 layout
- 支持默认 layout 恢复

### 完成标准

Electron 版具备与扩展版接近的布局编辑和布局持久化能力。

## Phase 6：迁移设置、资产和通知能力

### 目标

补齐“不是办公室渲染本身，但属于完整产品体验”的周边业务能力。

### 任务

#### 6.1 设置

- sound enabled
- hooks enabled
- debug view
- external asset directories

#### 6.2 配置持久化

- 复用或兼容：
  - `~/.pixel-agents/config.json`
- 保持配置格式与扩展版一致，减少双端冲突

#### 6.3 资产系统

- 对齐 `webview-ui/public/assets/` 的加载方式
- 迁移 furniture catalog、rotation groups、state groups、surface/wall placement 规则
- 支持 external asset directories 覆盖 bundled assets

#### 6.4 声音与通知

- 迁移 turn complete / waiting 通知
- 迁移音效开关与浏览器音频解锁逻辑的 Electron 适配

### 完成标准

Electron 版具备和扩展版相近的设置、资产和提醒体验。

## Phase 7：桌面体验收尾

### 目标

把 Electron 版从“功能能跑”提升到“像一个完整桌面应用”。

### 任务

- 完善应用菜单行为
- 完善托盘菜单与图标资源
- 明确“关闭窗口”和“退出应用”的差异
- 视需要增加：
  - 打开日志目录
  - 打开配置目录
  - 重新加载 UI
  - 切换开发者工具
- 补齐 About / 版本展示等桌面应用基础项

### 完成标准

Electron 版具备完整、稳定、符合桌面应用预期的壳层体验。

## Phase 8：测试与发布准备

### 目标

降低 Electron 迁移后长期维护成本。

### 任务

- 为 `app/` 增加最小测试面：
  - process manager
  - transcript 解析
  - agent 状态转换
  - IPC smoke test
- 增加最小手工验证清单：
  - 创建 agent
  - 等待状态
  - 工具状态
  - 子代理
  - 关闭/退出
  - 打包产物启动
- 根据产物分发需求补齐：
  - 签名
  - notarization
  - 发布脚本

### 完成标准

Electron 版具备基础测试保障和可重复发布流程。

## 优先级排序

### P0

- Phase 0：稳定打包与运行闭环
- Phase 1：补齐宿主核心链路
- Phase 2：接入 hooks 主链路

### P1

- Phase 3：统一事件协议与共享层
- Phase 4：迁移 renderer 核心业务能力
- Phase 5：迁移布局编辑器与持久化

### P2

- Phase 6：迁移设置、资产和通知能力
- Phase 7：桌面体验收尾
- Phase 8：测试与发布准备

## 建议的执行顺序

建议严格按下面顺序推进：

1. 先确认 Electron 产物能稳定打包和启动
2. 再让宿主主链路稳定
3. 再把 hooks 接进来
4. 然后统一协议和共享层
5. 最后再迁移布局编辑、设置、资产等高层业务能力

如果在 hooks 之前就大量迁移 UI 细节，很容易在后续状态模型变化时返工。

## 里程碑定义

### Milestone A：Electron MVP 可交付

满足以下条件：

- 可打包
- 可启动
- 可创建 agent
- 可显示基础状态
- 可关闭和退出

### Milestone B：Electron 状态链路可靠

满足以下条件：

- hooks 接入完成
- waiting / permission / subagent 行为稳定
- transcript 与 hooks 责任边界清晰

### Milestone C：Electron 核心体验对齐

满足以下条件：

- renderer 体验接近扩展版
- 布局编辑与持久化接通
- 设置、资产、通知接通

### Milestone D：Electron 可作为正式主线候选

满足以下条件：

- 打包与发布稳定
- 基础测试覆盖完成
- 关键产品能力对齐完成
- 双宿主共享层清晰，维护成本可控

## 当前建议

如果只做一件事，优先完成下面三项：

1. 稳定 `app/` 打包与启动
2. 接入 hooks 主链路
3. 将 Electron renderer 从临时 MVP 逐步替换为对 `webview-ui` 逻辑的复用

这三项完成后，Electron 路线才算真正进入“可以持续推进”的状态，而不是停留在演示级骨架。
