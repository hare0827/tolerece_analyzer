import type { CalculationResult } from '../../types/tolerance';

interface Props {
  verdict: CalculationResult['verdict'];
}

const MAP = {
  PASS: { label: 'PASS', cls: 'bg-green-100 text-green-700 border-green-400' },
  WARNING: { label: 'WARNING', cls: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
  FAIL: { label: 'FAIL', cls: 'bg-red-100 text-red-700 border-red-400' },
};

export function VerdictBadge({ verdict }: Props) {
  const { label, cls } = MAP[verdict];
  return (
    <span className={`inline-block border rounded px-3 py-0.5 text-sm font-mono font-bold ${cls}`}>
      {label}
    </span>
  );
}
