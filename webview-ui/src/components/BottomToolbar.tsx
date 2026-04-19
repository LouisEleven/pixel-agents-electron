import { useEffect, useRef, useState } from 'react';

import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { useI18n } from '../i18n.tsx';

import { CreateAgentModal, type CreateAgentConfig } from './CreateAgentModal.js';
import { Button } from './ui/Button.js';
import { Dropdown, DropdownItem } from './ui/Dropdown.js';

interface BottomToolbarProps {
  isEditMode: boolean;
  onOpenClaude: () => void;
  onToggleEditMode: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  workspaceFolders: WorkspaceFolder[];
}

export function BottomToolbar({
  isEditMode,
  onOpenClaude,
  onToggleEditMode,
  isSettingsOpen,
  onToggleSettings,
  workspaceFolders,
}: BottomToolbarProps) {
  const { t } = useI18n();
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isCustomMenuOpen, setIsCustomMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const folderPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFolderPickerOpen && !isCustomMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setIsFolderPickerOpen(false);
        setIsCustomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isFolderPickerOpen, isCustomMenuOpen]);

  const hasMultipleFolders = workspaceFolders.length > 1;

  const openClaude = async (config?: CreateAgentConfig) => {
    if (window.electronAPI?.launchAgent) {
      const agentId = await window.electronAPI.launchAgent({
        cwd: config?.cwd,
        name: config?.name,
        palette: config?.palette,
        hueShift: config?.hueShift,
      });
      if (agentId && window.electronAPI?.spawnTerminal) {
        await window.electronAPI.spawnTerminal({ cwd: config?.cwd });
      }
      return;
    }
    if (!config) {
      onOpenClaude();
      return;
    }
    window.electronAPI?.launchAgent?.({
      cwd: config.cwd,
      name: config.name,
      palette: config.palette,
      hueShift: config.hueShift,
    });
  };

  const handleAgentClick = () => {
    setIsCustomMenuOpen(false);
    if (hasMultipleFolders) {
      setIsFolderPickerOpen((v) => !v);
    } else {
      onOpenClaude();
    }
  };

  const handleAgentHover = () => {
    if (!isFolderPickerOpen) {
      setIsCustomMenuOpen(true);
    }
  };

  const handleAgentLeave = () => {
    if (!isFolderPickerOpen) {
      setIsCustomMenuOpen(false);
    }
  };

  const handleFolderSelect = (folder: WorkspaceFolder) => {
    setIsFolderPickerOpen(false);
    void openClaude({
      cwd: folder.path,
      name: folder.name,
      palette: 0,
      hueShift: 0,
    });
  };

  const handleCustomCreate = () => {
    setIsCustomMenuOpen(false);
    setIsCreateModalOpen(true);
  };

  return (
    <>
      <div className="absolute bottom-10 left-10 z-20 flex items-center gap-4 pixel-panel p-4">
        <div
          ref={folderPickerRef}
          className="relative"
          onMouseEnter={handleAgentHover}
          onMouseLeave={handleAgentLeave}
        >
          <Button
            variant="accent"
            onClick={handleAgentClick}
            className={
              isFolderPickerOpen || isCustomMenuOpen
                ? 'bg-accent-bright'
                : 'bg-accent hover:bg-accent-bright'
            }
          >
            {t('toolbar.newAgent')}
          </Button>
          <Dropdown isOpen={isCustomMenuOpen}>
            <DropdownItem onClick={handleCustomCreate}>
              {t('toolbar.customCreate')} <span className="text-xs text-accent-bright">♥</span>
            </DropdownItem>
          </Dropdown>
          <Dropdown isOpen={isFolderPickerOpen} className="min-w-128">
            {workspaceFolders.map((folder) => (
              <DropdownItem
                key={folder.path}
                onClick={() => handleFolderSelect(folder)}
                className="text-base"
              >
                {folder.name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
        <Button
          variant={isEditMode ? 'active' : 'default'}
          onClick={onToggleEditMode}
          title={t('toolbar.layoutTitle')}
        >
          {t('toolbar.layout')}
        </Button>
        <Button
          variant={isSettingsOpen ? 'active' : 'default'}
          onClick={onToggleSettings}
          title={t('toolbar.settingsTitle')}
        >
          {t('toolbar.settings')}
        </Button>
      </div>

      <CreateAgentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={(config) => {
          void openClaude(config);
        }}
        workspaceFolders={workspaceFolders}
      />
    </>
  );
}
