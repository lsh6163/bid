import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import type { HelpPost } from '../types';
import { formatBytes, formatDateTime } from '../lib/format';
import { useHelpBoard } from '../hooks/useHelpBoard';

interface Props {
  admin: boolean;
  title: string;
}

export default function HelpBoard({ admin, title }: Props) {
  const board = useHelpBoard();
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void board.loadList();
  }, [board.loadList]);

  async function handleDelete(post: HelpPost) {
    if (!confirm('이 게시물과 첨부파일을 삭제할까요?')) return;
    await board.deletePost(post.id);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!titleInput.trim()) return;
    setSaving(true);
    try {
      await board.createPost(titleInput.trim(), bodyInput, files);
      setTitleInput('');
      setBodyInput('');
      setFiles([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto p-6">
      {board.view === 'list' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-slate-400">{board.posts.length}건</p>
            </div>
            {admin && (
              <button
                onClick={() => board.setView('create')}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm hover:bg-sky-500"
              >
                <Plus size={16} /> 새 글
              </button>
            )}
          </div>
          {board.loading && <p className="text-slate-400">불러오는 중…</p>}
          {board.error && <p className="text-rose-400">{board.error}</p>}
          {!board.loading && !board.error && board.posts.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
              <p className="mb-2">등록된 참고 문서가 없습니다.</p>
              {admin ? (
                <>
                  <p className="mb-4 text-sm text-slate-400">새 글을 작성해 주세요.</p>
                  <button
                    onClick={() => board.setView('create')}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500"
                  >
                    첫 글 등록
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-400">관리자로 로그인하면 첫 글을 등록할 수 있습니다.</p>
              )}
            </div>
          )}
          {board.posts.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2">제목</th>
                  <th className="w-28">첨부</th>
                  <th className="w-44">등록일</th>
                  {admin && <th className="w-20">관리</th>}
                </tr>
              </thead>
              <tbody>
                {board.posts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/80">
                    <td className="py-3">
                      <button className="text-left text-sky-300 hover:underline" onClick={() => board.openDetail(p.id)}>
                        {p.title}
                      </button>
                    </td>
                    <td className="text-slate-400">
                      {(p.attachmentCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip size={14} /> {p.attachmentCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-slate-400">{formatDateTime(p.createdAt)}</td>
                    {admin && (
                      <td>
                        <button className="text-rose-400 hover:text-rose-300" onClick={() => handleDelete(p)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {board.view === 'detail' && board.current && (
        <article>
          <div className="mb-4 flex items-center justify-between">
            <button className="inline-flex items-center gap-1 text-sm text-slate-300" onClick={() => board.loadList()}>
              <ArrowLeft size={16} /> 목록
            </button>
            {admin && (
              <button className="inline-flex items-center gap-1 text-rose-400" onClick={() => handleDelete(board.current!)}>
                <Trash2 size={16} /> 삭제
              </button>
            )}
          </div>
          <h2 className="text-2xl font-semibold">{board.current.title}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-400">{formatDateTime(board.current.createdAt)}</p>
          <pre className="whitespace-pre-wrap font-sans text-slate-200">{board.current.body || '내용 없음'}</pre>
          {board.current.attachments.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">첨부파일</h3>
              <ul className="space-y-2">
                {board.current.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      className="inline-flex items-center gap-2 text-sky-300 hover:underline"
                      href={`/api/help-posts/${board.current!.id}/attachments/${a.id}`}
                    >
                      <Paperclip size={14} />
                      {a.originalName}
                      <span className="text-xs text-slate-500">{formatBytes(a.sizeBytes)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {board.current.attachments.length === 0 && (
            <p className="mt-8 text-sm text-slate-500">첨부파일 없음</p>
          )}
        </article>
      )}

      {board.view === 'create' && admin && (
        <form onSubmit={handleCreate} className="space-y-4">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-slate-300"
            onClick={() => {
              if (titleInput || bodyInput || files.length) {
                if (!confirm('작성을 취소하고 목록으로 돌아갈까요?')) return;
              }
              board.setView('list');
            }}
          >
            <ArrowLeft size={16} /> 목록
          </button>
          <input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="제목 (필수)"
            className="w-full rounded-lg border border-slate-700 bg-navy-950 px-3 py-2"
          />
          <textarea
            rows={10}
            value={bodyInput}
            onChange={(e) => setBodyInput(e.target.value)}
            placeholder="내용"
            className="w-full rounded-lg border border-slate-700 bg-navy-950 px-3 py-2"
          />
          <div>
            <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <Upload size={16} /> 첨부파일 (여러 개)
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
            </label>
            <ul className="mt-2 space-y-1 text-sm">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded bg-slate-800 px-3 py-1">
                  <span>
                    {f.name} ({formatBytes(f.size)})
                  </span>
                  <button type="button" className="text-rose-400" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                    제거
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="submit"
            disabled={!titleInput.trim() || saving}
            className="rounded-lg bg-sky-600 px-4 py-2 disabled:opacity-50"
          >
            {saving ? '등록 중…' : '등록'}
          </button>
        </form>
      )}
    </div>
  );
}
