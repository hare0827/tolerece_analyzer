import type { TolerancePart, CalculationResult, SensitivityItem } from '../../types/tolerance';
import type { MonteCarloResult } from '../../types/tolerance';

/** 활성화된 부품 중 유효 공차가 하나라도 있는지 확인 */
export function hasValidTolerance(parts: TolerancePart[]): boolean {
  return parts.some((p) => p.enabled && (p.upperTol > 0 || p.lowerTol > 0));
}

/**
 * Worst Case: upperTol 합계(+방향) / lowerTol 합계(-방향) 분리 반환
 * 비대칭 공차를 평균 처리하지 않고 방향별로 정확히 누적
 */
export function calcWorstCase(parts: TolerancePart[]): { plus: number; minus: number } {
  const enabled = parts.filter((p) => p.enabled);
  return {
    plus:  enabled.reduce((sum, p) => sum + p.upperTol, 0),
    minus: enabled.reduce((sum, p) => sum + p.lowerTol, 0),
  };
}

/**
 * RSS (Root Sum Square)
 * 각 부품의 보수적(conservative) 공차 = max(upperTol, lowerTol) 사용
 */
export function calcRSS(parts: TolerancePart[]): number {
  const sumSq = parts
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + Math.max(p.upperTol, p.lowerTol) ** 2, 0);
  return Math.sqrt(sumSq);
}

/**
 * RSS 기반 기여도 (%)
 * 보수적 공차 = max(upperTol, lowerTol) 기준
 */
export function calcSensitivity(parts: TolerancePart[]): SensitivityItem[] {
  const enabled = parts.filter((p) => p.enabled);
  const sumSq = enabled.reduce((sum, p) => sum + Math.max(p.upperTol, p.lowerTol) ** 2, 0);
  if (sumSq === 0) return [];
  return enabled.map((p) => ({
    partId: p.id,
    name: p.name || p.id,
    percentage: (Math.max(p.upperTol, p.lowerTol) ** 2 / sumSq) * 100,
  }));
}

/** Monte Carlo 결과를 받아 verdict 판정 (p99는 절댓값 기준) */
export function calcVerdict(
  mc: MonteCarloResult,
  targetTol: number
): CalculationResult['verdict'] {
  if (mc.p99 <= targetTol) return 'PASS';
  if (mc.mean <= targetTol) return 'WARNING';
  return 'FAIL';
}

/**
 * 전체 계산. 유효한 공차값이 없으면 null 반환
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
