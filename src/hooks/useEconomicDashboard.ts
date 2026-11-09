import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BidCostResult, BidCostScenario, IndicatorSummary } from '../types';

export interface DashboardPayload {
  status: 'ok' | 'partial' | 'error';
  generatedAt: string;
  providers: string[];
  asOf: { period: string; indicatorKey: string; name: string } | null;
  summary: {
    estimatedCostChangePct: number | null;
    riskLevel: string | null;
    riskScore: number | null;
    riskRule: string;
    topUp: Array<{ name: string; contributionPct: number | null }>;
    topDown: Array<{ name: string; contributionPct: number | null }>;
    bidCostStatus: string;
  };
  indicators: IndicatorSummary[];
  krwEffects: Record<string, { commodity: number | null; fx: number | null; combined: number | null; asOf: string | null }>;
  spread: { latest: { period: string; value: number } | null; series: Array<{ period: string; value: number }>; unit: string };
  bidCost: BidCostResult & { scenario: BidCostScenario };
  notes: string[];
  issues: Array<{ key: string; status: string; message?: string }>;
}

export function useEconomicDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.get<DashboardPayload>('/api/economic/summary');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대시보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveScenario = useCallback(async (scenario: BidCostScenario) => {
    await api.put('/api/economic/bid-cost', scenario);
    await reload();
  }, [reload]);

  const calculate = useCallback(async (scenario: BidCostScenario) => {
    return api.post<BidCostResult>('/api/economic/bid-cost/calculate', scenario);
  }, []);

  return { data, loading, error, reload, saveScenario, calculate };
}
