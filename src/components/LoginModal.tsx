import { FormEvent, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onLogin: (password: string) => Promise<void>;
}

export default function LoginModal({ onClose, onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onLogin(password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-700 bg-navy-800 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300">
            <ShieldAlert size={18} />
            <h2 className="text-lg font-semibold">관리자 로그인</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="관리자 비밀번호"
          className="mb-3 w-full rounded-lg border border-slate-600 bg-navy-950 px-3 py-2 outline-none focus:border-sky-500"
          autoFocus
        />
        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-2 font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? '확인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}
