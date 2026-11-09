import type { CatalogMapping } from '../catalog.ts';

interface EcosPoint {
  period: string;
  value: number;
  unit: string;
  itemName: string;
  tableName: string;
  sourceTimestamp: string;
}

export async function fetchEcosSeries(item: CatalogMapping): Promise<EcosPoint[]> {
  const key = process.env.ECOS_API_KEY;
  if (!key) throw new Error('ECOS_API_KEY가 없습니다.');
  const m = item.mapping as {
    statistic_table_code: string;
    item_code: string;
    cycle: string;
    statistic_table_name?: string;
    item_name?: string;
  };
  const cycle = m.cycle;
  const now = new Date();
  const start = cycle === 'M'
    ? yyyymm(addMonths(now, -36))
    : yyyymmdd(addDays(now, -800));
  const end = cycle === 'M' ? yyyymm(now) : yyyymmdd(now);
  const url = [
    'https://ecos.bok.or.kr/api/StatisticSearch',
    encodeURIComponent(key),
    'json',
    'kr',
    '1',
    '10000',
    m.statistic_table_code,
    cycle,
    start,
    end,
    encodeURIComponent(m.item_code),
  ].join('/');

  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);
  const json = await res.json() as {
    RESULT?: { CODE?: string; MESSAGE?: string };
    StatisticSearch?: { row?: Array<Record<string, string>> };
  };
  if (json.RESULT?.CODE && json.RESULT.CODE !== 'INFO-000' && !json.StatisticSearch?.row) {
    throw new Error(json.RESULT.MESSAGE || json.RESULT.CODE);
  }
  const rows = json.StatisticSearch?.row ?? [];
  const points: EcosPoint[] = [];
  for (const row of rows) {
    const raw = row.DATA_VALUE;
    const num = Number(raw);
    if (!Number.isFinite(num)) continue;
    const time = row.TIME;
    if (!time) continue;
    points.push({
      period: cycle === 'M' ? `${time.slice(0, 4)}-${time.slice(4, 6)}` : `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}`,
      value: num,
      unit: row.UNIT_NAME || item.unit,
      itemName: row.ITEM_NAME1 || m.item_name || item.displayNameKo,
      tableName: row.STAT_NAME || m.statistic_table_name || '',
      sourceTimestamp: cycle === 'M'
        ? `${time.slice(0, 4)}-${time.slice(4, 6)}-01`
        : `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}`,
    });
  }
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points;
}

function yyyymm(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function yyyymmdd(d: Date): string {
  return `${yyyymm(d)}${String(d.getDate()).padStart(2, '0')}`;
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
