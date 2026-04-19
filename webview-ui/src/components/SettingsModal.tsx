import { useState } from 'react';

import { type Locale, useI18n } from '../i18n.tsx';
import { isSoundEnabled, setSoundEnabled } from '../notificationSound.js';
import { Button } from './ui/Button.js';
import { Checkbox } from './ui/Checkbox.js';
import { MenuItem } from './ui/MenuItem.js';
import { Modal } from './ui/Modal.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  externalAssetDirectories: string[];
  watchAllSessions: boolean;
  onToggleWatchAllSessions: () => void;
  hooksEnabled: boolean;
  onToggleHooksEnabled: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  externalAssetDirectories,
  watchAllSessions,
  onToggleWatchAllSessions,
  hooksEnabled,
  onToggleHooksEnabled,
}: SettingsModalProps) {
  const { locale, setLocale, t } = useI18n();
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <MenuItem
        onClick={() => {
          window.electronAPI?.openSessionsFolder?.();
          onClose();
        }}
      >
        {t('settings.openSessionsFolder')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          window.electronAPI?.exportLayout?.();
          onClose();
        }}
      >
        {t('settings.exportLayout')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          window.electronAPI?.importLayout?.();
          onClose();
        }}
      >
        {t('settings.importLayout')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          window.electronAPI?.addExternalAssetDirectory?.();
          onClose();
        }}
      >
        {t('settings.addAssetDirectory')}
      </MenuItem>
      {externalAssetDirectories.map((dir) => (
        <div key={dir} className="flex items-center justify-between py-4 px-10 gap-8">
          <span
            className="text-xs text-text-muted overflow-hidden text-ellipsis whitespace-nowrap"
            title={dir}
          >
            {dir.split(/[/\\]/).pop() ?? dir}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.electronAPI?.removeExternalAssetDirectory?.(dir)}
            className="shrink-0"
          >
            x
          </Button>
        </div>
      ))}
      <div className="px-10 py-6 flex items-center justify-between gap-8">
        <span>{t('settings.language')}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="bg-bg border-2 border-border text-text px-8 py-4 rounded-none outline-none"
        >
          <option value="en">{t('settings.languageEnglish')}</option>
          <option value="zh">{t('settings.languageChinese')}</option>
        </select>
      </div>
      <Checkbox
        label={t('settings.soundNotifications')}
        checked={soundLocal}
        onChange={() => {
          const newVal = !isSoundEnabled();
          setSoundEnabled(newVal);
          setSoundLocal(newVal);
          window.electronAPI?.setSoundEnabled?.(newVal);
        }}
      />
      <Checkbox
        label={t('settings.watchAllSessions')}
        checked={watchAllSessions}
        onChange={onToggleWatchAllSessions}
      />
      <Checkbox
        label={t('settings.instantDetection')}
        checked={hooksEnabled}
        onChange={onToggleHooksEnabled}
      />
      <Checkbox
        label={t('settings.alwaysShowLabels')}
        checked={alwaysShowOverlay}
        onChange={onToggleAlwaysShowOverlay}
      />
      <Checkbox
        label={t('settings.debugView')}
        checked={isDebugMode}
        onChange={onToggleDebugMode}
      />
    </Modal>
  );
}
