import { Modal } from './ui/Modal.js';

interface AgentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFire: () => void;
  agentName: string;
  genderLabel: string;
  rolePrompt: string;
  personaPrompt: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm text-text-muted">{label}</span>
      <div className="min-h-20 px-8 py-6 border-2 border-border bg-bg text-base text-text whitespace-pre-wrap break-words">
        {value}
      </div>
    </div>
  );
}

export function AgentInfoModal({
  isOpen,
  onClose,
  onFire,
  agentName,
  genderLabel,
  rolePrompt,
  personaPrompt,
}: AgentInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="人物信息" className="w-[460px] max-w-[92vw]">
      <div className="px-10 pb-10 flex flex-col gap-10 text-base text-text">
        <div className="flex items-center justify-between gap-8">
          <span className="text-text-muted">姓名</span>
          <span className="text-accent-bright">{agentName || '未命名'}</span>
        </div>
        <div className="flex items-center justify-between gap-8">
          <span className="text-text-muted">性别</span>
          <span>{genderLabel}</span>
        </div>
        <InfoRow label="职业 / 分工" value={rolePrompt || '未填写'} />
        <InfoRow label="人设 / 性格" value={personaPrompt || '未填写'} />
        <div className="flex justify-end pt-2">
          <button
            onClick={onFire}
            className="py-4 px-16 text-base bg-[#b33a3a] text-white border-2 border-[#b33a3a] rounded-none cursor-pointer shadow-pixel hover:brightness-110"
          >
            开除
          </button>
        </div>
      </div>
    </Modal>
  );
}
