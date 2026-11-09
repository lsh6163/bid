import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';
import { api } from '../lib/api';

interface Props {
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  level1: CategoryLevel1[];
  level2: CategoryLevel2[];
  prompts: PromptTemplate[];
}

export default function AdminEditor({ onClose, onChanged, level1, level2, prompts }: Props) {
  const [tab, setTab] = useState<'stages' | 'prompts' | 'reset'>('stages');
  const [error, setError] = useState<string | null>(null);
  const [l1Name, setL1Name] = useState('');
  const [parentId, setParentId] = useState(level1[0]?.id ?? '');
  const [l2Name, setL2Name] = useState('');
  const [l2Desc, setL2Desc] = useState('');
  const [editing, setEditing] = useState<PromptTemplate | null>(null);

  const promptTargets = useMemo(() => level2.filter((l) => l.viewType !== 'board'), [level2]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 실패');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-navy-800">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="font-semibold">관리자</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex gap-2 border-b border-slate-700 px-5 py-2 text-sm">
          {(['stages', 'prompts', 'reset'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 ${tab === t ? 'bg-sky-600' : 'bg-slate-800'}`}
            >
              {t === 'stages' ? '단계 관리' : t === 'prompts' ? '프롬프트 관리' : '초기화'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {error && <p className="mb-3 text-rose-400">{error}</p>}

          {tab === 'stages' && (
            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h3 className="mb-2 font-semibold">단계 1</h3>
                <div className="mb-3 flex gap-2">
                  <input value={l1Name} onChange={(e) => setL1Name(e.target.value)} placeholder="새 단계 1 이름" className="flex-1 rounded border border-slate-600 bg-navy-950 px-2 py-1" />
                  <button
                    className="rounded bg-sky-600 px-3"
                    onClick={() => run(async () => {
                      await api.post('/api/categories/level1', { name: l1Name, sortOrder: level1.length + 1 });
                      setL1Name('');
                    })}
                  >추가</button>
                </div>
                {level1.map((l1) => {
                  const childCount = level2.filter((l) => l.parentId === l1.id).length;
                  return (
                    <div key={l1.id} className="mb-2 rounded-lg border border-slate-700 p-2">
                      <input
                        defaultValue={l1.name}
                        className="mb-1 w-full rounded bg-navy-950 px-2 py-1"
                        onBlur={(e) => {
                          if (e.target.value !== l1.name) {
                            void run(() => api.put(`/api/categories/level1/${l1.id}`, { name: e.target.value, sortOrder: l1.sortOrder }));
                          }
                        }}
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>하위 {childCount}개</span>
                        <div className="flex gap-2">
                          <button onClick={() => run(() => api.put(`/api/categories/level1/${l1.id}`, { name: l1.name, sortOrder: l1.sortOrder - 1 }))}>위로</button>
                          <button
                            disabled={childCount > 0}
                            className="text-rose-400 disabled:opacity-30"
                            title={childCount > 0 ? '하위 단계 2를 먼저 이동/삭제하세요' : '삭제'}
                            onClick={() => run(() => api.del(`/api/categories/level1/${l1.id}`))}
                          >삭제</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
              <section>
                <h3 className="mb-2 font-semibold">단계 2</h3>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="mb-2 w-full rounded border border-slate-600 bg-navy-950 px-2 py-1">
                  {level1.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <input value={l2Name} onChange={(e) => setL2Name(e.target.value)} placeholder="새 단계 2 이름" className="mb-2 w-full rounded border border-slate-600 bg-navy-950 px-2 py-1" />
                <input value={l2Desc} onChange={(e) => setL2Desc(e.target.value)} placeholder="설명" className="mb-2 w-full rounded border border-slate-600 bg-navy-950 px-2 py-1" />
                <button
                  className="mb-3 rounded bg-sky-600 px-3 py-1"
                  onClick={() => run(async () => {
                    await api.post('/api/categories/level2', { parentId, name: l2Name, description: l2Desc, sortOrder: level2.length + 1 });
                    setL2Name('');
                    setL2Desc('');
                  })}
                >단계 2 추가</button>
                {level2.map((l2) => {
                  const promptCount = prompts.filter((p) => p.categoryLevel2Id === l2.id).length;
                  const parentName = level1.find((x) => x.id === l2.parentId)?.name;
                  return (
                    <div key={l2.id} className="mb-2 rounded-lg border border-slate-700 p-2">
                      <div className="font-medium">{l2.name} <span className="text-xs text-slate-500">({parentName}{l2.viewType === 'board' ? ', 게시판' : ''})</span></div>
                      <div className="mt-1 text-xs text-slate-400">
                        연결 프롬프트 {promptCount}개
                        {l2.viewType === 'board' ? ' · 도움말 글은 HelpBoard에서 관리' : ''}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <select
                          defaultValue={l2.parentId}
                          className="rounded bg-navy-950 px-1 py-0.5"
                          onChange={(e) => run(() => api.put(`/api/categories/level2/${l2.id}`, { parentId: e.target.value, name: l2.name, description: l2.description, sortOrder: l2.sortOrder }))}
                        >
                          {level1.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <button onClick={() => run(() => api.put(`/api/categories/level2/${l2.id}`, { ...l2, sortOrder: l2.sortOrder - 1 }))}>위로</button>
                        <button
                          disabled={promptCount > 0}
                          className="text-rose-400 disabled:opacity-30"
                          title={promptCount > 0 ? '프롬프트를 먼저 이동/삭제하세요' : l2.viewType === 'board' ? '게시물이 있으면 삭제되지 않습니다' : '삭제'}
                          onClick={() => run(() => api.del(`/api/categories/level2/${l2.id}`))}
                        >삭제</button>
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          )}

          {tab === 'prompts' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <button
                  className="mb-3 rounded bg-sky-600 px-3 py-1"
                  onClick={() => setEditing({
                    id: '',
                    categoryLevel2Id: promptTargets[0]?.id ?? '',
                    title: '',
                    subtitle: '',
                    agentName: '',
                    agentDescription: '',
                    content: '',
                    tags: [],
                  })}
                >새 프롬프트</button>
                {prompts.map((p) => (
                  <button key={p.id} onClick={() => setEditing(p)} className="mb-1 block w-full rounded px-2 py-1 text-left hover:bg-slate-800">
                    {p.title}
                  </button>
                ))}
              </div>
              {editing && (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const payload = {
                        categoryLevel2Id: editing.categoryLevel2Id,
                        title: editing.title,
                        subtitle: editing.subtitle,
                        agentName: editing.agentName,
                        agentDescription: editing.agentDescription,
                        content: editing.content,
                        tags: editing.tags,
                      };
                      if (editing.id) await api.put(`/api/prompts/${editing.id}`, payload);
                      else await api.post('/api/prompts', payload);
                      setEditing(null);
                    });
                  }}
                >
                  <select
                    value={editing.categoryLevel2Id}
                    onChange={(e) => setEditing({ ...editing, categoryLevel2Id: e.target.value })}
                    className="w-full rounded border border-slate-600 bg-navy-950 px-2 py-1"
                  >
                    {promptTargets.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="제목" className="w-full rounded border border-slate-600 bg-navy-950 px-2 py-1" />
                  <input value={editing.agentName} onChange={(e) => setEditing({ ...editing, agentName: e.target.value })} placeholder="1. 에이전트 이름" className="w-full rounded border border-slate-600 bg-navy-950 px-2 py-1" />
                  <input value={editing.agentDescription} onChange={(e) => setEditing({ ...editing, agentDescription: e.target.value })} placeholder="2. 에이전트 설명" className="w-full rounded border border-slate-600 bg-navy-950 px-2 py-1" />
                  <textarea rows={8} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="3. 프롬프트 복사용 원문" className="w-full rounded border border-slate-600 bg-navy-950 px-2 py-1 font-mono" />
                  <div className="flex gap-2">
                    <button className="rounded bg-sky-600 px-3 py-1" type="submit">저장</button>
                    {editing.id && (
                      <button
                        type="button"
                        className="rounded bg-rose-700 px-3 py-1"
                        onClick={() => run(async () => {
                          await api.del(`/api/prompts/${editing.id}`);
                          setEditing(null);
                        })}
                      >삭제</button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === 'reset' && (
            <div>
              <p className="mb-3 text-slate-300">카테고리와 시드 프롬프트 4건을 초기 상태로 복원합니다. 관리자가 추가한 프롬프트는 삭제됩니다. 도움말 게시물·첨부·경제지표 캐시는 유지됩니다.</p>
              <button
                className="rounded bg-rose-700 px-4 py-2"
                onClick={() => {
                  if (!confirm('카테고리와 프롬프트를 시드 데이터로 리셋할까요?')) return;
                  void run(() => api.post('/api/prompts/reset'));
                }}
              >DB 초기 데이터로 리셋</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
