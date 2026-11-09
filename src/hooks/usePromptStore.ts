import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';
import { api } from '../lib/api';

export function usePromptStore() {
  const [level1, setLevel1] = useState<CategoryLevel1[]>([]);
  const [level2, setLevel2] = useState<CategoryLevel2[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedL2Id, setSelectedL2Id] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l1, l2, p] = await Promise.all([
        api.get<CategoryLevel1[]>('/api/categories/level1'),
        api.get<CategoryLevel2[]>('/api/categories/level2'),
        api.get<PromptTemplate[]>('/api/prompts'),
      ]);
      setLevel1(l1);
      setLevel2(l2);
      setPrompts(p);
      setSelectedL2Id((prev) => {
        if (prev && l2.some((x) => x.id === prev)) return prev;
        return l2[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const promptsInSelected = useMemo(
    () => prompts.filter((p) => p.categoryLevel2Id === selectedL2Id),
    [prompts, selectedL2Id]
  );

  useEffect(() => {
    if (!promptsInSelected.length) {
      setSelectedPromptId(null);
      return;
    }
    setSelectedPromptId((prev) =>
      prev && promptsInSelected.some((p) => p.id === prev) ? prev : promptsInSelected[0].id
    );
  }, [promptsInSelected]);

  const selectedL2 = level2.find((x) => x.id === selectedL2Id) ?? null;
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) ?? null;

  const selectLevel2 = useCallback((id: string) => {
    setSelectedL2Id(id);
  }, []);

  const applySearch = useCallback(
    (q: string) => {
      const needle = q.trim().toLowerCase();
      if (!needle) return;
      const hit = prompts.find((p) =>
        [p.title, p.subtitle, p.agentName, p.agentDescription, p.content, p.tags.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
      if (hit) {
        setSelectedL2Id(hit.categoryLevel2Id);
        setSelectedPromptId(hit.id);
      }
    },
    [prompts]
  );

  return {
    level1,
    level2,
    prompts,
    loading,
    error,
    selectedL2,
    selectedPrompt,
    promptsInSelected,
    selectLevel2,
    setSelectedPromptId,
    reload,
    applySearch,
  };
}
