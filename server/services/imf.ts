import type { CatalogMapping } from '../catalog.ts';

interface ImfPoint {
  period: string;
  value: number;
  unit: string;
  sourceTimestamp: string;
}

export async function fetchImfSeries(item: CatalogMapping): Promise<ImfPoint[]> {
  const m = item.mapping as { series_key?: string; indicator: string };
  const key = m.series_key || `G001.${m.indicator}.USD.M`;
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  const startPeriod = `${start.getFullYear()}-01`;
  const url = `https://api.imf.org/external/sdmx/2.1/data/IMF.RES,PCPS,9.0.0/${key}?startPeriod=${startPeriod}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.sdmx.data+json;version=1.0.0, application/json',
      'User-Agent': 'posco-steeleon-bid-support/1.0',
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`IMF HTTP ${res.status}`);
  const json = await res.json() as {
    dataSets?: Array<{
      series?: Record<string, { observations?: Record<string, Array<string | number | null>> }>;
    }>;
    structure?: {
      dimensions?: {
        observation?: Array<{ values?: Array<{ id?: string; start?: string }> }>;
      };
    };
  };
  const series = json.dataSets?.[0]?.series;
  const timeValues = json.structure?.dimensions?.observation?.[0]?.values ?? [];
  if (!series) throw new Error('IMF 응답에 시계열이 없습니다.');
  const first = Object.values(series)[0];
  const observations = first?.observations ?? {};
  const points: ImfPoint[] = [];
  for (const [idx, obs] of Object.entries(observations)) {
    const raw = obs?.[0];
    const num = Number(raw);
    if (!Number.isFinite(num)) continue;
    const time = timeValues[Number(idx)];
    const period = normalizeImfPeriod(time?.id || time?.start);
    if (!period) continue;
    points.push({
      period,
      value: num,
      unit: item.unit,
      sourceTimestamp: period,
    });
  }
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points;
}

function normalizeImfPeriod(id?: string): string | null {
  if (!id) return null;
  const m = id.match(/^(\d{4})-M(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  const m2 = id.match(/^(\d{4}-\d{2})/);
  if (m2) return m2[1];
  return null;
}
