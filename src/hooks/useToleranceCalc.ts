import { useReducer, useEffect, useRef } from 'react';
import type { TolerancePart, CalculationResult, MonteCarloResult } from '../types/tolerance';
import { calcAll } from '../agents/toleranceEngine';
import { saveSession, loadSession } from '../agents/csvHandler';

function makeDefaultPart(): TolerancePart {
  return {
    id: crypto.randomUUID(),
    name: '',
    nominal: 0,
    upperTol: 0.05,
    lowerTol: 0.05,
    distribution: 'normal',
    cpk: 1.33,
    enabled: true,
  };
}

interface State {
  parts: TolerancePart[];
  targetTol: number;
  mcSamples: number;
  result: CalculationResult | null;
  mcRunning: boolean;
}

type Action =
  | { type: 'SET_PARTS'; parts: TolerancePart[] }
  | { type: 'UPDATE_PART'; id: string; field: keyof TolerancePart; value: TolerancePart[keyof TolerancePart] }
  | { type: 'ADD_PART' }
  | { type: 'REMOVE_PART'; id: string }
  | { type: 'SET_TARGET'; value: number }
  | { type: 'SET_MC_SAMPLES'; value: number }
  | { type: 'SET_RESULT'; result: CalculationResult | null }
  | { type: 'SET_MC_RUNNING'; running: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PARTS':
      return { ...state, parts: action.parts, result: null };
    case 'UPDATE_PART':
      return {
        ...state,
        parts: state.parts.map((p) =>
          p.id === action.id ? { ...p, [action.field]: action.value } : p
        ),
      };
    case 'ADD_PART':
      return { ...state, parts: [...state.parts, makeDefaultPart()] };
    case 'REMOVE_PART':
      return {
        ...state,
        parts:
          state.parts.length > 1
            ? state.parts.filter((p) => p.id !== action.id)
            : state.parts, // 마지막 부품은 삭제 불가
      };
    case 'SET_TARGET':
      return { ...state, targetTol: action.value };
    case 'SET_MC_SAMPLES':
      return { ...state, mcSamples: Math.min(action.value, 100_000) };
    case 'SET_RESULT':
      return { ...state, result: action.result };
    case 'SET_MC_RUNNING':
      return { ...state, mcRunning: action.running };
    default:
      return state;
  }
}

const INITIAL_STATE: State = {
  parts: [makeDefaultPart()],
  targetTol: 0.2,
  mcSamples: 10_000,
  result: null,
  mcRunning: false,
};

export function useToleranceCalc() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (s) => {
    const saved = loadSession();
    return saved ? { ...s, parts: saved } : s;
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // parts / target 변경 시 자동 재계산 + 세션 저장
  useEffect(() => {
    saveSession(state.parts);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    dispatch({ type: 'SET_MC_RUNNING', running: true });

    debounceRef.current = setTimeout(() => {
      // 이전 Worker 종료
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      const worker = new Worker(
        new URL('../agents/monteCarlo/monteCarlo.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<MonteCarloResult>) => {
        const result = calcAll(state.parts, e.data, state.targetTol);
        dispatch({ type: 'SET_RESULT', result });
        dispatch({ type: 'SET_MC_RUNNING', running: false });
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = () => {
        dispatch({ type: 'SET_MC_RUNNING', running: false });
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ parts: state.parts, samples: state.mcSamples });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.parts, state.targetTol, state.mcSamples]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    parts: state.parts,
    targetTol: state.targetTol,
    mcSamples: state.mcSamples,
    result: state.result,
    mcRunning: state.mcRunning,
    updatePart: (id: string, field: keyof TolerancePart, value: TolerancePart[keyof TolerancePart]) =>
      dispatch({ type: 'UPDATE_PART', id, field, value }),
    addPart: () => dispatch({ type: 'ADD_PART' }),
    removePart: (id: string) => dispatch({ type: 'REMOVE_PART', id }),
    setParts: (parts: TolerancePart[]) => dispatch({ type: 'SET_PARTS', parts }),
    setTargetTol: (v: number) => dispatch({ type: 'SET_TARGET', value: v }),
    setMcSamples: (v: number) => dispatch({ type: 'SET_MC_SAMPLES', value: v }),
  };
}
