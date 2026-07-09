import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
// import { UploadedFile, ValidationResult } from '../types/compilation.types';
// import { generateFileChecksum, validateParquetSchema, validateZipStructure } from '../utils/validation.utils';
import type { UploadedFile, ValidationResult } from '../types/compilation.types';

interface UseFileValidationProps {
  onValidationStart?: (files: UploadedFile[]) => void;
  onValidationComplete?: (fileId: string, result: ValidationResult) => void;
  onValidationError?: (fileId: string, error: string) => void;
  onValidationEnd?: (stats: ValidationStats) => void;
}

interface ValidationStats {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalRows: number;
  duration: number;
}

export const useFileValidation = ({
  onValidationStart,
  onValidationComplete,
  // onValidationError,
  onValidationEnd
}: UseFileValidationProps = {}) => {
  
  const workerRef = useRef<Worker | null>(null);
  const validationQueue = useRef<Map<string, UploadedFile>>(new Map());
  const startTimeRef = useRef<number>(0);
  const statsRef = useRef<ValidationStats>({
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    totalRows: 0,
    duration: 0
  });

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/validation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { fileId, isValid, errors, rowCount, headers, metadata, quality } = e.data;
      
      const result: ValidationResult = {
        isValid,
        errors: errors || [],
        rowCount: rowCount || 0,
        headers: headers || [],
        metadata: metadata || {},
        quality: quality || 100,
        validatedAt: new Date().toISOString()
      };

      // Update stats
      if (isValid) {
        statsRef.current.validFiles++;
        statsRef.current.totalRows += rowCount || 0;
      } else {
        statsRef.current.invalidFiles++;
      }

      // Store result
      validationQueue.current.delete(fileId);
      
      // Callback
      onValidationComplete?.(fileId, result);
      
      // Check if all files are processed
      if (validationQueue.current.size === 0) {
        const duration = Date.now() - startTimeRef.current;
        statsRef.current.duration = duration;
        statsRef.current.totalFiles = statsRef.current.validFiles + statsRef.current.invalidFiles;
        
        onValidationEnd?.(statsRef.current);
        
        // Reset stats
        statsRef.current = {
          totalFiles: 0,
          validFiles: 0,
          invalidFiles: 0,
          totalRows: 0,
          duration: 0
        };
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Validation worker error:', error);
      toast.error('Validation system error');
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [onValidationComplete, onValidationEnd]);

  // Validate files
  const validateFiles = useCallback(async (files: UploadedFile[]) => {
    if (!workerRef.current) {
      toast.error('Validation worker not initialized');
      return;
    }

    // Start validation
    startTimeRef.current = Date.now();
    onValidationStart?.(files);

    // Add to queue
    files.forEach(file => {
      validationQueue.current.set(file.id, file);
      
      // Send to worker
      workerRef.current?.postMessage({
        fileId: file.id,
        file: file.file,
        format: file.format,
        checksum: file.checksum,
        options: {
          validateSchema: true,
          checkDuplicates: true,
          maxRows: 10000,
          requiredColumns: ['id', 'name', 'value', 'timestamp'],
          dataTypes: {
            id: 'string',
            name: 'string',
            value: 'number',
            timestamp: 'date'
          }
        }
      });
    });

  }, [onValidationStart]);

  // Cancel validation
  const cancelValidation = useCallback((fileId?: string) => {
    if (fileId) {
      validationQueue.current.delete(fileId);
      workerRef.current?.postMessage({ type: 'cancel', fileId });
    } else {
      validationQueue.current.clear();
      workerRef.current?.postMessage({ type: 'cancel-all' });
    }
  }, []);

  // Validate single file
  const validateFile = useCallback(async (file: UploadedFile): Promise<ValidationResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handler = (e: MessageEvent) => {
        if (e.data.fileId === file.id) {
          workerRef.current?.removeEventListener('message', handler);
          resolve({
            isValid: e.data.isValid,
            errors: e.data.errors || [],
            rowCount: e.data.rowCount || 0,
            headers: e.data.headers || [],
            metadata: e.data.metadata || {},
            quality: e.data.quality || 100,
            validatedAt: new Date().toISOString()
          });
        }
      };

      workerRef.current.addEventListener('message', handler);
      
      workerRef.current.postMessage({
        fileId: file.id,
        file: file.file,
        format: file.format
      });
    });
  }, []);

  return {
    validateFiles,
    validateFile,
    cancelValidation,
    validationProgress: validationQueue.current.size > 0 
      ? ((statsRef.current.validFiles + statsRef.current.invalidFiles) / 
         (statsRef.current.validFiles + statsRef.current.invalidFiles + validationQueue.current.size)) * 100
      : 100
  };
};