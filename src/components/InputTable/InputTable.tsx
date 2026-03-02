import { useState, useEffect } from 'react';
import type { TolerancePart } from '../../types/tolerance';

interface Props {
  parts: TolerancePart[];
  onUpdate: (id: string, field: keyof TolerancePart, value: TolerancePart[keyof TolerancePart]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

type NumField = 'nominal' | 'upperTol' | 'lowerTol' | 'cpk';
const NUM_FIELDS: NumField[] = ['nominal', 'upperTol', 'lowerTol', 'cpk'];

const TH = 'px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left';
const TD = 'px-2 py-1';
const INPUT =
  'w-full border border-gray-300 rounded px-1.5 py-0.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400';
const INPUT_ERROR =
  'w-full border border-red-400 rounded px-1.5 py-0.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-red-400';

function initLocalNums(parts: TolerancePart[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const p of parts) {
    for (const f of NUM_FIELDS) {
      m[`${p.id}:${f}`] = String(p[f]);
    }
  }
  return m;
}

export function InputTable({ parts, onUpdate, onAdd, onRemove }: Props) {
  // 숫자 필드 로컬 문자열 상태 — 소수점 도중 입력 허용 + 외부 변경 동기화
  const [localNums, setLocalNums] = useState<Record<string, string>>(() =>
    initLocalNums(parts)
  );
  // Cpk 범위 오류 행 추적
  const [cpkError, setCpkError] = useState<Set<string>>(new Set());

  // parts 교체(CSV 가져오기 등) 시 로컬 값 동기화
  useEffect(() => {
    setLocalNums(initLocalNums(parts));
    setCpkError(new Set());
  }, [parts]);

  function handleNumChange(id: string, field: NumField, raw: string) {
    setLocalNums((prev) => ({ ...prev, [`${id}:${field}`]: raw }));
  }

  function handleNumBlur(id: string, field: NumField, raw: string) {
    const n = parseFloat(raw);
    if (isNaN(n)) {
      // 파싱 실패 → 이전 값으로 복원
      const part = parts.find((p) => p.id === id);
      if (part) {
        setLocalNums((prev) => ({ ...prev, [`${id}:${field}`]: String(part[field]) }));
      }
      return;
    }
    if (field === 'cpk') {
      if (n < 0.5 || n > 2.0) {
        setCpkError((prev) => new Set(prev).add(id));
        return;
      }
      setCpkError((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
    if ((field === 'upperTol' || field === 'lowerTol') && n < 0) return;
    onUpdate(id, field, n);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className={`${TH} w-6`}></th>
            <th className={TH}>부품명</th>
            <th className={TH}>공칭값 (mm)</th>
            <th className={TH}>+공차</th>
            <th className={TH}>-공차</th>
            <th className={TH}>분포</th>
            <th className={TH}>Cpk</th>
            <th className={`${TH} w-8`}></th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr
              key={p.id}
              className={`border-b border-gray-100 hover:bg-gray-50 ${!p.enabled ? 'opacity-40' : ''}`}
            >
              <td className={TD}>
                <input
                  type="checkbox"
                  aria-label={`${p.name || '부품'} 계산 포함`}
                  checked={p.enabled}
                  onChange={(e) => onUpdate(p.id, 'enabled', e.target.checked)}
                  className="cursor-pointer"
                />
              </td>
              <td className={TD}>
                <input
                  className={INPUT}
                  value={p.name}
                  placeholder="부품명"
                  aria-label="부품명"
                  onChange={(e) => onUpdate(p.id, 'name', e.target.value)}
                />
              </td>
              <td className={TD}>
                <input
                  className={INPUT}
                  type="number"
                  step="0.001"
                  aria-label="공칭값"
                  value={localNums[`${p.id}:nominal`] ?? String(p.nominal)}
                  onChange={(e) => handleNumChange(p.id, 'nominal', e.target.value)}
                  onBlur={(e) => handleNumBlur(p.id, 'nominal', e.target.value)}
                />
              </td>
              <td className={TD}>
                <input
                  className={INPUT}
                  type="number"
                  step="0.001"
                  min="0"
                  aria-label="+공차"
                  value={localNums[`${p.id}:upperTol`] ?? String(p.upperTol)}
                  onChange={(e) => handleNumChange(p.id, 'upperTol', e.target.value)}
                  onBlur={(e) => handleNumBlur(p.id, 'upperTol', e.target.value)}
                />
              </td>
              <td className={TD}>
                <input
                  className={INPUT}
                  type="number"
                  step="0.001"
                  min="0"
                  aria-label="-공차"
                  value={localNums[`${p.id}:lowerTol`] ?? String(p.lowerTol)}
                  onChange={(e) => handleNumChange(p.id, 'lowerTol', e.target.value)}
                  onBlur={(e) => handleNumBlur(p.id, 'lowerTol', e.target.value)}
                />
              </td>
              <td className={TD}>
                <select
                  className={INPUT}
                  aria-label="분포"
                  value={p.distribution}
                  onChange={(e) =>
                    onUpdate(p.id, 'distribution', e.target.value as TolerancePart['distribution'])
                  }
                >
                  <option value="normal">정규</option>
                  <option value="uniform">균일</option>
                </select>
              </td>
              <td className={TD}>
                <input
                  className={cpkError.has(p.id) ? INPUT_ERROR : INPUT}
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="2.0"
                  aria-label="Cpk"
                  title={cpkError.has(p.id) ? 'Cpk는 0.5 ~ 2.0 범위여야 합니다' : ''}
                  value={localNums[`${p.id}:cpk`] ?? String(p.cpk)}
                  onChange={(e) => handleNumChange(p.id, 'cpk', e.target.value)}
                  onBlur={(e) => handleNumBlur(p.id, 'cpk', e.target.value)}
                />
              </td>
              <td className={TD}>
                <button
                  onClick={() => onRemove(p.id)}
                  aria-label={`${p.name || '부품'} 삭제`}
                  className="text-gray-400 hover:text-red-500 font-bold text-base leading-none"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2">
        <button
          onClick={onAdd}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-dashed border-blue-300 rounded hover:border-blue-500"
        >
          + 부품 추가
        </button>
      </div>
    </div>
  );
}
