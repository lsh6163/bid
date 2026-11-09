import crypto from 'node:crypto';
import { query } from '../db.ts';
import { INDICATOR_CATALOG, sourceLabel, type CatalogMapping } from '../catalog.ts';
import { fetchEcosSeries } from './ecos.ts';
import { fetchEiaSeries } from './eia.ts';
import { fetchImfSeries } from './imf.ts';
import {
  averageLastDays,
  changesFor,
  isStale,
  krwEffects,
  RISK_RULE_TEXT,
  riskLevel,
  type Obs,
} from './calc.ts';

const lastFetchError = new Map<string, string>();
let refreshInFlight: Promise<void> | null = null;

export async function refreshAll(force = false): Promise<{ ok: string[]; failed: Array<{ key: string; error: string }> }> {
  if (refreshInFlight) {
    await refreshInFlight;
  }
  const task = (async () => {
    const ok: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];
    for (const item of INDICATOR_CATALOG) {
      try {
        if (!force && !(await needsRefresh(item))) {
          ok.push(item.indicatorKey);
          continue;
        }
        await refreshOne(item);
        lastFetchError.delete(item.indicatorKey);
        ok.push(item.indicatorKey);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        lastFetchError.set(item.indicatorKey, msg);
        failed.push({ key: item.indicatorKey, error: msg });
      }
    }
    (refreshAll as { last?: { ok: string[]; failed: Array<{ key: string; error: string }> } }).last = { ok, failed };
  })();
  refreshInFlight = task;
  try {
    await task;
  } finally {
    refreshInFlight = null;
  }
  return ((refreshAll as { last?: { ok: string[]; failed: Array<{ key: string; error: string }> } }).last) || {
    ok: [],
    failed: [],
  };
}

async function needsRefresh(item: CatalogMapping): Promise<boolean> {
  const row = await query<{ fetched_at: string }>(
    `SELECT fetched_at FROM economic_observations WHERE indicator_key = $1 ORDER BY fetched_at DESC LIMIT 1`,
    [item.indicatorKey]
  );
  const fetchedAt = row.rows[0]?.fetched_at;
  if (!fetchedAt) return true;
  const ageH = (Date.now() - Date.parse(fetchedAt)) / 3600000;
  if (item.frequency === 'daily') return ageH > 6;
  return ageH > 24;
}

async function refreshOne(item: CatalogMapping): Promise<void> {
  let points: Array<{ period: string; value: number; unit: string; sourceTimestamp: string }>;
  if (item.provider === 'ECOS') points = await fetchEcosSeries(item);
  else if (item.provider === 'EIA') points = await fetchEiaSeries(item);
  else points = await fetchImfSeries(item);

  if (!points.length) throw new Error('관측값이 없습니다.');
  const fetchedAt = new Date().toISOString();
  const sourceReference = JSON.stringify(item.mapping);
  const chunkSize = 80;
  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize);
    const params: unknown[] = [];
    const placeholders = chunk.map((p, idx) => {
      const b = idx * 9;
      params.push(
        crypto.randomUUID(),
        item.indicatorKey,
        p.period,
        p.value,
        p.unit,
        item.currency ?? null,
        p.sourceTimestamp,
        fetchedAt,
        sourceReference
      );
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},0)`;
    });
    await query(
      `INSERT INTO economic_observations
        (id, indicator_key, period, value, unit, currency, source_timestamp, fetched_at, source_reference, is_estimated)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (indicator_key, period) DO UPDATE SET
         value = EXCLUDED.value,
         unit = EXCLUDED.unit,
         currency = EXCLUDED.currency,
         source_timestamp = EXCLUDED.source_timestamp,
         fetched_at = EXCLUDED.fetched_at,
         source_reference = EXCLUDED.source_reference,
         is_estimated = 0`,
      params
    );
  }
}

export async function loadPoints(key: string): Promise<Array<Obs & { unit?: string; fetchedAt?: string; sourceTimestamp?: string }>> {
  const res = await query<{
    period: string;
    value: number;
    unit: string | null;
    fetched_at: string;
    source_timestamp: string | null;
  }>(
    `SELECT period, value, unit, fetched_at, source_timestamp
     FROM economic_observations WHERE indicator_key = $1 ORDER BY period ASC`,
    [key]
  );
  return res.rows.map((r) => ({
    period: r.period,
    value: Number(r.value),
    unit: r.unit ?? undefined,
    fetchedAt: r.fetched_at,
    sourceTimestamp: r.source_timestamp ?? undefined,
  }));
}

export async function buildIndicatorSummary(key: string) {
  const item = INDICATOR_CATALOG.find((c) => c.indicatorKey === key);
  if (!item) return null;
  const points = await loadPoints(key);
  const latest = points[points.length - 1] ?? null;
  const err = lastFetchError.get(key);
  const stale = latest ? isStale(latest.period, item.frequency, latest.fetchedAt ?? null) : true;
  let status: 'ok' | 'missing' | 'error' | 'stale' = 'ok';
  if (!latest) status = err ? 'error' : 'missing';
  else if (err) status = 'error';
  else if (stale) status = 'stale';
  const chg = changesFor(points, item.frequency);
  return {
    indicatorKey: key,
    provider: item.provider,
    displayNameKo: item.displayNameKo,
    category: item.category,
    frequency: item.frequency,
    unit: latest?.unit || item.unit,
    currency: item.currency,
    latest: latest
      ? {
          indicatorKey: key,
          provider: item.provider,
          indicatorName: item.displayNameKo,
          category: item.category,
          period: latest.period,
          frequency: item.frequency,
          value: latest.value,
          unit: latest.unit || item.unit,
          currency: item.currency,
          sourceTimestamp: latest.sourceTimestamp || latest.period,
          fetchedAt: latest.fetchedAt || '',
          sourceReference: JSON.stringify(item.mapping),
          isEstimated: false,
        }
      : null,
    changes: chg,
    averages:
      item.frequency === 'daily'
        ? { d30: averageLastDays(points, 30), d90: averageLastDays(points, 90) }
        : undefined,
    stale,
    status,
    statusMessage: err || undefined,
    sourceLabel: sourceLabel(item.provider),
    series: points.map((p) => ({ period: p.period, value: p.value })),
  };
}

export async function dashboardPayload() {
  await refreshAll(false);
  const summaries = [];
  for (const item of INDICATOR_CATALOG) {
    summaries.push(await buildIndicatorSummary(item.indicatorKey));
  }
  const byKey = Object.fromEntries(summaries.filter(Boolean).map((s) => [s!.indicatorKey, s]));
  const fxPoints = await loadPoints('usdkrw');
  const krw = {
    copper: krwEffects(await loadPoints('copper'), fxPoints, 3),
    aluminum: krwEffects(await loadPoints('aluminum'), fxPoints, 3),
    nickel: krwEffects(await loadPoints('nickel'), fxPoints, 3),
    zinc: krwEffects(await loadPoints('zinc'), fxPoints, 3),
    wti: krwEffects(await loadPoints('wti'), fxPoints, 3),
  };

  const ktb = await loadPoints('ktb_3y');
  const corp = await loadPoints('corp_aa_3y');
  const spread = buildSpread(ktb, corp);

  const scenario = await loadDefaultScenario();
  const bidCost = calculateBidCost(scenario, byKey as Record<string, Awaited<ReturnType<typeof buildIndicatorSummary>>>, krw);

  const coreKeys = ['ppi', 'cpi', 'usdkrw', 'base_rate', 'wti', 'copper'];
  const coreLatest = coreKeys
    .map((k) => byKey[k]?.latest)
    .filter(Boolean);
  const oldest = [...coreLatest].sort((a, b) => a!.period.localeCompare(b!.period))[0] ?? null;

  const failed = summaries.filter((s) => s && (s.status === 'error' || s.status === 'missing'));
  const status = failed.length === 0 ? 'ok' : failed.length === summaries.length ? 'error' : 'partial';

  return {
    status,
    generatedAt: new Date().toISOString(),
    providers: ['ECOS', 'EIA', 'IMF'],
    asOf: oldest ? { period: oldest.period, indicatorKey: oldest.indicatorKey, name: oldest.indicatorName } : null,
    summary: {
      estimatedCostChangePct: bidCost.totalChangePct,
      riskLevel: bidCost.riskLevel,
      riskScore: bidCost.riskScore,
      riskRule: RISK_RULE_TEXT,
      topUp: [...bidCost.items].filter((i) => (i.contributionPct ?? 0) > 0).sort((a, b) => (b.contributionPct ?? 0) - (a.contributionPct ?? 0)).slice(0, 3),
      topDown: [...bidCost.items].filter((i) => (i.contributionPct ?? 0) < 0).sort((a, b) => (a.contributionPct ?? 0) - (b.contributionPct ?? 0)).slice(0, 3),
      bidCostStatus: bidCost.status,
    },
    indicators: summaries,
    krwEffects: krw,
    spread,
    bidCost,
    notes: [
      '국제 철강 현물가격은 3-provider 제약으로 제공하지 않습니다. 철강은 ECOS PPI·수입물가·USD/KRW 조합으로 추정합니다.',
      '월간 지표(PPI/CPI/IMF)는 최신 발표월 기준이며 일간 시세처럼 표시하지 않습니다.',
      '결측치는 0으로 채우지 않습니다.',
    ],
    issues: failed.map((s) => ({ key: s!.indicatorKey, status: s!.status, message: s!.statusMessage })),
  };
}

function buildSpread(ktb: Obs[], corp: Obs[]) {
  const ktbMap = new Map(ktb.map((p) => [p.period, p.value]));
  const series = corp
    .filter((p) => ktbMap.has(p.period))
    .map((p) => ({ period: p.period, value: p.value - (ktbMap.get(p.period) as number) }));
  const latest = series[series.length - 1] ?? null;
  return { latest, series, unit: 'percentage point' };
}

export async function loadDefaultScenario() {
  const res = await query<{
    id: string;
    name: string;
    base_cost: number | null;
    base_fx: number | null;
    weights_json: string;
    risk_weights_json: string | null;
  }>('SELECT * FROM bid_cost_scenarios ORDER BY updated_at DESC LIMIT 1');
  const row = res.rows[0];
  if (!row) {
    return {
      id: 'bcs-default',
      name: '기본 입찰 시나리오',
      baseCost: 1000000000,
      baseFx: null,
      weights: [],
      riskWeights: { commodity: 0.35, fx: 0.25, ppi: 0.25, rate: 0.15 },
    };
  }
  return {
    id: row.id,
    name: row.name,
    baseCost: row.base_cost,
    baseFx: row.base_fx,
    weights: JSON.parse(row.weights_json) as Array<{ id: string; name: string; weightPct: number; indicatorKeys: string[] }>,
    riskWeights: row.risk_weights_json
      ? JSON.parse(row.risk_weights_json)
      : { commodity: 0.35, fx: 0.25, ppi: 0.25, rate: 0.15 },
  };
}

export function calculateBidCost(
  scenario: Awaited<ReturnType<typeof loadDefaultScenario>>,
  byKey: Record<string, Awaited<ReturnType<typeof buildIndicatorSummary>>>,
  krw: Record<string, { combined: number | null; commodity: number | null; fx: number | null }>
) {
  const weightSum = scenario.weights.reduce((s, w) => s + Number(w.weightPct || 0), 0);
  const weightWarning = Math.abs(weightSum - 100) > 0.05;
  const items = scenario.weights.map((w) => {
    const drivers: string[] = [];
    const rates: number[] = [];
    let incomplete = false;
    for (const key of w.indicatorKeys) {
      if (['copper', 'aluminum', 'nickel', 'zinc', 'wti', 'brent'].includes(key) && krw[key]?.combined != null) {
        rates.push(krw[key].combined as number);
        drivers.push(`${key} Combined KRW 3M`);
        continue;
      }
      const chg = byKey[key]?.changes?.m3;
      if (chg == null) {
        incomplete = true;
        continue;
      }
      rates.push(chg);
      drivers.push(`${key} 3M`);
    }
    const impact = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const contribution = impact == null ? null : (w.weightPct / 100) * impact;
    return {
      id: w.id,
      name: w.name,
      weightPct: w.weightPct,
      impactPct: impact,
      contributionPct: contribution,
      drivers,
      incomplete,
    };
  });
  const usable = items.filter((i) => i.contributionPct != null);
  const total = usable.length ? usable.reduce((s, i) => s + (i.contributionPct as number), 0) : null;
  const estimatedCost =
    total != null && scenario.baseCost != null ? scenario.baseCost * (1 + total / 100) : null;
  const incomplete = items.some((i) => i.incomplete) || usable.length < items.length;
  const ppi = Math.abs(byKey.ppi?.changes?.m3 ?? NaN);
  const fx = Math.abs(byKey.usdkrw?.changes?.m3 ?? NaN);
  const corp = Math.abs(byKey.corp_aa_3y?.changes?.m3 ?? NaN);
  const commKeys = ['copper', 'aluminum', 'nickel', 'zinc', 'wti'];
  const commVals = commKeys.map((k) => Math.abs(byKey[k]?.changes?.m3 ?? NaN)).filter((n) => Number.isFinite(n));
  const comm = commVals.length ? commVals.reduce((a, b) => a + b, 0) / commVals.length : NaN;
  const rw = scenario.riskWeights;
  const parts: Array<{ w: number; v: number }> = [];
  if (Number.isFinite(comm)) parts.push({ w: rw.commodity, v: comm });
  if (Number.isFinite(fx)) parts.push({ w: rw.fx, v: fx });
  if (Number.isFinite(ppi)) parts.push({ w: rw.ppi, v: ppi });
  if (Number.isFinite(corp)) parts.push({ w: rw.rate, v: corp * 10 });
  const wsum = parts.reduce((s, p) => s + p.w, 0);
  const score = wsum > 0 ? parts.reduce((s, p) => s + p.w * p.v, 0) / wsum : null;
  const notes: string[] = [];
  if (weightWarning) notes.push(`원가 비중 합이 ${weightSum.toFixed(1)}%입니다. 100%가 아니면 자동 보정하지 않습니다.`);
  if (incomplete) notes.push('일부 지표가 없어 원가 변화율은 Partial/Incomplete입니다.');
  notes.push('철강 항목은 국제 현물 대신 ECOS PPI·수입물가·환율을 사용합니다.');
  return {
    status: (incomplete ? (usable.length ? 'partial' : 'incomplete') : 'ok') as 'ok' | 'partial' | 'incomplete',
    totalChangePct: total,
    estimatedCost,
    riskLevel: score == null ? null : riskLevel(score),
    riskScore: score,
    weightSum,
    weightWarning,
    items,
    notes,
    scenario,
  };
}

export async function saveScenario(body: {
  id?: string;
  name: string;
  baseCost: number | null;
  baseFx: number | null;
  weights: unknown;
  riskWeights?: unknown;
}) {
  const id = body.id || 'bcs-default';
  await query(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       base_cost = EXCLUDED.base_cost,
       base_fx = EXCLUDED.base_fx,
       weights_json = EXCLUDED.weights_json,
       risk_weights_json = EXCLUDED.risk_weights_json,
       updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      body.name,
      body.baseCost,
      body.baseFx,
      JSON.stringify(body.weights),
      JSON.stringify(body.riskWeights ?? { commodity: 0.35, fx: 0.25, ppi: 0.25, rate: 0.15 }),
    ]
  );
  return loadDefaultScenario();
}
