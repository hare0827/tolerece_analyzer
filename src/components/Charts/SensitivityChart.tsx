import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { SensitivityItem } from '../../types/tolerance';
import { fmtPct } from '../../utils/formatters';

interface Props {
  sensitivity: SensitivityItem[];
}

export function SensitivityChart({ sensitivity }: Props) {
  const data = sensitivity.map((s) => ({
    subject: s.name,
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
            strokeWidth={2}
            fill="#f97316"
            fillOpacity={0.3}
          />
          <Tooltip formatter={(v: number | undefined) => [fmtPct(v ?? 0), '기여도']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
