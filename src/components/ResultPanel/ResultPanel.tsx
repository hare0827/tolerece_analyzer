import type { CalculationResult } from '../../types/tolerance';
import { fmt4, fmtPct } from '../../utils/formatters';
import { VerdictBadge } from '../common/Badge';

interface Props {
  result: CalculationResult;
  targetTol: number;
  mcRunning: boolean;
}

const ROW = 'flex justify-between items-center py-1 border-b border-gray-100';
const LABEL = 'text-sm text-gray-600';
const VALUE = 'text-sm font-mono font-semibold text-gray-800';

export function ResultPanel({ result, targetTol, mcRunning }: Props) {
  const topSensitivity = [...result.sensitivity]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 판정 */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">판정 (목표 ±{fmt4(targetTol)} mm)</span>
        <VerdictBadge verdict={result.verdict} />
      </div>

      {/* 주요 결과 */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <div className={ROW}>
          <span className={LABEL}>Worst Case</span>
          <span className={VALUE}>
            +{fmt4(result.worstCase.plus)} / -{fmt4(result.worstCase.minus)} mm
          </span>
        </div>
        <div className={ROW}>
          <span className={LABEL}>RSS</span>
          <span className={VALUE}>±{fmt4(result.rss)} mm</span>
        </div>
        <div className={ROW}>
          <span className={LABEL}>MC 평균</span>
          <span className={`${VALUE} ${mcRunning ? 'animate-pulse text-gray-400' : ''}`}>
            ±{fmt4(result.monteCarlo.mean)} mm
          </span>
        </div>
        <div className={ROW}>
          <span className={LABEL}>MC σ</span>
          <span className={VALUE}>±{fmt4(result.monteCarlo.stdDev)} mm</span>
        </div>
        <div className={`${ROW} border-b-0`}>
          <span className={LABEL}>MC P99</span>
          <span
            className={`${VALUE} ${result.monteCarlo.p99 > targetTol ? 'text-red-600' : 'text-green-700'}`}
          >
            ±{fmt4(result.monteCarlo.p99)} mm
          </span>
        </div>
      </div>

      {/* 기여도 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          공차 기여도 (RSS 기준)
        </h3>
        <div className="space-y-1">
          {topSensitivity.map((s, i) => (
            <div key={s.partId} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4 text-right">{i + 1}.</span>
              <span className="text-xs text-gray-700 flex-1 truncate">
                {s.name}
              </span>
              <div className="flex items-center gap-1 w-32">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${i === 0 ? 'bg-orange-400' : 'bg-blue-300'}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-600 w-10 text-right">
                  {fmtPct(s.percentage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
