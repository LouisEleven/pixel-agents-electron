import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import log from 'electron-log';

let tray: Tray | null = null;

export function createTray(
  onShowWindow: () => void,
  onNewAgent: () => void,
  onQuit: () => void,
): Tray {
  // Create a simple tray icon (16x16)
  const iconPath = path.join(__dirname, '..', 'renderer', 'assets', 'icon.png');
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Fallback: create a simple colored icon
      icon = createFallbackIcon();
    }
  } catch {
    icon = createFallbackIcon();
  }

  tray = new Tray(icon);
  tray.setToolTip('Pixel Agents');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Pixel Agents',
      click: onShowWindow,
    },
    {
      label: 'New Agent',
      click: onNewAgent,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: onQuit,
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    onShowWindow();
  });

  tray.on('double-click', () => {
    onShowWindow();
  });

  log.info('[Tray] Created system tray');
  return tray;
}

function createFallbackIcon(): Electron.NativeImage {
  // Create a simple 16x16 icon programmatically
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  // Fill with teal color (#4ecdc4)
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = 0x4e; // R
    canvas[i * 4 + 1] = 0xcd; // G
    canvas[i * 4 + 2] = 0xc4; // B
    canvas[i * 4 + 3] = 0xff; // A
  }

  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
    log.info('[Tray] Destroyed system tray');
  }
}
