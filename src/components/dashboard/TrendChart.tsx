import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function TrendChart({
  series,
  color = '#38bdf8',
  extra,
}: {
  series: Array<{ period: string; value: number }>;
  color?: string;
  extra?: Array<{ period: string; value: number | null; color: string; name: string }>;
}) {
  if (!series.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-slate-500">시계열 없음</div>;
  }
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <XAxis dataKey="period" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
            formatter={(v: number) => [v, '원본']}
          />
          <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
