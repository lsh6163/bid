import { RefreshCw } from 'lucide-react';
import { useEconomicDashboard } from '../../hooks/useEconomicDashboard';
import ExecutiveSummary from './ExecutiveSummary';
import InflationSection from './InflationSection';
import FxSection from './FxSection';
import CommoditiesSection from './CommoditiesSection';
import InterestRatesSection from './InterestRatesSection';
import BidCostModel from './BidCostModel';
import type { IndicatorSummary } from '../../types';

export default function EconomicDashboard() {
  const { data, loading, error, reload, saveScenario, calculate } = useEconomicDashboard();

  if (loading && !data) {
    return <div className="flex h-full items-center justify-center text-slate-400">경제지표를 불러오는 중… 서버 캐시·외부 API를 확인합니다.</div>;
  }
  if (error && !data) {
    return (
      <div className="p-8">
        <p className="mb-3 text-rose-400">{error}</p>
        <button className="rounded bg-slate-700 px-3 py-1" onClick={() => void reload()}>다시 시도</button>
      </div>
    );
  }
  if (!data) return null;

  const indicators = (data.indicators || []).filter(Boolean) as IndicatorSummary[];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">입찰 경제지표 대시보드</h1>
          <p className="text-sm text-slate-400">공급자: Bank of Korea ECOS · U.S. EIA · IMF PCPS</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm" onClick={() => void reload()}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>
      {data.status !== 'ok' && (
        <div className="mb-4 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          대시보드 상태: {data.status.toUpperCase()}. 실패한 지표는 0으로 채우지 않습니다.
        </div>
      )}
      <div className="space-y-10">
        <ExecutiveSummary data={data} />
        <InflationSection items={indicators} />
        <FxSection items={indicators} />
        <CommoditiesSection items={indicators} krw={data.krwEffects} />
        <InterestRatesSection items={indicators} spread={data.spread} />
        <BidCostModel data={data} onSave={saveScenario} onCalculate={calculate} />
        <p className="pb-8 text-xs text-slate-600">{data.notes.join(' · ')}</p>
      </div>
    </div>
  );
}
