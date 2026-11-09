import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import { formatPct } from '../../lib/format';
import type { IndicatorSummary } from '../../types';
import type { DashboardPayload } from '../../hooks/useEconomicDashboard';

export default function CommoditiesSection({
  items,
  krw,
}: {
  items: IndicatorSummary[];
  krw: DashboardPayload['krwEffects'];
}) {
  const energy = ['wti', 'brent', 'natgas'].map((k) => items.find((i) => i.indicatorKey === k));
  const metals = ['copper', 'aluminum', 'nickel', 'zinc'].map((k) => items.find((i) => i.indicatorKey === k));
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Commodities</h2>
      <p className="mb-3 text-xs text-slate-500">에너지: U.S. EIA 일간 · 비철금속: IMF PCPS 월간 (일간처럼 보간하지 않음)</p>
      <div className="grid gap-4 md:grid-cols-3">
        {energy.map((item) => (
          <div key={item?.indicatorKey}>
            <IndicatorCard item={item} extra={<KrwLine k={item?.indicatorKey} krw={krw} />} />
            <div className="mt-2 rounded-xl border border-slate-800 bg-navy-800 p-2">
              <TrendChart series={(item?.series ?? []).slice(-180)} color="#fb7185" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {metals.map((item) => (
          <div key={item?.indicatorKey}>
            <IndicatorCard item={item} extra={<KrwLine k={item?.indicatorKey} krw={krw} />} />
            <div className="mt-2 rounded-xl border border-slate-800 bg-navy-800 p-2">
              <TrendChart series={(item?.series ?? []).slice(-24)} color="#a78bfa" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KrwLine({
  k,
  krw,
}: {
  k?: string;
  krw: DashboardPayload['krwEffects'];
}) {
  if (!k || !krw[k]) return null;
  const v = krw[k];
  return (
    <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
      <div>Commodity Effect {formatPct(v.commodity)} · Calculated</div>
      <div>FX Effect {formatPct(v.fx)} · Calculated (월말 USD/KRW)</div>
      <div>Combined KRW Effect {formatPct(v.combined)} · Calculated</div>
    </div>
  );
}
