import { changeClass, formatNumber, formatPct } from '../../lib/format';
import type { DashboardPayload } from '../../hooks/useEconomicDashboard';

export default function ExecutiveSummary({ data }: { data: DashboardPayload }) {
  const riskColor: Record<string, string> = {
    LOW: 'bg-emerald-500/20 text-emerald-300',
    MEDIUM: 'bg-amber-500/20 text-amber-300',
    HIGH: 'bg-orange-500/20 text-orange-300',
    VERY_HIGH: 'bg-rose-500/20 text-rose-300',
  };
  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-navy-800 to-navy-900 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Executive Summary</h2>
        <div className="text-xs text-slate-400">
          상태 {data.status.toUpperCase()}
          {data.asOf && ` · 핵심 지표 중 가장 오래된 기준: ${data.asOf.name} ${data.asOf.period}`}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-navy-950/60 p-4">
          <div className="text-xs text-slate-400">추정 원가 변화율 (3M 가중)</div>
          <div className={`mt-1 text-3xl font-semibold ${changeClass(data.summary.estimatedCostChangePct)}`}>
            {formatPct(data.summary.estimatedCostChangePct)}
          </div>
          <div className="mt-1 text-xs text-slate-500">원가 모델 {data.summary.bidCostStatus}</div>
        </div>
        <div className="rounded-xl bg-navy-950/60 p-4">
          <div className="text-xs text-slate-400">Risk Level</div>
          <div className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${riskColor[data.summary.riskLevel || ''] || 'bg-slate-700'}`}>
            {data.summary.riskLevel ?? 'N/A'}
          </div>
          <div className="mt-2 text-xs text-slate-500">Score {formatNumber(data.summary.riskScore, 2)}</div>
        </div>
        <div className="rounded-xl bg-navy-950/60 p-4 text-xs text-slate-400">
          <p>{data.summary.riskRule}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Factor title="상승 요인 Top 3" items={data.summary.topUp} />
        <Factor title="하락 요인 Top 3" items={data.summary.topDown} />
      </div>
    </section>
  );
}

function Factor({ title, items }: { title: string; items: Array<{ name: string; contributionPct: number | null }> }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-300">{title}</div>
      {items.length === 0 && <div className="text-sm text-slate-500">해당 없음</div>}
      <ul className="space-y-1 text-sm">
        {items.map((it) => (
          <li key={it.name} className="flex justify-between">
            <span>{it.name}</span>
            <span className={changeClass(it.contributionPct)}>{formatPct(it.contributionPct)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
