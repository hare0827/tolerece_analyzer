import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from './index';
import type { TolerancePart } from '../../types/tolerance';

const makePart = (
  id: string,
  upper: number,
  lower: number,
  dist: TolerancePart['distribution'] = 'normal',
  cpk = 1.33,
  enabled = true
): TolerancePart => ({
  id,
  name: id,
  nominal: 10,
  upperTol: upper,
  lowerTol: lower,
  distribution: dist,
  cpk,
  enabled,
});

describe('runMonteCarlo', () => {
  it('단일 normal 부품: mean ≈ σ√(2/π) (반정규 분포)', () => {
    // 단일 부품: |signed_sum| = |N(0,σ)| → 기댓값 σ√(2/π)
    const result = runMonteCarlo([makePart('A', 0.05, 0.05)], 50_000);
    const sigma = 0.05 / 3;
    const expected = sigma * Math.sqrt(2 / Math.PI);
    expect(result.mean).toBeCloseTo(expected, 1);
  });

  it('동일 공차 두 부품: mean < 두 부품 Worst Case (상쇄 효과)', () => {
    // 부호 있는 합산이므로 일부 상쇄 → RSS 기반으로 mean < 2*σ√(2/π)
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.05, 0.05)];
    const worstCaseMean = 2 * (0.05 / 3) * Math.sqrt(2 / Math.PI);
    const result = runMonteCarlo(parts, 50_000);
    expect(result.mean).toBeLessThan(worstCaseMean);
  });

  it('비활성화 부품만 있으면 mean=0, p99=0', () => {
    const result = runMonteCarlo([makePart('A', 0.05, 0.05, 'normal', 1.33, false)]);
    expect(result.mean).toBe(0);
    expect(result.p99).toBe(0);
  });

  it('p99 >= mean (항상 성립)', () => {
    const result = runMonteCarlo([makePart('A', 0.05, 0.05)]);
    expect(result.p99).toBeGreaterThanOrEqual(result.mean);
  });

  it('histogram binCount === 20', () => {
    const result = runMonteCarlo([makePart('A', 0.05, 0.05)]);
    expect(result.histogram).toHaveLength(20);
  });

  it('histogram 총 count === samples', () => {
    const samples = 5000;
    const result = runMonteCarlo([makePart('A', 0.05, 0.05)], samples);
    const total = result.histogram.reduce((s, h) => s + h.count, 0);
    expect(total).toBe(samples);
  });

  it('uniform 분포도 결과 반환', () => {
    const result = runMonteCarlo([makePart('A', 0.05, 0.05, 'uniform')]);
    expect(result.mean).toBeGreaterThan(0);
  });

  it('Cpk 낮을수록 stdDev 증가', () => {
    const low = runMonteCarlo([makePart('A', 0.05, 0.05, 'normal', 0.67)], 20_000);
    const high = runMonteCarlo([makePart('A', 0.05, 0.05, 'normal', 1.67)], 20_000);
    expect(low.stdDev).toBeGreaterThan(high.stdDev);
  });
});
