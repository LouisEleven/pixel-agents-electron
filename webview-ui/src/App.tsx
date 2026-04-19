import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentInfoModal } from './components/AgentInfoModal.js';
import { BottomToolbar } from './components/BottomToolbar.js';
import { vscode } from './vscodeApi.js';
import { DebugView } from './components/DebugView.js';
import { EditActionBar } from './components/EditActionBar.js';
import { MigrationNotice } from './components/MigrationNotice.js';
import { SettingsModal } from './components/SettingsModal.js';
import { TerminalPanel } from './components/TerminalPanel.js';
import { Tooltip } from './components/Tooltip.js';
import { Modal } from './components/ui/Modal.js';
import { ZoomControls } from './components/ZoomControls.js';
import { useEditorActions } from './hooks/useEditorActions.js';
import { useEditorKeyboard } from './hooks/useEditorKeyboard.js';
import { useExtensionMessages } from './hooks/useExtensionMessages.js';
import { useTerminalSessions } from './hooks/useTerminalSessions.js';
import { useI18n } from './i18n.tsx';
import { OfficeCanvas } from './office/components/OfficeCanvas.js';
import { ToolOverlay } from './office/components/ToolOverlay.js';
import { EditorState } from './office/editor/editorState.js';
import { EditorToolbar } from './office/editor/EditorToolbar.js';
import { OfficeState } from './office/engine/officeState.js';
import { isRotatable } from './office/layout/furnitureCatalog.js';
import { EditTool } from './office/types.js';
import { isBrowserRuntime } from './runtime.js';

// Game state lives outside React — updated imperatively by message handlers
const officeStateRef = { current: null as OfficeState | null };
const editorState = new EditorState();

function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState();
  }
  return officeStateRef.current;
}

function App() {
  const { t } = useI18n();

  // Browser runtime (dev or static dist): dispatch mock messages after the
  // useExtensionMessages listener has been registered.
  useEffect(() => {
    if (isBrowserRuntime) {
      void import('./browserMock.js').then(({ dispatchMockMessages }) => dispatchMockMessages());
    }
  }, []);

  const editor = useEditorActions(getOfficeState, editorState);

  const isEditDirty = useCallback(
    () => editor.isEditMode && editor.isDirty,
    [editor.isEditMode, editor.isDirty],
  );

  const {
    agents,
    agentNames,
    agentPersonaPrompts,
    agentRolePrompts,
    selectedAgent,
    agentTools,
    agentStatuses,
    agentThoughts,
    subagentTools,
    subagentCharacters,
    layoutReady,
    layoutWasReset,
    loadedAssets,
    workspaceFolders,
    externalAssetDirectories,
    watchAllSessions,
    setWatchAllSessions,
    alwaysShowLabels,
    hooksEnabled,
    setHooksEnabled,
    hooksInfoShown,
  } = useExtensionMessages(getOfficeState, editor.setLastSavedLayout, isEditDirty);

  // Show migration notice once layout reset is detected
  const [migrationNoticeDismissed, setMigrationNoticeDismissed] = useState(false);
  const showMigrationNotice = layoutWasReset && !migrationNoticeDismissed;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHooksInfoOpen, setIsHooksInfoOpen] = useState(false);
  const [hooksTooltipDismissed, setHooksTooltipDismissed] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [alwaysShowOverlay, setAlwaysShowOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<'office' | 'terminal'>('office');
  const [inspectedAgentId, setInspectedAgentId] = useState<number | null>(null);

  const { sessions, activeSession, activeSessionId, setActiveSessionId } = useTerminalSessions(
    () => setActiveTab('terminal'),
  );

  const terminalTabs = sessions.map((session) => ({
    id: session.id,
    label: agentNames[session.id] || session.folderName || `Agent ${session.id}`,
  }));

  // Sync alwaysShowOverlay from persisted settings
  useEffect(() => {
    setAlwaysShowOverlay(alwaysShowLabels);
  }, [alwaysShowLabels]);

  const handleToggleDebugMode = useCallback(() => setIsDebugMode((prev) => !prev), []);
  const handleToggleAlwaysShowOverlay = useCallback(() => {
    setAlwaysShowOverlay((prev) => {
      const newVal = !prev;
      window.electronAPI?.setAlwaysShowLabels?.(newVal);
      return newVal;
    });
  }, []);

  const handleSelectAgent = useCallback((id: number) => {
    window.electronAPI?.focusAgent?.(id);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0);
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  );

  const handleCloseAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'closeAgent', id });
  }, []);

  const handleClick = useCallback((agentId: number) => {
    const os = getOfficeState();
    const meta = os.subagentMeta.get(agentId);
    const focusId = meta ? meta.parentAgentId : agentId;
    setInspectedAgentId(null);
    setActiveTab('terminal');
    setActiveSessionId(focusId);
    window.electronAPI?.focusAgent?.(focusId);
  }, []);

  const handleInspectAgent = useCallback((agentId: number) => {
    setInspectedAgentId(agentId);
  }, []);

  const officeState = getOfficeState();
  const inspectedCharacter =
    inspectedAgentId !== null ? officeState.characters.get(inspectedAgentId) ?? null : null;
  const inspectedAgentName = inspectedAgentId !== null ? agentNames[inspectedAgentId] || 'Agent' : 'Agent';
  const inspectedRolePrompt =
    inspectedAgentId !== null ? agentRolePrompts[inspectedAgentId] || '' : '';
  const inspectedPersonaPrompt =
    inspectedAgentId !== null ? agentPersonaPrompts[inspectedAgentId] || '' : '';
  const inspectedGenderLabel =
    inspectedCharacter && (inspectedCharacter.palette === 0 || inspectedCharacter.palette === 2 || inspectedCharacter.palette === 4)
      ? '男'
      : '女';

  // Force dependency on editorTickForKeyboard to propagate keyboard-triggered re-renders
  void editorTickForKeyboard;

  // Show "Press R to rotate" hint when a rotatable item is selected or being placed
  const showRotateHint =
    editor.isEditMode &&
    (() => {
      if (editorState.selectedFurnitureUid) {
        const item = officeState
          .getLayout()
          .furniture.find((f) => f.uid === editorState.selectedFurnitureUid);
        if (item && isRotatable(item.type)) return true;
      }
      if (
        editorState.activeTool === EditTool.FURNITURE_PLACE &&
        isRotatable(editorState.selectedFurnitureType)
      ) {
        return true;
      }
      return false;
    })();

  if (!layoutReady) {
    return (
      <div className="w-full h-full flex items-center justify-center ">{t('app.loading')}</div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-border bg-bg overflow-x-auto">
        <button
          onClick={() => setActiveTab('office')}
          className={`px-16 py-8 text-base border-none cursor-pointer whitespace-nowrap ${
            activeTab === 'office'
              ? 'bg-accent text-white'
              : 'bg-transparent text-text hover:bg-btn-bg'
          }`}
        >
          {t('tabs.office')}
        </button>
        {terminalTabs.map((tab) => (
          <button
            key={tab.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setActiveTab('terminal');
              setActiveSessionId(tab.id);
            }}
            className={`px-16 py-8 text-base border-none cursor-pointer whitespace-nowrap ${
              activeTab === 'terminal' && activeSessionId === tab.id
                ? 'bg-accent text-white'
                : 'bg-transparent text-text hover:bg-btn-bg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 pb-32">
        {activeTab === 'office' ? (
          <OfficeCanvas
            officeState={officeState}
            onClick={handleClick}
            onInspectAgent={handleInspectAgent}
            isEditMode={editor.isEditMode}
            editorState={editorState}
            onEditorTileAction={editor.handleEditorTileAction}
            onEditorEraseAction={editor.handleEditorEraseAction}
            onEditorSelectionChange={editor.handleEditorSelectionChange}
            onDeleteSelected={editor.handleDeleteSelected}
            onRotateSelected={editor.handleRotateSelected}
            onDragMove={editor.handleDragMove}
            editorTick={editor.editorTick}
            zoom={editor.zoom}
            onZoomChange={editor.handleZoomChange}
            panRef={editor.panRef}
            hasLabelOverlay={alwaysShowOverlay}
          />
        ) : (
          <div className="h-full">
            <TerminalPanel
              isOpen={activeTab === 'terminal'}
              activeSessionId={activeSessionId}
              activeSession={activeSession}
            />
          </div>
        )}
      </div>

      {/* Office-only overlays */}
      {activeTab === 'office' &&
        (!isDebugMode ? (
          <>
            <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />

            {/* Vignette overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'var(--vignette)' }}
            />

            {editor.isEditMode && editor.isDirty && (
              <EditActionBar editor={editor} editorState={editorState} />
            )}

            {showRotateHint && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-11 bg-accent-bright text-white text-sm py-3 px-8 rounded-none border-2 border-accent shadow-pixel pointer-events-none whitespace-nowrap"
                style={{ top: editor.isDirty ? 64 : 8 }}
              >
                {t('app.rotateHint')}
              </div>
            )}

            {editor.isEditMode &&
              (() => {
                const selUid = editorState.selectedFurnitureUid;
                const selColor = selUid
                  ? (officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null)
                  : null;
                return (
                  <EditorToolbar
                    activeTool={editorState.activeTool}
                    selectedTileType={editorState.selectedTileType}
                    selectedFurnitureType={editorState.selectedFurnitureType}
                    selectedFurnitureUid={selUid}
                    selectedFurnitureColor={selColor}
                    floorColor={editorState.floorColor}
                    wallColor={editorState.wallColor}
                    selectedWallSet={editorState.selectedWallSet}
                    onToolChange={editor.handleToolChange}
                    onTileTypeChange={editor.handleTileTypeChange}
                    onFloorColorChange={editor.handleFloorColorChange}
                    onWallColorChange={editor.handleWallColorChange}
                    onWallSetChange={editor.handleWallSetChange}
                    onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
                    onFurnitureTypeChange={editor.handleFurnitureTypeChange}
                    loadedAssets={loadedAssets}
                  />
                );
              })()}

            <ToolOverlay
              officeState={officeState}
              agents={agents}
              agentNames={agentNames}
              agentTools={agentTools}
              agentThoughts={agentThoughts}
              subagentCharacters={subagentCharacters}
              containerRef={containerRef}
              zoom={editor.zoom}
              panRef={editor.panRef}
              onCloseAgent={handleCloseAgent}
              alwaysShowOverlay={alwaysShowOverlay}
            />
          </>
        ) : (
          <DebugView
            agents={agents}
            selectedAgent={selectedAgent}
            agentTools={agentTools}
            agentStatuses={agentStatuses}
            subagentTools={subagentTools}
            onSelectAgent={handleSelectAgent}
          />
        ))}

      {/* Hooks first-run tooltip */}
      {!hooksInfoShown && !hooksTooltipDismissed && (
        <Tooltip
          title={t('app.hooksTooltipTitle')}
          position="top-right"
          onDismiss={() => {
            setHooksTooltipDismissed(true);
            window.electronAPI?.setHooksInfoShown?.();
          }}
        >
          <span className="text-sm text-text leading-none">
            {t('app.hooksTooltipBody')}{' '}
            <span
              className="text-accent cursor-pointer underline"
              onClick={() => {
                setIsHooksInfoOpen(true);
                setHooksTooltipDismissed(true);
                window.electronAPI?.setHooksInfoShown?.();
              }}
            >
              {t('app.viewMore')}
            </span>
          </span>
        </Tooltip>
      )}

      {/* Hooks info modal */}
      <Modal
        isOpen={isHooksInfoOpen}
        onClose={() => setIsHooksInfoOpen(false)}
        title={t('app.hooksModalTitle')}
        zIndex={52}
      >
        <div className="text-base text-text px-10" style={{ lineHeight: 1.4 }}>
          <p className="mb-8">{t('app.hooksModalIntro')}</p>
          <ul className="mb-8 pl-18 list-disc m-0">
            <li className="text-sm mb-2">{t('app.hooksModalPointPermissions')}</li>
            <li className="text-sm mb-2">{t('app.hooksModalPointCompletion')}</li>
            <li className="text-sm mb-2">{t('app.hooksModalPointSound')}</li>
          </ul>
          <p className="mb-12 text-text-muted">{t('app.hooksModalDescription')}</p>
          <div className="text-center">
            <button
              onClick={() => setIsHooksInfoOpen(false)}
              className="py-4 px-20 text-lg bg-accent text-white border-2 border-accent rounded-none cursor-pointer shadow-pixel"
            >
              {t('app.hooksModalGotIt')}
            </button>
          </div>
          <p className="mt-8 text-xs text-text-muted text-center">
            {t('app.hooksModalDisableHint')}
          </p>
        </div>
      </Modal>

      {activeTab === 'office' && (
        <BottomToolbar
          isEditMode={editor.isEditMode}
          onOpenClaude={editor.handleOpenClaude}
          onToggleEditMode={editor.handleToggleEditMode}
          isSettingsOpen={isSettingsOpen}
          onToggleSettings={() => setIsSettingsOpen((v) => !v)}
          workspaceFolders={workspaceFolders}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        alwaysShowOverlay={alwaysShowOverlay}
        onToggleAlwaysShowOverlay={handleToggleAlwaysShowOverlay}
        externalAssetDirectories={externalAssetDirectories}
        watchAllSessions={watchAllSessions}
        onToggleWatchAllSessions={() => {
          const newVal = !watchAllSessions;
          setWatchAllSessions(newVal);
          window.electronAPI?.setWatchAllSessions?.(newVal);
        }}
        hooksEnabled={hooksEnabled}
        onToggleHooksEnabled={() => {
          const newVal = !hooksEnabled;
          setHooksEnabled(newVal);
          window.electronAPI?.setHooksEnabled?.(newVal);
        }}
      />

      <AgentInfoModal
        isOpen={inspectedAgentId !== null}
        onClose={() => setInspectedAgentId(null)}
        onFire={() => {
          if (inspectedAgentId !== null) {
            setInspectedAgentId(null);
            handleCloseAgent(inspectedAgentId);
          }
        }}
        agentName={inspectedAgentName}
        genderLabel={inspectedGenderLabel}
        rolePrompt={inspectedRolePrompt}
        personaPrompt={inspectedPersonaPrompt}
      />

      {showMigrationNotice && (
        <MigrationNotice onDismiss={() => setMigrationNoticeDismissed(true)} />
      )}
    </div>
  );
}

export default App;
