import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { SensitivityItem } from '../../types/tolerance';
import { fmtPct } from '../../utils/formatters';

interface Props {
  sensitivity: SensitivityItem[];
  partNames: Record<string, string>;
}

export function SensitivityChart({ sensitivity, partNames }: Props) {
  const data = sensitivity.map((s) => ({
    subject: partNames[s.partId] || s.partId,
    value: +s.percentage.toFixed(1),
  }));

  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        기여도 레이더
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <Radar
            name="기여도"
            dataKey="value"
            stroke="#f97316"
            fill="#fb923c"
            fillOpacity={0.4}
          />
          <Tooltip formatter={(v: number) => [fmtPct(v), '기여도']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
