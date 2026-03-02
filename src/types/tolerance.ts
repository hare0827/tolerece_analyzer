export interface TolerancePart {
  id: string;
  name: string;
  nominal: number;
  upperTol: number;
  lowerTol: number;
  distribution: 'normal' | 'uniform';
  cpk: number;
  enabled: boolean;
}

export interface SensitivityItem {
  partId: string;
  name: string;
  percentage: number;
}

export interface MonteCarloResult {
  mean: number;
  stdDev: number;
  p99: number;
  histogram: { bin: number; count: number }[];
}

export interface CalculationResult {
  worstCase: { plus: number; minus: number };
  rss: number;
  monteCarlo: MonteCarloResult;
  sensitivity: SensitivityItem[];
  verdict: 'PASS' | 'FAIL' | 'WARNING';
}
