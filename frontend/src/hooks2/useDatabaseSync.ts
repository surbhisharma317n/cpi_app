import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
// import { api } from '../services/api.service';
import type { DatabaseSyncStatus } from '../types/compilation.types';
// import { DatabaseSyncStatus, DatabaseRecord } from '../types/compilation.types';
import { api } from '../services/api.service';

interface UseDatabaseSyncProps {
  onSyncStart?: () => void;
  onProgress?: (status: DatabaseSyncStatus) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export const useDatabaseSync = ({
  onSyncStart,
  onProgress,
  onComplete,
  onError
}: UseDatabaseSyncProps = {}) => {
  
  const [syncStatus, setSyncStatus] = useState<DatabaseSyncStatus | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncToDatabase = useCallback(async (params: {
    compilation_id: string;
    output_path: string;
    tables: string[];
    options: {
      upsert: boolean;
      validate_schema: boolean;
      create_backup: boolean;
    };
  }) => {
    try {
      setIsSyncing(true);
      onSyncStart?.();
      
      // Initial status
      const status: DatabaseSyncStatus = {
        status: 'syncing',
        progress: 0,
        records_processed: 0,
        total_records: 0,
        started_at: new Date().toISOString()
      };
      
      setSyncStatus(status);
      onProgress?.(status);

      // Start sync process
      const response = await api.startDatabaseSync(params);
      const syncId = response.sync_id;
      
      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const syncStatus = await api.getDatabaseSyncStatus(syncId);
          
          setSyncStatus(syncStatus);
          setSyncProgress(syncStatus.progress);
          onProgress?.(syncStatus);
          
          if (syncStatus.status === 'completed') {
            clearInterval(pollInterval);
            setIsSyncing(false);
            
            // Get final results
            const results = await api.completeDatabaseSync(syncId);
            onComplete?.(results);
            
          } else if (syncStatus.status === 'failed') {
            clearInterval(pollInterval);
            setIsSyncing(false);
            onError?.(syncStatus.error_message || 'Sync failed');
          }
          
        } catch (error: any) {
          clearInterval(pollInterval);
          setIsSyncing(false);
          onError?.(error.message);
        }
      }, 2000);

      // Cleanup on component unmount
      return () => clearInterval(pollInterval);
      
    } catch (error: any) {
      setIsSyncing(false);
      onError?.(error.message);
    }
  }, [onSyncStart, onProgress, onComplete, onError]);

  const getSyncHistory = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) => {
    try {
      return await api.getSyncHistory(params);
    } catch (error: any) {
      toast.error(`Failed to fetch sync history: ${error.message}`);
      return [];
    }
  }, []);

  const retrySync = useCallback(async (syncId: string) => {
    try {
      toast.loading('Retrying database sync...');
      const result = await api.retryDatabaseSync(syncId);
      toast.success('Database sync retry started');
      return result;
    } catch (error: any) {
      toast.error(`Failed to retry sync: ${error.message}`);
      throw error;
    }
  }, []);

  const cancelSync = useCallback(async (syncId: string) => {
    try {
      await api.cancelDatabaseSync(syncId);
      setIsSyncing(false);
      setSyncStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        error_message: 'Cancelled by user'
      } : null);
      toast('Database sync cancelled');
    } catch (error: any) {
      toast.error(`Failed to cancel sync: ${error.message}`);
    }
  }, []);

  return {
    syncToDatabase,
    getSyncHistory,
    retrySync,
    cancelSync,
    syncStatus,
    syncProgress,
    isSyncing
  };
};