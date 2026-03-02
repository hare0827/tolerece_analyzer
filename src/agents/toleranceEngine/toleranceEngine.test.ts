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
  it('단일 대칭 공차 → plus = minus = 0.05', () => {
    const wc = calcWorstCase([makePart('A', 0.05, 0.05)]);
    expect(wc.plus).toBeCloseTo(0.05);
    expect(wc.minus).toBeCloseTo(0.05);
  });

  it('다중 부품 합산', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.10, 0.10)];
    const wc = calcWorstCase(parts);
    expect(wc.plus).toBeCloseTo(0.15);
    expect(wc.minus).toBeCloseTo(0.15);
  });

  it('비활성화 부품 제외', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.10, 0.10, false)];
    const wc = calcWorstCase(parts);
    expect(wc.plus).toBeCloseTo(0.05);
    expect(wc.minus).toBeCloseTo(0.05);
  });

  it('비대칭 공차 — 방향별로 정확히 분리', () => {
    // +0.10 / -0.05 → plus=0.10, minus=0.05 (평균 0.075 아님)
    const wc = calcWorstCase([makePart('A', 0.10, 0.05)]);
    expect(wc.plus).toBeCloseTo(0.10);
    expect(wc.minus).toBeCloseTo(0.05);
  });

  it('두 비대칭 부품 합산', () => {
    const parts = [makePart('A', 0.10, 0.05), makePart('B', 0.08, 0.03)];
    const wc = calcWorstCase(parts);
    expect(wc.plus).toBeCloseTo(0.18);
    expect(wc.minus).toBeCloseTo(0.08);
  });
});

describe('calcRSS', () => {
  it('단일 대칭 부품', () => {
    expect(calcRSS([makePart('A', 0.05, 0.05)])).toBeCloseTo(0.05);
  });

  it('두 동일 공차 부품: √(0.05²+0.05²)', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.05, 0.05)];
    expect(calcRSS(parts)).toBeCloseTo(Math.sqrt(0.05 ** 2 + 0.05 ** 2));
  });

  it('비대칭 공차 — max(upper, lower) 사용 (보수적)', () => {
    // upper=0.10, lower=0.05 → max=0.10 → RSS=0.10
    expect(calcRSS([makePart('A', 0.10, 0.05)])).toBeCloseTo(0.10);
  });

  it('RSS ≤ Worst Case plus (항상 성립)', () => {
    const parts = [makePart('A', 0.05, 0.05), makePart('B', 0.10, 0.10)];
    expect(calcRSS(parts)).toBeLessThanOrEqual(calcWorstCase(parts).plus);
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

  it('비대칭 공차 — max 기준으로 기여도 계산', () => {
    // A: max(0.10, 0.05)=0.10, B: max(0.10, 0.05)=0.10 → 각 50%
    const parts = [makePart('A', 0.10, 0.05), makePart('B', 0.10, 0.05)];
    const s = calcSensitivity(parts);
    expect(s[0].percentage).toBeCloseTo(50);
  });

  it('name 필드 포함', () => {
    const s = calcSensitivity([makePart('A', 0.05, 0.05)]);
    expect(s[0].name).toBe('A');
  });
});
