import { useEffect, useMemo, useState } from 'react';

import namesData from '../data/names.json';
import { AGENT_HUE_PRESETS } from '../constants.js';
import { useI18n } from '../i18n.tsx';
import { getCachedSprite } from '../office/sprites/spriteCache.js';
import { getCharacterSprites } from '../office/sprites/spriteData.js';
import { Direction } from '../office/types.js';
import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { ItemSelect } from './ui/ItemSelect.js';

export interface CreateAgentConfig {
  cwd?: string;
  name: string;
  palette: number;
  hueShift: number;
}

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: CreateAgentConfig) => void;
  workspaceFolders: WorkspaceFolder[];
}

type Gender = 'male' | 'female';

const MALE_PALETTES = [0, 2, 4] as const;
const FEMALE_PALETTES = [1, 3, 5] as const;

function getPalettesForGender(gender: Gender): readonly number[] {
  return gender === 'male' ? MALE_PALETTES : FEMALE_PALETTES;
}

export function CreateAgentModal({
  isOpen,
  onClose,
  onCreate,
  workspaceFolders,
}: CreateAgentModalProps) {
  const { locale } = useI18n();
  const [gender, setGender] = useState<Gender>('female');
  const [palette, setPalette] = useState(1);
  const [hueShift, setHueShift] = useState(0);
  const [name, setName] = useState('');
  const [selectedFolderPath, setSelectedFolderPath] = useState('');

  const paletteOptions = useMemo(() => getPalettesForGender(gender), [gender]);
  const suggestedNames = useMemo(() => namesData[gender], [gender]);

  useEffect(() => {
    if (!isOpen) return;
    const defaultPalette = paletteOptions[0] ?? 0;
    setPalette(defaultPalette);
    setHueShift(0);
    setName(suggestedNames[0] ?? '');
    setSelectedFolderPath(workspaceFolders[0]?.path ?? '');
  }, [isOpen, paletteOptions, suggestedNames, workspaceFolders]);

  useEffect(() => {
    if (!paletteOptions.includes(palette)) {
      setPalette(paletteOptions[0] ?? 0);
    }
  }, [palette, paletteOptions]);

  const title = locale === 'zh' ? '自定义创建' : 'Custom Create';
  const folderLabel = locale === 'zh' ? '工作目录' : 'Workspace';
  const genderLabel = locale === 'zh' ? '性别' : 'Gender';
  const avatarLabel = locale === 'zh' ? '卡通形象' : 'Avatar';
  const colorLabel = locale === 'zh' ? '配色' : 'Palette';
  const nameLabel = locale === 'zh' ? '名字' : 'Name';
  const suggestionsLabel = locale === 'zh' ? '推荐名字' : 'Suggested names';
  const femaleLabel = locale === 'zh' ? '女生' : 'Female';
  const maleLabel = locale === 'zh' ? '男生' : 'Male';
  const createLabel = locale === 'zh' ? '创建人物' : 'Create Agent';
  const cancelLabel = locale === 'zh' ? '取消' : 'Cancel';
  const customPlaceholder = locale === 'zh' ? '自己输入名字' : 'Enter custom name';

  const submitDisabled = name.trim().length === 0;

  const handleCreate = () => {
    if (submitDisabled) return;
    onCreate({
      cwd: selectedFolderPath || undefined,
      name: name.trim(),
      palette,
      hueShift,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="w-[720px] max-w-[92vw]">
      <div className="px-10 pb-10 flex flex-col gap-12">
        {workspaceFolders.length > 1 && (
          <div className="flex flex-col gap-6">
            <label className="text-sm text-text-muted">{folderLabel}</label>
            <select
              value={selectedFolderPath}
              onChange={(event) => setSelectedFolderPath(event.target.value)}
              className="bg-bg border-2 border-border text-text px-8 py-6 rounded-none outline-none"
            >
              {workspaceFolders.map((folder) => (
                <option key={folder.path} value={folder.path}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <span className="text-sm text-text-muted">{genderLabel}</span>
          <div className="flex gap-8">
            <Button
              variant={gender === 'female' ? 'active' : 'default'}
              size="md"
              onClick={() => setGender('female')}
            >
              {femaleLabel}
            </Button>
            <Button
              variant={gender === 'male' ? 'active' : 'default'}
              size="md"
              onClick={() => setGender('male')}
            >
              {maleLabel}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <span className="text-sm text-text-muted">{avatarLabel}</span>
          <div className="flex gap-8 flex-wrap">
            {paletteOptions.map((option) => (
              <ItemSelect
                key={option}
                width={64}
                height={88}
                selected={palette === option}
                onClick={() => setPalette(option)}
                title={`${avatarLabel} ${option + 1}`}
                deps={[option, hueShift]}
                draw={(ctx) => {
                  ctx.imageSmoothingEnabled = false;
                  const sprite = getCharacterSprites(option, hueShift).walk[Direction.DOWN][1];
                  const cached = getCachedSprite(sprite, 3);
                  const x = Math.floor((64 - cached.width) / 2);
                  const y = Math.floor(88 - cached.height - 2);
                  ctx.drawImage(cached, x, y);
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <span className="text-sm text-text-muted">{colorLabel}</span>
          <div className="flex gap-8 flex-wrap">
            {AGENT_HUE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setHueShift(preset)}
                className={`w-28 h-28 border-2 rounded-none cursor-pointer ${
                  hueShift === preset ? 'border-accent' : 'border-border'
                }`}
                style={{
                  background:
                    preset === 0
                      ? 'linear-gradient(135deg, #f4ecd8 0%, #8b6a47 100%)'
                      : `hsl(${preset}deg 70% 55%)`,
                }}
                title={`${colorLabel} ${preset}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <label className="text-sm text-text-muted">{nameLabel}</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={customPlaceholder}
            className="bg-bg border-2 border-border text-text px-8 py-6 rounded-none outline-none"
          />
          <div className="flex flex-col gap-4">
            <span className="text-xs text-text-muted">{suggestionsLabel}</span>
            <div className="flex gap-6 flex-wrap">
              {suggestedNames.map((suggestedName) => (
                <button
                  key={suggestedName}
                  onClick={() => setName(suggestedName)}
                  className={`px-8 py-4 border-2 rounded-none cursor-pointer text-sm ${
                    name === suggestedName
                      ? 'border-accent bg-active-bg'
                      : 'border-border bg-btn-bg hover:bg-btn-hover'
                  }`}
                >
                  {suggestedName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-8 pt-4">
          <Button variant="default" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={submitDisabled ? 'disabled' : 'accent'} onClick={handleCreate}>
            {createLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
