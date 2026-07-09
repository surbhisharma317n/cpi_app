// Use ?worker suffix for Vite
import ValidationWorker from './validation.worker.ts?worker';

export const createValidationWorker = (): Worker => {
  return new ValidationWorker();
};