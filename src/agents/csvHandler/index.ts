import Papa from 'papaparse';
import type { TolerancePart, CalculationResult } from '../../types/tolerance';

const IMPORT_HEADERS = ['부품명', '공칭값', '+공차', '-공차', '분포', 'Cpk'] as const;
const EXPORT_HEADERS = [...IMPORT_HEADERS, 'Worst Case', 'RSS', 'MC 평균', 'MC P99', '판정'];

/** CSV 문자열 → TolerancePart 배열. 파싱 실패 행 수도 반환 */
export function importCSV(csvText: string): {
  parts: TolerancePart[];
  failedRows: number;
} {
  const result = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows = result.data;
  if (rows.length === 0) return { parts: [], failedRows: 0 };

  // 헤더 행 추출 및 컬럼 순서 검증
  const firstRow = rows[0].map((c) => c.trim());
  const hasHeader = IMPORT_HEADERS.every((h, i) => firstRow[i] === h);

  if (!hasHeader && firstRow[0] === '부품명') {
    // 헤더는 있지만 컬럼 순서가 다른 경우
    return { parts: [], failedRows: rows.length - 1 };
  }

  const dataRows = hasHeader ? rows.slice(1) : rows;

  let failedRows = 0;
  const parts: TolerancePart[] = [];

  for (const row of dataRows) {
    try {
      // 위치 기반 파싱 (IMPORT_HEADERS 순서 보장됨)
      const [name, nominal, upper, lower, dist, cpk] = row.map((c) => c.trim());
      const nomNum = parseFloat(nominal);
      const upperNum = parseFloat(upper);
      const lowerNum = parseFloat(lower);
      const cpkNum = parseFloat(cpk ?? '1.33');

      if (isNaN(nomNum) || isNaN(upperNum) || isNaN(lowerNum)) {
        failedRows++;
        continue;
      }
      if (isNaN(cpkNum) || cpkNum < 0.5 || cpkNum > 2.0) {
        failedRows++;
        continue;
      }

      parts.push({
        id: crypto.randomUUID(),
        name: name ?? '',
        nominal: nomNum,
        upperTol: Math.abs(upperNum),
        lowerTol: Math.abs(lowerNum),
        distribution: dist === 'uniform' ? 'uniform' : 'normal',
        cpk: cpkNum,
        enabled: true,
      });
    } catch {
      failedRows++;
    }
  }

  return { parts, failedRows };
}

/** TolerancePart 배열 + 계산 결과 → CSV 문자열 */
export function exportCSV(parts: TolerancePart[], result?: CalculationResult | null): string {
  const rows = parts.map((p) => {
    const base = [p.name, p.nominal, p.upperTol, p.lowerTol, p.distribution, p.cpk];
    if (result) {
      base.push(
        result.worstCase,
        result.rss,
        result.monteCarlo.mean,
        result.monteCarlo.p99,
        result.verdict,
      );
    }
    return base;
  });
  const fields = result ? EXPORT_HEADERS : [...IMPORT_HEADERS];
  return Papa.unparse({ fields, data: rows });
}

const LS_KEY = 'tsa_last_session';

/** TolerancePart 런타임 검증 */
function isValidPart(p: unknown): p is TolerancePart {
  if (typeof p !== 'object' || p === null) return false;
  const part = p as Record<string, unknown>;
  return (
    typeof part.id === 'string' &&
    typeof part.name === 'string' &&
    typeof part.nominal === 'number' &&
    typeof part.upperTol === 'number' &&
    typeof part.lowerTol === 'number' &&
    (part.distribution === 'normal' || part.distribution === 'uniform') &&
    typeof part.cpk === 'number' &&
    typeof part.enabled === 'boolean'
  );
}

export function saveSession(parts: TolerancePart[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(parts));
  } catch {
    // 스토리지 용량 초과 등 — 무시
  }
}

export function loadSession(): TolerancePart[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidPart)) return null;
    return parsed;
  } catch {
    return null;
  }
}
