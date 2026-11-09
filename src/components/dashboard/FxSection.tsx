import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import { formatNumber } from '../../lib/format';
import type { IndicatorSummary } from '../../types';

export default function FxSection({ items }: { items: IndicatorSummary[] }) {
  const usd = items.find((i) => i.indicatorKey === 'usdkrw');
  const extras = items.filter((i) => ['jpykrw', 'eurkrw', 'cnykrw'].includes(i.indicatorKey));
  const series = (usd?.series ?? []).slice(-260);
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">FX</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <IndicatorCard
          item={usd}
          extra={
            usd?.averages && (
              <div className="mt-2 text-xs text-slate-400">
                1M 평균 {formatNumber(usd.averages.d30)} · 3M 평균 {formatNumber(usd.averages.d90)}
              </div>
            )
          }
        />
        <div className="rounded-xl border border-slate-800 bg-navy-800 p-3">
          <div className="mb-1 text-xs text-slate-400">USD/KRW 최근 12개월 · 원본 일간 (평균선은 카드의 30/90일 평균)</div>
          <TrendChart series={series} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {extras.map((item) => (
          <IndicatorCard key={item.indicatorKey} item={item} />
        ))}
      </div>
    </section>
  );
}
