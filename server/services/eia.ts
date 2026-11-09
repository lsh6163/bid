import type { CatalogMapping } from '../catalog.ts';

interface EiaPoint {
  period: string;
  value: number;
  unit: string;
  sourceTimestamp: string;
}

export async function fetchEiaSeries(item: CatalogMapping): Promise<EiaPoint[]> {
  const key = process.env.EIA_API_KEY;
  if (!key) throw new Error('EIA_API_KEY가 없습니다.');
  const m = item.mapping as { series_id: string };
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  const startStr = start.toISOString().slice(0, 10);
  const url = `https://api.eia.gov/v2/seriesid/${encodeURIComponent(m.series_id)}?api_key=${encodeURIComponent(key)}&start=${startStr}&length=5000`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`EIA HTTP ${res.status}`);
  const json = await res.json() as {
    response?: { data?: Array<{ period?: string; value?: string | number; units?: string }> };
    error?: string;
  };
  if (json.error) throw new Error('EIA API error');
  const rows = json.response?.data ?? [];
  const points: EiaPoint[] = [];
  for (const row of rows) {
    const num = Number(row.value);
    if (!Number.isFinite(num) || !row.period) continue;
    points.push({
      period: row.period,
      value: num,
      unit: row.units || item.unit,
      sourceTimestamp: row.period,
    });
  }
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points;
}
