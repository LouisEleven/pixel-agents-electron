export const SUPPORTED_LOCALES = {
  en: 'English',
  zh: '中文',
} as const;

export type Locale = keyof typeof SUPPORTED_LOCALES;

export type TranslationKey =
  | 'app.loading'
  | 'app.rotateHint'
  | 'app.hooksTooltipTitle'
  | 'app.hooksTooltipBody'
  | 'app.viewMore'
  | 'app.hooksModalTitle'
  | 'app.hooksModalIntro'
  | 'app.hooksModalPointPermissions'
  | 'app.hooksModalPointCompletion'
  | 'app.hooksModalPointSound'
  | 'app.hooksModalDescription'
  | 'app.hooksModalGotIt'
  | 'app.hooksModalDisableHint'
  | 'tabs.office'
  | 'tabs.terminal'
  | 'toolbar.newAgent'
  | 'toolbar.skipPermissions'
  | 'toolbar.layout'
  | 'toolbar.layoutTitle'
  | 'toolbar.settings'
  | 'toolbar.settingsTitle'
  | 'settings.title'
  | 'settings.openSessionsFolder'
  | 'settings.exportLayout'
  | 'settings.importLayout'
  | 'settings.addAssetDirectory'
  | 'settings.soundNotifications'
  | 'settings.watchAllSessions'
  | 'settings.instantDetection'
  | 'settings.alwaysShowLabels'
  | 'settings.debugView'
  | 'settings.language'
  | 'settings.languageEnglish'
  | 'settings.languageChinese'
  | 'zoom.in'
  | 'zoom.out'
  | 'version.updatedTo'
  | 'version.seeWhatsNew'
  | 'version.seeWhatsNewExclamation'
  | 'terminal.title'
  | 'terminal.open'
  | 'terminal.empty'
  | 'terminal.waiting'
  | 'terminal.inputPlaceholder'
  | 'terminal.send'
  | 'edit.undo'
  | 'edit.undoTitle'
  | 'edit.redo'
  | 'edit.redoTitle'
  | 'edit.save'
  | 'edit.saveTitle'
  | 'edit.reset'
  | 'edit.resetTitle'
  | 'edit.resetConfirm'
  | 'edit.yes'
  | 'edit.no'
  | 'editor.furniture'
  | 'editor.furnitureTitle'
  | 'editor.floor'
  | 'editor.floorTitle'
  | 'editor.wall'
  | 'editor.wallTitle'
  | 'editor.erase'
  | 'editor.eraseTitle'
  | 'editor.color'
  | 'editor.colorFloorTitle'
  | 'editor.pick'
  | 'editor.pickFloorTitle'
  | 'editor.colorWallTitle'
  | 'editor.wallOption'
  | 'editor.pickFurnitureTitle'
  | 'editor.clear'
  | 'editor.clearTitle'
  | 'colorPicker.colorize';

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    'app.loading': 'Loading...',
    'app.rotateHint': 'Rotate (R)',
    'app.hooksTooltipTitle': 'Instant Detection Active',
    'app.hooksTooltipBody': 'Your agents now respond in real-time.',
    'app.viewMore': 'View more',
    'app.hooksModalTitle': 'Instant Detection is ON',
    'app.hooksModalIntro': 'Your Pixel Agents office now reacts in real-time:',
    'app.hooksModalPointPermissions': 'Permission prompts appear instantly',
    'app.hooksModalPointCompletion': 'Turn completions detected the moment they happen',
    'app.hooksModalPointSound': 'Sound notifications play immediately',
    'app.hooksModalDescription':
      'This works through Claude Code Hooks, small event listeners that notify Pixel Agents whenever something happens in your Claude sessions.',
    'app.hooksModalGotIt': 'Got it',
    'app.hooksModalDisableHint': 'To disable, go to Settings > Instant Detection',
    'tabs.office': 'Office',
    'tabs.terminal': 'Terminal',
    'toolbar.newAgent': '+ Agent',
    'toolbar.skipPermissions': 'Skip permissions mode',
    'toolbar.layout': 'Layout',
    'toolbar.layoutTitle': 'Edit office layout',
    'toolbar.settings': 'Settings',
    'toolbar.settingsTitle': 'Settings',
    'settings.title': 'Settings',
    'settings.openSessionsFolder': 'Open Sessions Folder',
    'settings.exportLayout': 'Export Layout',
    'settings.importLayout': 'Import Layout',
    'settings.addAssetDirectory': 'Add Asset Directory',
    'settings.soundNotifications': 'Sound Notifications',
    'settings.watchAllSessions': 'Watch All Sessions',
    'settings.instantDetection': 'Instant Detection (Hooks)',
    'settings.alwaysShowLabels': 'Always Show Labels',
    'settings.debugView': 'Debug View',
    'settings.language': 'Language',
    'settings.languageEnglish': 'English',
    'settings.languageChinese': '中文',
    'zoom.in': 'Zoom in (Ctrl+Scroll)',
    'zoom.out': 'Zoom out (Ctrl+Scroll)',
    'version.updatedTo': 'Updated to v{version}!',
    'version.seeWhatsNew': "See what's new",
    'version.seeWhatsNewExclamation': "See what's new!",
    'terminal.title': 'Terminal',
    'terminal.open': 'Terminal',
    'terminal.empty': 'No terminal sessions yet.',
    'terminal.waiting': 'Waiting for terminal output...',
    'terminal.inputPlaceholder': 'Type and press send…',
    'terminal.send': 'Send',
    'edit.undo': 'Undo',
    'edit.undoTitle': 'Undo (Ctrl+Z)',
    'edit.redo': 'Redo',
    'edit.redoTitle': 'Redo (Ctrl+Y)',
    'edit.save': 'Save',
    'edit.saveTitle': 'Save layout',
    'edit.reset': 'Reset',
    'edit.resetTitle': 'Reset to last saved layout',
    'edit.resetConfirm': 'Reset?',
    'edit.yes': 'Yes',
    'edit.no': 'No',
    'editor.furniture': 'Furniture',
    'editor.furnitureTitle': 'Place furniture',
    'editor.floor': 'Floor',
    'editor.floorTitle': 'Paint floor tiles',
    'editor.wall': 'Wall',
    'editor.wallTitle': 'Paint walls (click to toggle)',
    'editor.erase': 'Erase',
    'editor.eraseTitle': 'Erase tiles to void',
    'editor.color': 'Color',
    'editor.colorFloorTitle': 'Adjust floor color',
    'editor.pick': 'Pick',
    'editor.pickFloorTitle': 'Pick floor pattern + color from existing tile',
    'editor.colorWallTitle': 'Adjust wall color',
    'editor.wallOption': 'Wall {index}',
    'editor.pickFurnitureTitle': 'Pick furniture type from placed item',
    'editor.clear': 'Clear',
    'editor.clearTitle': 'Remove color (restore original)',
    'colorPicker.colorize': 'Colorize',
  },
  zh: {
    'app.loading': '加载中...',
    'app.rotateHint': '旋转（R）',
    'app.hooksTooltipTitle': '即时检测已启用',
    'app.hooksTooltipBody': '你的 Agent 现在会实时响应。',
    'app.viewMore': '查看更多',
    'app.hooksModalTitle': '即时检测已开启',
    'app.hooksModalIntro': '你的 Pixel Agents 办公室现在会实时响应：',
    'app.hooksModalPointPermissions': '权限提示会立刻出现',
    'app.hooksModalPointCompletion': '回合完成会在发生瞬间被检测到',
    'app.hooksModalPointSound': '声音通知会立即播放',
    'app.hooksModalDescription':
      '这依赖 Claude Code Hooks，它们是一些轻量事件监听器，会在 Claude 会话发生变化时通知 Pixel Agents。',
    'app.hooksModalGotIt': '知道了',
    'app.hooksModalDisableHint': '如需关闭，请前往"设置" > "即时检测"',
    'tabs.office': '办公室',
    'tabs.terminal': '人物',
    'toolbar.newAgent': '+ Agent',
    'toolbar.skipPermissions': '跳过权限模式',
    'toolbar.layout': '布局',
    'toolbar.layoutTitle': '编辑办公室布局',
    'toolbar.settings': '设置',
    'toolbar.settingsTitle': '设置',
    'settings.title': '设置',
    'settings.openSessionsFolder': '打开会话文件夹',
    'settings.exportLayout': '导出布局',
    'settings.importLayout': '导入布局',
    'settings.addAssetDirectory': '添加素材目录',
    'settings.soundNotifications': '声音通知',
    'settings.watchAllSessions': '监视全部会话',
    'settings.instantDetection': '即时检测（Hooks）',
    'settings.alwaysShowLabels': '始终显示标签',
    'settings.debugView': '调试视图',
    'settings.language': '语言',
    'settings.languageEnglish': 'English',
    'settings.languageChinese': '中文',
    'zoom.in': '放大（Ctrl+滚轮）',
    'zoom.out': '缩小（Ctrl+滚轮）',
    'version.updatedTo': '已更新到 v{version}！',
    'version.seeWhatsNew': '查看更新内容',
    'version.seeWhatsNewExclamation': '查看更新内容！',
    'terminal.title': '人物终端',
    'terminal.open': '人物终端',
    'terminal.empty': '还没有人物会话。',
    'terminal.waiting': '等待人物响应中...',
    'terminal.inputPlaceholder': '输入内容后发送…',
    'terminal.send': '发送',
    'edit.undo': '撤销',
    'edit.undoTitle': '撤销（Ctrl+Z）',
    'edit.redo': '重做',
    'edit.redoTitle': '重做（Ctrl+Y）',
    'edit.save': '保存',
    'edit.saveTitle': '保存布局',
    'edit.reset': '重置',
    'edit.resetTitle': '重置为上次保存的布局',
    'edit.resetConfirm': '确认重置？',
    'edit.yes': '是',
    'edit.no': '否',
    'editor.furniture': '家具',
    'editor.furnitureTitle': '放置家具',
    'editor.floor': '地板',
    'editor.floorTitle': '绘制地板',
    'editor.wall': '墙面',
    'editor.wallTitle': '绘制墙面（点击切换）',
    'editor.erase': '擦除',
    'editor.eraseTitle': '将地块擦除为空白',
    'editor.color': '颜色',
    'editor.colorFloorTitle': '调整地板颜色',
    'editor.pick': '拾取',
    'editor.pickFloorTitle': '从现有地块拾取地板样式和颜色',
    'editor.colorWallTitle': '调整墙面颜色',
    'editor.wallOption': '墙面 {index}',
    'editor.pickFurnitureTitle': '从已放置家具中拾取类型',
    'editor.clear': '清除',
    'editor.clearTitle': '移除颜色（恢复原始外观）',
    'colorPicker.colorize': '着色',
  },
};
