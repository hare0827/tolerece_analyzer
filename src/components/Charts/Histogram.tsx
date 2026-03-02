import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { fmt4 } from '../../utils/formatters';

interface Props {
  histogram: { bin: number; count: number }[];
  targetTol: number;
  p99: number;
}

export function Histogram({ histogram, targetTol, p99 }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Monte Carlo 분포 히스토그램
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={histogram} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="bin"
            tickFormatter={(v: unknown) => fmt4(Number(v))}
            tick={{ fontSize: 10, fontFamily: 'monospace' }}
          />
          <YAxis tick={{ fontSize: 10 }} width={40} />
          <Tooltip
            formatter={(v: number | undefined) => [v ?? 0, '빈도']}
            labelFormatter={(l: unknown) => `구간: ${fmt4(Number(l))} mm`}
          />
          <Bar dataKey="count" fill="#93c5fd" radius={[2, 2, 0, 0]} />
          {/* +방향 기준선 */}
          <ReferenceLine
            x={p99}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: '+P99', position: 'top', fontSize: 9, fill: '#ef4444' }}
          />
          <ReferenceLine
            x={-p99}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: '-P99', position: 'top', fontSize: 9, fill: '#ef4444' }}
          />
          <ReferenceLine
            x={targetTol}
            stroke="#16a34a"
            strokeDasharray="4 2"
            label={{ value: '+목표', position: 'top', fontSize: 9, fill: '#16a34a' }}
          />
          <ReferenceLine
            x={-targetTol}
            stroke="#16a34a"
            strokeDasharray="4 2"
            label={{ value: '-목표', position: 'top', fontSize: 9, fill: '#16a34a' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
