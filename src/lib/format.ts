export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatPeriod(period?: string | null, frequency?: string): string {
  if (!period) return 'N/A';
  if (frequency === 'monthly' || /^\d{4}-\d{2}$/.test(period)) return `${period} (월간)`;
  return `${period} (일간)`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function changeClass(value: number | null | undefined): string {
  if (value == null) return 'text-slate-400';
  if (value > 0) return 'text-rose-400';
  if (value < 0) return 'text-emerald-400';
  return 'text-slate-300';
}
