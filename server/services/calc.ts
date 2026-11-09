export interface Obs {
  period: string;
  value: number;
}

export function pctChange(latest: number, past: number): number | null {
  if (!Number.isFinite(latest) || !Number.isFinite(past) || past === 0) return null;
  return ((latest - past) / past) * 100;
}

export function findByOffset(points: Obs[], offset: number): Obs | null {
  if (points.length < offset + 1) return null;
  return points[points.length - 1 - offset] ?? null;
}

export function findByDaysAgo(points: Obs[], days: number, tolerance = 5): Obs | null {
  if (!points.length) return null;
  const latest = parsePeriodDate(points[points.length - 1].period);
  if (!latest) return null;
  const target = new Date(latest);
  target.setDate(target.getDate() - days);
  let best: Obs | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const d = parsePeriodDate(p.period);
    if (!d) continue;
    const diff = Math.abs(d.getTime() - target.getTime()) / 86400000;
    if (diff <= tolerance && diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

export function averageLastDays(points: Obs[], days: number): number | null {
  if (!points.length) return null;
  const latest = parsePeriodDate(points[points.length - 1].period);
  if (!latest) return null;
  const from = new Date(latest);
  from.setDate(from.getDate() - days);
  const vals = points
    .filter((p) => {
      const d = parsePeriodDate(p.period);
      return d && d >= from && d <= latest;
    })
    .map((p) => p.value)
    .filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function parsePeriodDate(period: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return new Date(`${period}T00:00:00Z`);
  if (/^\d{4}-\d{2}$/.test(period)) return new Date(`${period}-01T00:00:00Z`);
  return null;
}

export function changesFor(
  points: Obs[],
  frequency: string
): { m1: number | null; m3: number | null; m6: number | null; m12: number | null } {
  const latest = points[points.length - 1];
  if (!latest) return { m1: null, m3: null, m6: null, m12: null };
  const past = (span: number) =>
    frequency === 'monthly' ? findByOffset(points, span) : findByDaysAgo(points, span === 1 ? 30 : span === 3 ? 90 : span === 6 ? 180 : 365);
  const c = (span: number) => {
    const p = past(span);
    return p ? pctChange(latest.value, p.value) : null;
  };
  return { m1: c(1), m3: c(3), m6: c(6), m12: c(12) };
}

export function isStale(period: string, frequency: string, fetchedAt: string | null): boolean {
  const d = parsePeriodDate(period);
  if (!d) return true;
  const now = Date.now();
  const ageDays = (now - d.getTime()) / 86400000;
  if (frequency === 'daily' && ageDays > 7) return true;
  if (frequency === 'monthly' && ageDays > 70) return true;
  if (fetchedAt) {
    const fetched = Date.parse(fetchedAt);
    if (Number.isFinite(fetched) && now - fetched > 48 * 3600 * 1000) return true;
  }
  return false;
}

export function monthEndFx(fxDaily: Obs[], yyyyMm: string): Obs | null {
  const inMonth = fxDaily.filter((p) => p.period.startsWith(yyyyMm));
  return inMonth.length ? inMonth[inMonth.length - 1] : null;
}

export function krwEffects(
  commodity: Obs[],
  fxDaily: Obs[],
  monthsBack: number
): { commodity: number | null; fx: number | null; combined: number | null; asOf: string | null } {
  const latestC = commodity[commodity.length - 1];
  const pastC = findByOffset(commodity, monthsBack);
  if (!latestC || !pastC) return { commodity: null, fx: null, combined: null, asOf: null };
  const fxLatest = monthEndFx(fxDaily, latestC.period.slice(0, 7));
  const fxPast = monthEndFx(fxDaily, pastC.period.slice(0, 7));
  const commodityChg = pctChange(latestC.value, pastC.value);
  if (!fxLatest || !fxPast) {
    return { commodity: commodityChg, fx: null, combined: null, asOf: latestC.period };
  }
  const fxChg = pctChange(fxLatest.value, fxPast.value);
  const combined = pctChange(latestC.value * fxLatest.value, pastC.value * fxPast.value);
  return { commodity: commodityChg, fx: fxChg, combined, asOf: latestC.period };
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export function riskLevel(score: number): RiskLevel {
  if (score < 3) return 'LOW';
  if (score < 8) return 'MEDIUM';
  if (score < 15) return 'HIGH';
  return 'VERY_HIGH';
}

export const RISK_RULE_TEXT =
  'Risk Score = 0.35×|원자재 3M 평균변화율| + 0.25×|USD/KRW 3M| + 0.25×|PPI 3M| + 0.15×|회사채AA- 3M(pp)×10|. LOW<3, MEDIUM<8, HIGH<15, 그 외 VERY_HIGH. 결측 항목은 가중치에서 제외하고 Partial로 표시합니다.';
