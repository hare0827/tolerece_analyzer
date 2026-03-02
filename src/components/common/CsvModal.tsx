interface Props {
  failedRows: number;
  importedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CsvImportModal({ failedRows, importedCount, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">CSV 가져오기 확인</h2>
        <p className="text-sm text-gray-600">
          {importedCount}개 행을 읽었습니다.{' '}
          {failedRows > 0 && (
            <span className="text-red-500">{failedRows}개 행은 오류로 스킵되었습니다.</span>
          )}
        </p>
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
          기존 데이터가 모두 교체됩니다. 계속하시겠습니까?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            교체
          </button>
        </div>
      </div>
    </div>
  );
}
