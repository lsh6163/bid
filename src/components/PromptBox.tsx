import { useState, type ReactNode } from 'react';
import { Bot, Copy, FileText, Terminal } from 'lucide-react';
import type { PromptTemplate } from '../types';

interface Props {
  prompts: PromptTemplate[];
  selected: PromptTemplate | null;
  onSelect: (id: string) => void;
}

export default function PromptBox({ prompts, selected, onSelect }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        이 단계에 등록된 프롬프트가 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 overflow-y-auto p-6">
      {prompts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                p.id === selected.id ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {copied && (
        <div className="fixed right-6 top-20 z-40 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white shadow">
          ✓ 복사 완료
        </div>
      )}

      <div className="text-sm text-slate-400">{selected.subtitle}</div>

      <Field
        icon={<Bot size={16} />}
        label="에이전트 이름"
        onCopy={() => copy('name', selected.agentName)}
      >
        <input readOnly value={selected.agentName} className="w-full rounded-lg border border-slate-700 bg-navy-950 px-3 py-2" />
      </Field>

      <Field
        icon={<FileText size={16} />}
        label="에이전트 설명"
        onCopy={() => copy('desc', selected.agentDescription)}
      >
        <textarea
          readOnly
          rows={3}
          value={selected.agentDescription}
          className="w-full resize-y rounded-lg border border-slate-700 bg-navy-950 px-3 py-2"
        />
      </Field>

      <Field
        icon={<Terminal size={16} className="text-amber-300" />}
        label="프롬프트"
        highlight
        onCopy={() => copy('prompt', selected.content)}
      >
        <textarea
          readOnly
          rows={10}
          value={selected.content}
          className="w-full resize-y rounded-lg border border-amber-700/40 bg-navy-950 px-3 py-2 font-mono text-sm leading-6"
        />
      </Field>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
  onCopy,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onCopy: () => void;
  highlight?: boolean;
}) {
  return (
    <section className={`field-card ${highlight ? 'border-amber-700/40' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${highlight ? 'text-amber-300' : 'text-slate-200'}`}>
          {icon}
          {label}
        </div>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          <Copy size={12} /> 복사
        </button>
      </div>
      {children}
    </section>
  );
}
