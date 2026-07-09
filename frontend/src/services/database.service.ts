// import type { DatabaseRecord } from '../types/compilation.types';
// import { api } from './api.service';


class DatabaseService {
  
  // // Get synced records
  // async getRecords(params: {
  //   compilation_id?: string;
  //   table_name?: string;
  //   limit?: number;
  //   offset?: number;
  //   order_by?: string;
  // }): Promise<DatabaseRecord[]> {
  //   try {
  //     const response = await api.get('/database/records/', { params });
  //     return response.data;
  //   } catch (error) {
  //     console.error('Failed to fetch records:', error);
  //     throw error;
  //   }
  // }

  // // Get record by ID
  // async getRecordById(recordId: string): Promise<DatabaseRecord> {
  //   const response = await api.get(`/database/records/${recordId}`);
  //   return response.data;
  // }

  // // Export records
  // async exportRecords(params: {
  //   format: 'csv' | 'json' | 'parquet';
  //   filters?: Record<string, any>;
  // }): Promise<Blob> {
  //   const response = await api.get('/database/export/', {
  //     params,
  //     responseType: 'blob',
  //   });
  //   return response.data;
  // }

  // // Get table schema
  // async getTableSchema(tableName: string): Promise<any> {
  //   const response = await api.get(`/database/schema/${tableName}`);
  //   return response.data;
  // }

  // // Query records
  // async queryRecords(params: {
  //   table: string;
  //   columns?: string[];
  //   where?: Record<string, any>;
  //   order_by?: string;
  //   limit?: number;
  // }): Promise<any[]> {
  //   const response = await api.post('/database/query/', params);
  //   return response.data;
  // }

  // // Get statistics
  // async getStatistics(compilationId?: string): Promise<any> {
  //   const response = await api.get('/database/statistics/', {
  //     params: { compilation_id: compilationId },
  //   });
  //   return response.data;
  // }

  // // Validate data before sync
  // async validateData(data: any[], schema: any): Promise<{
  //   valid: boolean;
  //   errors: string[];
  //   warnings: string[];
  // }> {
  //   const response = await api.post('/database/validate/', { data, schema });
  //   return response.data;
  // }

  // // Create backup
  // async createBackup(tables: string[]): Promise<{ backup_id: string; size: number }> {
  //   const response = await api.post('/database/backup/', { tables });
  //   return response.data;
  // }

  // // Restore from backup
  // async restoreFromBackup(backupId: string): Promise<void> {
  //   await api.post(`/database/backup/${backupId}/restore`);
  // }
}

export const databaseService = new DatabaseService();