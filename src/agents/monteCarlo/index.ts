import type { TolerancePart } from '../../types/tolerance';
import type { MonteCarloResult } from '../../types/tolerance';

const DEFAULT_SAMPLES = 10_000;

/** Box-Muller 변환으로 N(0,1) 샘플 생성 */
function randNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Uniform[-t, t] 샘플 */
function randUniform(t: number): number {
  return (Math.random() * 2 - 1) * t;
}

/** 히스토그램 생성 (binCount개 구간) */
function buildHistogram(
  data: number[],
  binCount = 20
): { bin: number; count: number }[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const width = (max - min) / binCount;

  // 모든 샘플이 동일한 값(상수) → bin 1개로 처리
  if (width === 0) {
    return [{ bin: +min.toFixed(4), count: data.length },
      ...Array.from({ length: binCount - 1 }, (_, i) => ({
        bin: +(min + i + 1).toFixed(4),
        count: 0,
      }))];
  }

  const bins: { bin: number; count: number }[] = Array.from({ length: binCount }, (_, i) => ({
    bin: +(min + width * (i + 0.5)).toFixed(4),
    count: 0,
  }));
  for (const v of data) {
    const idx = Math.min(Math.floor((v - min) / width), binCount - 1);
    bins[idx].count++;
  }
  return bins;
}

export function runMonteCarlo(
  parts: TolerancePart[],
  samples = DEFAULT_SAMPLES
): MonteCarloResult {
  const enabled = parts.filter((p) => p.enabled);

  // 활성화된 부품이 없으면 영(zero) 결과 반환
  if (enabled.length === 0) {
    return {
      mean: 0,
      stdDev: 0,
      p99: 0,
      histogram: Array.from({ length: 20 }, (_, i) => ({ bin: i * 0.01, count: i === 0 ? samples : 0 })),
    };
  }

  // 부품별로 부호 있는 편차를 합산 (상쇄 효과 반영)
  const sums: number[] = new Array(samples).fill(0);

  for (const part of enabled) {
    const tol = (part.upperTol + part.lowerTol) / 2;
    const sigma = tol / (3 * (part.cpk / 1.33)); // Cpk 보정

    for (let i = 0; i < samples; i++) {
      const sample =
        part.distribution === 'uniform'
          ? randUniform(tol)
          : randNormal() * sigma;
      sums[i] += sample; // 부호 있는 합산 — Math.abs() 금지
    }
  }

  // 합산된 스택업 편차의 절댓값으로 분포 분석
  const absSums = sums.map(Math.abs);

  const mean = absSums.reduce((a, b) => a + b, 0) / samples;
  const variance = absSums.reduce((a, b) => a + (b - mean) ** 2, 0) / samples;
  const stdDev = Math.sqrt(variance);

  const sorted = [...absSums].sort((a, b) => a - b);
  // 정확한 99th percentile: ceil(n*0.99) - 1 (0-indexed)
  const p99 = sorted[Math.ceil(samples * 0.99) - 1];

  return {
    mean,
    stdDev,
    p99,
    histogram: buildHistogram(absSums),
  };
}
