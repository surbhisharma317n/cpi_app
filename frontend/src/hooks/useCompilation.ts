import { useState, useCallback, useRef, useEffect } from 'react';

// import { 
//   CompilationStatus, 
//   CompilationResults, 
//   StartCompilationRequest,
//   UseCompilationProps 
// } from  '../types/compilation';
import axios, { type CancelTokenSource } from 'axios';
import type { CompilationResults, CompilationStatus, StartCompilationRequest, UseCompilationProps } from '../types/compilation';

export const useCompilation = ({ onStart, onProgress, onComplete, onError }: UseCompilationProps) => {
  const [compilationId, setCompilationId] = useState<string | null>(null);
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [compilationProgress, setCompilationProgress] = useState<number>(0);
  const [compilationResults, setCompilationResults] = useState<CompilationResults | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const startCompilation = useCallback(async (request: StartCompilationRequest) => {
    try {
      onStart();
      setCompilationStatus({ status: 'initializing', progress: 0, message: 'Initializing compilation...' });

      cancelTokenRef.current = axios.CancelToken.source();

      const response = await axios.post<{ compilationId: string }>(
        '/api/compilation/start',
        request,
        { cancelToken: cancelTokenRef.current.token }
      );

      const { compilationId } = response.data;
      setCompilationId(compilationId);
      setCompilationStatus({ 
        status: 'running', 
        progress: 0, 
        message: 'Compilation in progress...' 
      });

      // Start polling for status updates
      startPolling(compilationId);

    } catch (error) {
      if (!axios.isCancel(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start compilation';
        setCompilationStatus({ status: 'failed', progress: 0, message: errorMessage });
        onError(errorMessage);
      }
    }
  }, [onStart, onError]);

  const startPolling = useCallback((compilationId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`/api/compilation/${compilationId}/status`);
        const { status, progress, results, error } = response.data;

        setCompilationProgress(progress || 0);
        onProgress(progress || 0);

        setCompilationStatus({
          status: status === 'queued' ? 'initializing' :
                 status === 'processing' ? 'running' :
                 status === 'completed' ? 'completed' : 'failed',
          progress: progress || 0,
          message: getStatusMessage(status, progress),
          results
        });

        if (status === 'completed') {
          stopPolling();
          setCompilationResults(results);
          onComplete(results);
        } else if (status === 'failed') {
          stopPolling();
          onError(error || 'Compilation failed');
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          stopPolling();
          setCompilationStatus({ 
            status: 'failed', 
            progress: 0, 
            message: 'Failed to fetch compilation status' 
          });
          onError('Status check failed');
        }
      }
    }, 2000);
  }, [onProgress, onComplete, onError]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
  
      pollingIntervalRef.current = null;
    }
  }, []);

  const cancelCompilation = useCallback(async () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Compilation cancelled by user');
    }
    stopPolling();
    setCompilationStatus({ status: 'idle', progress: 0, message: 'Compilation cancelled' });
    
    if (compilationId) {
      try {
        await axios.post(`/api/compilation/${compilationId}/cancel`);
      } catch (error) {
        console.error('Failed to cancel compilation:', error);
      }
    }
  }, [compilationId, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [stopPolling]);

  const getStatusMessage = (status: string, progress: number): string => {
    switch (status) {
      case 'queued':
        return 'Waiting in queue...';
      case 'processing':
        return `Compiling... ${progress}%`;
      case 'completed':
        return 'Compilation completed successfully!';
      case 'failed':
        return 'Compilation failed';
      default:
        return 'Processing...';
    }
  };

  return { 
    startCompilation,
    cancelCompilation,
    compilationStatus,
    compilationProgress,
    compilationResults,
    compilationId
  };
};