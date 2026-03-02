import { describe, it, expect } from 'vitest';
import { calcWorstCase, calcRSS, calcSensitivity } from './index';
import type { TolerancePart } from '../../types/tolerance';

const makePart = (
  id: string,
  upper: number,
  lower: number,
  enabled = true
): TolerancePart => ({
  id,
  name: id,
  nominal: 10,
  upperTol: upper,
  lowerTol: lower,
  distribution: 'normal',
  cpk: 1.33,
  enabled,
});

describe('calcWorstCase', () => {
  it('단일 부품 대칭 공차', () => {
    expect(calcWorstCase([makePart('A', 0.05, 0.05)])).toBeCloseTo(0.05);
  });

  it('다중 부품 합산', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.10, 0.10)];
    expect(calcWorstCase(parts)).toBeCloseTo(0.15);
  });

  it('비활성화 부품 제외', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.10, 0.10, false)];
    expect(calcWorstCase(parts)).toBeCloseTo(0.05);
  });

  it('비대칭 공차 — 평균값 사용', () => {
    // upper=0.06, lower=0.02 → effective = 0.04
    expect(calcWorstCase([makePart('A', 0.06, 0.02)])).toBeCloseTo(0.04);
  });
});

describe('calcRSS', () => {
  it('단일 부품', () => {
    expect(calcRSS([makePart('A', 0.05, 0.05)])).toBeCloseTo(0.05);
  });

  it('두 동일 공차 부품: √(0.05²+0.05²)', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.05, 0.05)];
    expect(calcRSS(parts)).toBeCloseTo(Math.sqrt(0.05 ** 2 + 0.05 ** 2));
  });

  it('RSS ≤ Worst Case (항상 성립)', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.10, 0.10)];
    expect(calcRSS(parts)).toBeLessThanOrEqual(calcWorstCase(parts));
  });
});

describe('calcSensitivity', () => {
  it('동일 공차 두 부품 → 각 50%', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.05, 0.05)];
    const s = calcSensitivity(parts);
    expect(s[0].percentage).toBeCloseTo(50);
    expect(s[1].percentage).toBeCloseTo(50);
  });

  it('합이 100%', () => {
    const parts = [makePart('A', 0.03, 0.03), makePart('B', 0.07, 0.07)];
    const total = calcSensitivity(parts).reduce((sum, s) => sum + s.percentage, 0);
    expect(total).toBeCloseTo(100);
  });

  it('공차 합이 0이면 빈 배열', () => {
    expect(calcSensitivity([makePart('A', 0, 0)])).toHaveLength(0);
  });
});
