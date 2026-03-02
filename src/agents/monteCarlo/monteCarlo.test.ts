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
  it('단일 대칭 normal 부품: mean ≈ σ√(2/π)', () => {
    const result = runMonteCarlo([makePart('A', 0.05, 0.05)], 50_000);
    const sigma = 0.05 / 3;
    const expected = sigma * Math.sqrt(2 / Math.PI);
    expect(result.mean).toBeCloseTo(expected, 1);
  });

  it('비대칭 공차: 큰 쪽(upper) 방향 mean이 더 큼 (sigmaPlus > sigmaMinus)', () => {
    // upper=0.10, lower=0.02 → sigmaPlus 5배 → 양수 방향으로 편향
    const result = runMonteCarlo([makePart('A', 0.10, 0.02)], 50_000);
    const sigmaPlus = 0.10 / 3;
    const expected = sigmaPlus * Math.sqrt(2 / Math.PI); // 비대칭이면 이보다 작음
    expect(result.mean).toBeGreaterThan(0);
    expect(result.mean).toBeLessThan(expected * 1.5);
  });

  it('동일 공차 두 부품: 상쇄 효과로 mean < 두 부품 개별 합계', () => {
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

  it('대칭 정규분포: 히스토그램이 음수 ~ 양수 범위에 걸침', () => {
    const result = runMonteCarlo([makePart('A', 0.05, 0.05)], 10_000);
    const hasNeg = result.histogram.some((h) => h.bin < 0 && h.count > 0);
    const hasPos = result.histogram.some((h) => h.bin > 0 && h.count > 0);
    expect(hasNeg).toBe(true);
    expect(hasPos).toBe(true);
  });

  it('uniform 비대칭: [-lowerTol, +upperTol] 범위', () => {
    // upper=0.10, lower=0.02 → 범위 [-0.02, 0.10]
    const result = runMonteCarlo([makePart('A', 0.10, 0.02, 'uniform')], 10_000);
    const minBin = Math.min(...result.histogram.map((h) => h.bin));
    const maxBin = Math.max(...result.histogram.map((h) => h.bin));
    expect(minBin).toBeGreaterThanOrEqual(-0.02 - 0.01);
    expect(maxBin).toBeLessThanOrEqual(0.10 + 0.01);
  });

  it('Cpk 낮을수록 stdDev 증가', () => {
    const low  = runMonteCarlo([makePart('A', 0.05, 0.05, 'normal', 0.67)], 20_000);
    const high = runMonteCarlo([makePart('A', 0.05, 0.05, 'normal', 1.67)], 20_000);
    expect(low.stdDev).toBeGreaterThan(high.stdDev);
  });
});
