import type { TolerancePart, CalculationResult, SensitivityItem } from '../../types/tolerance';
import type { MonteCarloResult } from '../../types/tolerance';

/** 활성화된 부품만 필터링하고 유효 공차(평균 공차)를 계산 */
function effectiveTol(part: TolerancePart): number {
  return (part.upperTol + part.lowerTol) / 2;
}

/** 활성화된 부품 중 공차 합이 0인지 여부 */
export function hasValidTolerance(parts: TolerancePart[]): boolean {
  return parts.some((p) => p.enabled && effectiveTol(p) > 0);
}

/** Worst Case: 모든 공차의 절댓값 합 */
export function calcWorstCase(parts: TolerancePart[]): number {
  return parts
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + effectiveTol(p), 0);
}

/** RSS (Root Sum Square) */
export function calcRSS(parts: TolerancePart[]): number {
  const sumSq = parts
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + effectiveTol(p) ** 2, 0);
  return Math.sqrt(sumSq);
}

/** RSS 기반 기여도 (%) */
export function calcSensitivity(parts: TolerancePart[]): SensitivityItem[] {
  const enabled = parts.filter((p) => p.enabled);
  const sumSq = enabled.reduce((sum, p) => sum + effectiveTol(p) ** 2, 0);
  if (sumSq === 0) return [];
  return enabled.map((p) => ({
    partId: p.id,
    name: p.name || p.id,
    percentage: (effectiveTol(p) ** 2 / sumSq) * 100,
  }));
}

/** Monte Carlo 결과를 받아 verdict 판정 */
export function calcVerdict(
  mc: MonteCarloResult,
  targetTol: number
): CalculationResult['verdict'] {
  // PASS: 99%의 누적 공차가 목표 이내
  if (mc.p99 <= targetTol) return 'PASS';
  // WARNING: 평균 누적 공차는 목표 이내이나 꼬리 분포가 초과
  if (mc.mean <= targetTol) return 'WARNING';
  return 'FAIL';
}

/**
 * 전체 계산 (Monte Carlo 결과는 별도 agent에서 받음)
 * 유효한 공차값이 없으면 null 반환
 */
export function calcAll(
  parts: TolerancePart[],
  mc: MonteCarloResult,
  targetTol: number
): CalculationResult | null {
  if (!hasValidTolerance(parts)) return null;

  return {
    worstCase: calcWorstCase(parts),
    rss: calcRSS(parts),
    monteCarlo: mc,
    sensitivity: calcSensitivity(parts),
    verdict: calcVerdict(mc, targetTol),
  };
}
