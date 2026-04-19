# App Migration Plan

- [completed] 1. Audit webview-ui entry/runtime dependencies
- [completed] 2. Map extension message protocol to Electron IPC
- [completed] 3. Load webview-ui build as Electron renderer
- [completed] 4. Add acquireVsCodeApi-compatible preload bridge
- [completed] 5. Send initial assets/layout/settings from main process
- [completed] 6. Forward agent events in webview message shape
- [completed] 7. Fix renderer asset path resolution and validate rendering
- [completed] 8. Fix `+ Agent` launch flow and error feedback
- [completed] 9. Add app renderer i18n with Chinese support
- [completed] 10. Set default zoom to 6x
- [completed] 11. Replace pipe launch with PTY terminal sessions
- [completed] 12. Expose terminal IPC bridge in preload
- [completed] 13. Render in-app terminal panel in webview-ui
- [in_progress] 14. Validate runtime bridge, terminal launch, process/agent id sync, and visible feedback
