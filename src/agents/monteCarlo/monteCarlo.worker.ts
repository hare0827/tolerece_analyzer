import { runMonteCarlo } from './index';
import type { TolerancePart } from '../../types/tolerance';

interface WorkerRequest {
  parts: TolerancePart[];
  samples: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { parts, samples } = e.data;
  const result = runMonteCarlo(parts, samples);
  self.postMessage(result);
};
