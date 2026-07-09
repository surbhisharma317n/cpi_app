import axios, { type AxiosInstance } from 'axios';
import type { 
  // ApiResponse,
UploadSession,
CompilationStatus,
DatabaseSyncStatus,
// CompilationParams
 } from '../types/compilation.types';


// import { 
//   ApiResponse, 
//   UploadSession, 
//   CompilationStatus,
//   DatabaseSyncStatus,
//   CompilationParams 
// } from '../types/compilation.types';

const API_BASE =  'http://localhost:8000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Upload endpoints
  async createUploadSession(params: {
    month: string;
    year: number;
    compile_type: string;
    total_files: number;
    metadata?: any;
  }): Promise<UploadSession> {
    const response = await this.api.post('/uploads/sessions/', params);
    return response.data;
  }

  async completeUploadSession(sessionId: string): Promise<UploadSession> {
    const response = await this.api.post(`/uploads/sessions/${sessionId}/complete`);
    return response.data;
  }

  async getUploadStatus(sessionId: string): Promise<UploadSession> {
    const response = await this.api.get(`/uploads/status/${sessionId}/`);
    return response.data;
  }

  // Compilation endpoints
  async startCompilation(params: {
    session_id: string;
    month: string;
    year: number;
    compile_type: string;
    files: Array<{ id: string; path: string; checksum?: string }>;
  }): Promise<{ task_id: string }> {
    const response = await this.api.post('/compilation/', params);
    return response.data;
  }

  async getCompilationStatus(taskId: string): Promise<CompilationStatus> {
    const response = await this.api.get(`/compilation/${taskId}/status/`);
    return response.data;
  }

  async cancelCompilation(taskId: string): Promise<void> {
    await this.api.post(`/compilation/${taskId}/cancel`);
  }

  // Database sync endpoints
  async startDatabaseSync(params: {
    compilation_id: string;
    output_path: string;
    tables: string[];
    options: any;
  }): Promise<{ sync_id: string }> {
    const response = await this.api.post('/database/sync/', params);
    return response.data;
  }

  async getDatabaseSyncStatus(syncId: string): Promise<DatabaseSyncStatus> {
    const response = await this.api.get(`/database/sync/${syncId}/status/`);
    return response.data;
  }

  async completeDatabaseSync(syncId: string): Promise<any> {
    const response = await this.api.post(`/database/sync/${syncId}/complete`);
    return response.data;
  }

  async getSyncHistory(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any[]> {
    const response = await this.api.get('/database/sync/history/', { params });
    return response.data;
  }

  async retryDatabaseSync(syncId: string): Promise<any> {
    const response = await this.api.post(`/database/sync/${syncId}/retry`);
    return response.data;
  }

  async cancelDatabaseSync(syncId: string): Promise<void> {
    await this.api.post(`/database/sync/${syncId}/cancel`);
  }

  // File endpoints
  async getFilePreview(fileId: string): Promise<any> {
    const response = await this.api.get(`/files/${fileId}/preview`);
    return response.data;
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.api.delete(`/files/${fileId}`);
  }
}

export const api = new ApiService();