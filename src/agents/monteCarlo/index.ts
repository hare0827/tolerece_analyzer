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

/** 히스토그램 생성 (부호 있는 데이터, binCount개 구간) */
function buildHistogram(
  data: number[],
  binCount = 20
): { bin: number; count: number }[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const width = (max - min) / binCount;

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

  if (enabled.length === 0) {
    return {
      mean: 0,
      stdDev: 0,
      p99: 0,
      histogram: Array.from({ length: 20 }, (_, i) => ({ bin: (i - 10) * 0.01, count: i === 10 ? samples : 0 })),
    };
  }

  // 부품별로 부호 있는 편차를 합산 (상쇄 효과 반영)
  const sums: number[] = new Array(samples).fill(0);

  for (const part of enabled) {
    const cpkFactor = part.cpk / 1.33;
    // 비대칭 공차: 양/음 방향별 sigma 독립 적용
    const sigmaPlus  = part.upperTol / (3 * cpkFactor);
    const sigmaMinus = part.lowerTol / (3 * cpkFactor);

    for (let i = 0; i < samples; i++) {
      let sample: number;
      if (part.distribution === 'uniform') {
        // 비대칭 균일분포: [-lowerTol, +upperTol]
        sample = Math.random() * (part.upperTol + part.lowerTol) - part.lowerTol;
      } else {
        // 비대칭 정규분포: 양수이면 sigmaPlus, 음수이면 sigmaMinus 적용
        const raw = randNormal();
        sample = raw >= 0 ? raw * sigmaPlus : raw * sigmaMinus;
      }
      sums[i] += sample;
    }
  }

  // 절댓값 기반 통계 (mean, p99) — 판정 기준
  const absSums = sums.map(Math.abs);
  const mean = absSums.reduce((a, b) => a + b, 0) / samples;

  // stdDev는 부호 있는 분포 기준 (공정 시그마, 더 직관적)
  const sumsMean = sums.reduce((a, b) => a + b, 0) / samples;
  const variance = sums.reduce((a, b) => a + (b - sumsMean) ** 2, 0) / samples;
  const stdDev = Math.sqrt(variance);

  const sorted = [...absSums].sort((a, b) => a - b);
  const p99 = sorted[Math.ceil(samples * 0.99) - 1];

  return {
    mean,
    stdDev,
    p99,
    // 부호 있는 분포 히스토그램 — 종형 곡선 형태로 표시
    histogram: buildHistogram(sums),
  };
}
