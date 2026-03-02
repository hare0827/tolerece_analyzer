import { useRef, useState } from 'react';
import { useToleranceCalc } from './hooks/useToleranceCalc';
import { InputTable } from './components/InputTable/InputTable';
import { ResultPanel } from './components/ResultPanel/ResultPanel';
import { Histogram } from './components/Charts/Histogram';
import { SensitivityChart } from './components/Charts/SensitivityChart';
import { CsvImportModal } from './components/common/CsvModal';
import { importCSV, exportCSV } from './agents/csvHandler';
import type { TolerancePart } from './types/tolerance';

export default function App() {
  const {
    parts,
    targetTol,
    mcSamples,
    result,
    mcRunning,
    updatePart,
    addPart,
    removePart,
    setParts,
    setTargetTol,
    setMcSamples,
  } = useToleranceCalc();

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingParts, setPendingParts] = useState<TolerancePart[] | null>(null);
  const [csvFailedRows, setCsvFailedRows] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { parts: imported, failedRows } = importCSV(text);
      setPendingParts(imported);
      setCsvFailedRows(failedRows);
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (pendingParts) setParts(pendingParts);
    setPendingParts(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleExport() {
    const csv = exportCSV(parts, result);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tolerance_analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {pendingParts && (
        <CsvImportModal
          importedCount={pendingParts.length}
          failedRows={csvFailedRows}
          onConfirm={confirmImport}
          onCancel={() => setPendingParts(null)}
        />
      )}

      {/* 헤더 */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            공차 누적 분석기
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Tolerance Stack-up Analyzer</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700"
          >
            CSV 가져오기
          </button>
          <button
            onClick={handleExport}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700"
          >
            CSV 내보내기
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* 좌: 입력 테이블 + 설정 */}
        <div className="col-span-8 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">부품 공차 입력</h2>
            <InputTable
              parts={parts}
              onUpdate={updatePart}
              onAdd={addPart}
              onRemove={removePart}
            />
          </div>

          {/* 설정 */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-6 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">목표 공차 (mm)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="border border-gray-300 rounded px-2 py-1 text-sm font-mono w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={targetTol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v > 0) setTargetTol(v);
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monte Carlo 샘플 수</label>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm font-mono w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={mcSamples}
                onChange={(e) => setMcSamples(Number(e.target.value))}
              >
                <option value={1000}>1,000</option>
                <option value={10000}>10,000</option>
                <option value={50000}>50,000</option>
                <option value={100000}>100,000</option>
              </select>
            </div>
            {mcRunning && (
              <div className="flex items-center gap-2 text-xs text-blue-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                계산 중…
              </div>
            )}
          </div>
        </div>

        {/* 우: 결과 패널 */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">계산 결과</h2>
            {result ? (
              <ResultPanel
                result={result}
                targetTol={targetTol}
                mcRunning={mcRunning}
              />
            ) : (
              <p className="text-xs text-gray-400">유효한 공차값을 입력하세요.</p>
            )}
          </div>
        </div>

        {/* 하단: 차트 */}
        {result && (
          <div className="col-span-12 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <Histogram
                histogram={result.monteCarlo.histogram}
                targetTol={targetTol}
                p99={result.monteCarlo.p99}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <SensitivityChart sensitivity={result.sensitivity} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
