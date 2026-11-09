import type { ReactNode } from 'react';
import { changeClass, formatNumber, formatPct, formatPeriod } from '../../lib/format';
import type { IndicatorSummary } from '../../types';

export default function IndicatorCard({ item, extra }: { item?: IndicatorSummary | null; extra?: ReactNode }) {
  if (!item) {
    return <div className="rounded-xl border border-slate-800 bg-navy-800 p-4 text-slate-500">N/A</div>;
  }
  const statusLabel =
    item.status === 'missing' ? '데이터 미수신' : item.status === 'error' ? '수집 실패' : item.stale ? 'stale' : null;
  return (
    <div className="rounded-xl border border-slate-800 bg-navy-800 p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-100">{item.displayNameKo}</div>
          <div className="text-xs text-slate-500">{item.sourceLabel}</div>
        </div>
        {statusLabel && (
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase text-amber-300">{statusLabel}</span>
        )}
      </div>
      <div className="my-2 text-2xl font-semibold">
        {item.latest ? formatNumber(item.latest.value) : 'N/A'}
        <span className="ml-1 text-sm font-normal text-slate-500">{item.unit}</span>
      </div>
      <div className="text-xs text-slate-400">{formatPeriod(item.latest?.period, item.frequency)}</div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
        {(['m1', 'm3', 'm6', 'm12'] as const).map((k) => (
          <div key={k}>
            <div className="text-slate-500">{k.toUpperCase()}</div>
            <div className={changeClass(item.changes[k])}>{formatPct(item.changes[k])}</div>
          </div>
        ))}
      </div>
      {item.averages && (
        <div className="mt-2 text-xs text-slate-400">
          30일 평균 {formatNumber(item.averages.d30)} · 90일 평균 {formatNumber(item.averages.d90)}
        </div>
      )}
      {item.statusMessage && <div className="mt-2 text-xs text-rose-400">{item.statusMessage}</div>}
      {extra}
    </div>
  );
}
