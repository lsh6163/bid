import { useCallback, useState } from 'react';
import { api, getToken } from '../lib/api';
import type { HelpBoardView, HelpPost } from '../types';

export function useHelpBoard() {
  const [view, setView] = useState<HelpBoardView>('list');
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [current, setCurrent] = useState<HelpPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<HelpPost[]>('/api/help-posts');
      setPosts(data);
      setView('list');
      setCurrent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<HelpPost>(`/api/help-posts/${id}`);
      setCurrent(data);
      setView('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시물을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(async (title: string, body: string, files: File[]) => {
    const form = new FormData();
    form.append('title', title);
    form.append('body', body);
    files.forEach((f) => form.append('files', f));
    const headers: HeadersInit = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/help-posts', { method: 'POST', body: form, headers, credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '등록에 실패했습니다.');
    }
    await loadList();
  }, [loadList]);

  const deletePost = useCallback(async (id: string) => {
    await api.del(`/api/help-posts/${id}`);
    await loadList();
  }, [loadList]);

  return { view, setView, posts, current, loading, error, loadList, openDetail, createPost, deletePost };
}
