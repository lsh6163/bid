import { useEffect, useState } from 'react';
import { LayoutDashboard, Search, ShieldAlert } from 'lucide-react';
import type { AppViewMode } from '../types';
import { usePromptStore } from '../hooks/usePromptStore';
import { useAuth } from '../hooks/useAuth';
import CategoryTree from './CategoryTree';
import PromptBox from './PromptBox';
import HelpBoard from './HelpBoard';
import LoginModal from './LoginModal';
import AdminEditor from './AdminEditor';
import EconomicDashboard from './dashboard/EconomicDashboard';

export default function MainLayout() {
  const [view, setView] = useState<AppViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const store = usePromptStore();
  const auth = useAuth();

  useEffect(() => {
    if (view === 'prompts' && searchQuery) store.applySearch(searchQuery);
  }, [searchQuery, view, store.applySearch]);

  return (
    <div className="flex h-screen flex-col bg-navy-950">
      <header className="flex items-center gap-4 border-b border-slate-800 bg-navy-900 px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="text-sky-400" size={20} />
          <span>포스코스틸리온</span>
          <span className="hidden text-sm font-normal text-slate-400 sm:inline">구매 입찰 지원 시스템</span>
        </div>
        <nav className="flex rounded-lg bg-slate-800 p-1 text-sm">
          <button
            className={`rounded-md px-3 py-1 ${view === 'dashboard' ? 'bg-sky-600' : 'text-slate-300'}`}
            onClick={() => setView('dashboard')}
          >
            경제지표
          </button>
          <button
            className={`rounded-md px-3 py-1 ${view === 'prompts' ? 'bg-sky-600' : 'text-slate-300'}`}
            onClick={() => setView('prompts')}
          >
            프롬프트 관리
          </button>
        </nav>
        {view === 'prompts' && (
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="프롬프트 검색"
              className="w-full rounded-lg border border-slate-700 bg-navy-950 py-2 pl-8 pr-3 text-sm"
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {auth.admin && (
            <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm" onClick={() => setAdminOpen(true)}>
              관리
            </button>
          )}
          {auth.admin ? (
            <button className="rounded-lg px-3 py-1.5 text-sm text-slate-300" onClick={() => void auth.logout()}>
              로그아웃
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-amber-600/40 px-3 py-1.5 text-sm text-amber-200"
              onClick={() => setLoginOpen(true)}
            >
              <ShieldAlert size={14} /> 관리자 로그인
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {view === 'dashboard' ? (
          <main className="flex-1 overflow-hidden">
            <EconomicDashboard />
          </main>
        ) : (
          <>
            <CategoryTree
              collapsed={collapsed}
              onToggle={() => setCollapsed((v) => !v)}
              level1={store.level1}
              level2={store.level2}
              prompts={store.prompts}
              selectedL2Id={store.selectedL2?.id}
              searchQuery={searchQuery}
              onSelect={store.selectLevel2}
            />
            <main className="min-w-0 flex-1 overflow-hidden">
              {store.loading && <div className="p-8 text-slate-400">불러오는 중…</div>}
              {store.error && <div className="p-8 text-rose-400">{store.error}</div>}
              {!store.loading && !store.error && store.selectedL2?.viewType === 'board' && (
                <HelpBoard admin={auth.admin} title={store.selectedL2.name} />
              )}
              {!store.loading && !store.error && store.selectedL2?.viewType !== 'board' && (
                <PromptBox
                  prompts={store.promptsInSelected}
                  selected={store.selectedPrompt}
                  onSelect={store.setSelectedPromptId}
                />
              )}
              {!store.loading && !store.error && !store.selectedL2 && (
                <div className="flex h-full items-center justify-center text-slate-500">
                  단계가 없습니다. 관리자에서 단계 1부터 생성하세요.
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLogin={auth.login} />}
      {adminOpen && auth.admin && (
        <AdminEditor
          onClose={() => setAdminOpen(false)}
          onChanged={store.reload}
          level1={store.level1}
          level2={store.level2}
          prompts={store.prompts}
        />
      )}
    </div>
  );
}
