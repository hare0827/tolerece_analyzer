/** 숫자를 소수점 4자리 문자열로 포맷 (0.0001mm 분해능) */
export function fmt4(value: number): string {
  return value.toFixed(4);
}

/** 백분율 포맷 (소수점 1자리) */
export function fmtPct(value: number): string {
  return value.toFixed(1) + '%';
}

/** 숫자 문자열 → 유효한 양수 number (파싱 실패 시 null) */
export function parsePositive(raw: string): number | null {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return null;
  return n;
}
