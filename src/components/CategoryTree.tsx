import { ChevronLeft, ChevronRight, FolderTree } from 'lucide-react';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  level1: CategoryLevel1[];
  level2: CategoryLevel2[];
  prompts: PromptTemplate[];
  selectedL2Id?: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
}

export default function CategoryTree({
  collapsed,
  onToggle,
  level1,
  level2,
  prompts,
  selectedL2Id,
  searchQuery,
  onSelect,
}: Props) {
  const q = searchQuery.trim().toLowerCase();
  const matchingL2 = new Set(
    q
      ? prompts
          .filter((p) =>
            [p.title, p.subtitle, p.agentName, p.agentDescription, p.content, p.tags.join(' ')]
              .join(' ')
              .toLowerCase()
              .includes(q)
          )
          .map((p) => p.categoryLevel2Id)
      : []
  );

  if (collapsed) {
    return (
      <aside className="flex w-12 flex-col border-r border-slate-800 bg-navy-900">
        <button onClick={onToggle} className="m-2 rounded-lg p-2 text-slate-300 hover:bg-slate-800" title="사이드바 펼치기">
          <ChevronRight size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-navy-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <FolderTree size={16} />
          단계 메뉴
        </div>
        <button onClick={onToggle} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800" title="사이드바 접기">
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {level1.length === 0 && (
          <p className="px-2 text-sm text-slate-500">등록된 단계가 없습니다. 관리자에서 단계 1을 추가하세요.</p>
        )}
        {level1.map((l1) => {
          const children = level2.filter((l2) => l2.parentId === l1.id);
          return (
            <div key={l1.id} className="mb-4">
              <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{l1.name}</div>
              {children.length === 0 && <div className="px-3 py-1 text-xs text-slate-600">하위 단계 없음</div>}
              {children.map((l2) => {
                const active = l2.id === selectedL2Id;
                const hit = matchingL2.has(l2.id);
                return (
                  <button
                    key={l2.id}
                    onClick={() => onSelect(l2.id)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-sky-600/20 text-sky-200 ring-1 ring-sky-500/50'
                        : hit
                          ? 'bg-amber-500/10 text-amber-200'
                          : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-medium">{l2.name}</div>
                    {l2.description && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{l2.description}</div>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
