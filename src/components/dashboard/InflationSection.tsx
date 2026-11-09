import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import type { IndicatorSummary } from '../../types';

export default function InflationSection({ items }: { items: IndicatorSummary[] }) {
  const ppi = items.find((i) => i.indicatorKey === 'ppi');
  const cpi = items.find((i) => i.indicatorKey === 'cpi');
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Inflation</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <IndicatorCard item={ppi} />
          <div className="mt-3 rounded-xl border border-slate-800 bg-navy-800 p-3">
            <div className="mb-1 text-xs text-slate-400">최근 24개월 PPI · Calculated: 추세</div>
            <TrendChart series={(ppi?.series ?? []).slice(-24)} color="#f59e0b" />
          </div>
        </div>
        <div>
          <IndicatorCard item={cpi} />
          <div className="mt-3 rounded-xl border border-slate-800 bg-navy-800 p-3">
            <div className="mb-1 text-xs text-slate-400">최근 24개월 CPI · Calculated: 추세</div>
            <TrendChart series={(cpi?.series ?? []).slice(-24)} color="#38bdf8" />
          </div>
        </div>
      </div>
    </section>
  );
}
