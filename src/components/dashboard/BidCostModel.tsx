import { useEffect, useState } from 'react';
import { changeClass, formatNumber, formatPct } from '../../lib/format';
import type { BidCostResult, BidCostScenario } from '../../types';
import type { DashboardPayload } from '../../hooks/useEconomicDashboard';

interface Props {
  data: DashboardPayload;
  onSave: (scenario: BidCostScenario) => Promise<void>;
  onCalculate: (scenario: BidCostScenario) => Promise<BidCostResult>;
}

export default function BidCostModel({ data, onSave, onCalculate }: Props) {
  const [scenario, setScenario] = useState<BidCostScenario>(data.bidCost.scenario);
  const [result, setResult] = useState<BidCostResult>(data.bidCost);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScenario(data.bidCost.scenario);
    setResult(data.bidCost);
  }, [data]);

  const weightSum = scenario.weights.reduce((s, w) => s + Number(w.weightPct || 0), 0);

  async function recalc() {
    setBusy(true);
    try {
      setResult(await onCalculate(scenario));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Bid Cost Model</h2>
      <p className="mb-3 text-xs text-slate-500">
        철강은 국제 현물 API가 없어 ECOS PPI·수입물가·USD/KRW로 대체합니다. 비중 합이 100%가 아니면 자동 보정하지 않습니다.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          프로젝트/입찰명
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-navy-950 px-2 py-1"
            value={scenario.name}
            onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
          />
        </label>
        <label className="text-sm">
          기준 원가
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-700 bg-navy-950 px-2 py-1"
            value={scenario.baseCost ?? ''}
            onChange={(e) => setScenario({ ...scenario, baseCost: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          기준 환율 (비우면 최신 USD/KRW)
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-700 bg-navy-950 px-2 py-1"
            value={scenario.baseFx ?? ''}
            onChange={(e) => setScenario({ ...scenario, baseFx: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
      </div>
      {Math.abs(weightSum - 100) > 0.05 && (
        <div className="mt-3 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          원가 비중 합이 {weightSum.toFixed(1)}%입니다. 100%가 되도록 직접 조정하세요. 자동 수정하지 않습니다.
        </div>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">항목</th>
              <th>비중 %</th>
              <th>연결 지표</th>
              <th>영향도</th>
              <th>기여도</th>
            </tr>
          </thead>
          <tbody>
            {scenario.weights.map((w, idx) => {
              const r = result.items.find((i) => i.id === w.id);
              return (
                <tr key={w.id} className="border-t border-slate-800">
                  <td className="py-2">{w.name}</td>
                  <td>
                    <input
                      type="number"
                      className="w-20 rounded bg-navy-950 px-2 py-1"
                      value={w.weightPct}
                      onChange={(e) => {
                        const weights = scenario.weights.map((x, i) => i === idx ? { ...x, weightPct: Number(e.target.value) } : x);
                        setScenario({ ...scenario, weights });
                      }}
                    />
                  </td>
                  <td className="text-xs text-slate-400">{w.indicatorKeys.join(', ')}</td>
                  <td className={changeClass(r?.impactPct ?? null)}>{formatPct(r?.impactPct ?? null)}{r?.incomplete ? ' *' : ''}</td>
                  <td className={changeClass(r?.contributionPct ?? null)}>{formatPct(r?.contributionPct ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-lg bg-slate-700 px-4 py-2" onClick={() => void recalc()} disabled={busy}>다시 계산</button>
        <button className="rounded-lg bg-sky-600 px-4 py-2" onClick={() => void onSave(scenario)} disabled={busy}>시나리오 저장</button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Stat label="총 추정 원가 변화율" value={formatPct(result.totalChangePct)} />
        <Stat label="추정 원가" value={formatNumber(result.estimatedCost, 0)} />
        <Stat label={`Risk ${result.riskLevel ?? 'N/A'} / ${result.status}`} value={formatNumber(result.riskScore, 2)} />
      </div>
      <ul className="mt-3 list-disc pl-5 text-xs text-slate-500">
        {result.notes.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-navy-800 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
