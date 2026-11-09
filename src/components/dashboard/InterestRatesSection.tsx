import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import { formatNumber } from '../../lib/format';
import type { IndicatorSummary } from '../../types';
import type { DashboardPayload } from '../../hooks/useEconomicDashboard';

export default function InterestRatesSection({
  items,
  spread,
}: {
  items: IndicatorSummary[];
  spread: DashboardPayload['spread'];
}) {
  const keys = ['base_rate', 'cd_91d', 'ktb_3y', 'corp_aa_3y'];
  const cards = keys.map((k) => items.find((i) => i.indicatorKey === k));
  const ktb = items.find((i) => i.indicatorKey === 'ktb_3y')?.series ?? [];
  const corp = items.find((i) => i.indicatorKey === 'corp_aa_3y')?.series ?? [];
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Interest Rates</h2>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((item) => (
          <IndicatorCard key={item?.indicatorKey} item={item} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-navy-800 p-3">
          <div className="mb-1 text-xs text-slate-400">국고채 3년 / 회사채 AA- 3년 추세 (원본)</div>
          <TrendChart series={ktb.slice(-260)} color="#38bdf8" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-navy-800 p-3">
          <div className="mb-1 text-xs text-slate-400">
            스프레드(회사채 AA- − 국고채 3년) {spread.latest ? `${formatNumber(spread.latest.value, 3)} ${spread.unit}` : 'N/A'} · Calculated
          </div>
          <TrendChart series={spread.series.slice(-260)} color="#fbbf24" />
        </div>
      </div>
    </section>
  );
}
