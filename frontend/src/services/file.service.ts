// import type { UploadedFile } from '../types/compilation.types';
// import { api } from './api.service';


class FileService {
  
  // // Get file preview
  // async getFilePreview(fileId: string): Promise<any> {
  //   try {
  //     const response = await api.get(`/files/${fileId}/preview`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Failed to get file preview:', error);
  //     throw error;
  //   }
  // }

  // // Download file
  // async downloadFile(fileId: string, fileName: string): Promise<void> {
  //   try {
  //     const blob = await api.downloadFile(fileId);
      
  //     // Create download link
  //     const url = window.URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = fileName;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error('Failed to download file:', error);
  //     throw error;
  //   }
  // }

  // // Delete file
  // async deleteFile(fileId: string): Promise<void> {
  //   await api.deleteFile(fileId);
  // }

  // // Batch delete files
  // async batchDeleteFiles(fileIds: string[]): Promise<void> {
  //   await api.post('/files/batch-delete/', { file_ids: fileIds });
  // }

  // // Get file metadata
  // async getFileMetadata(fileId: string): Promise<any> {
  //   const response = await api.get(`/files/${fileId}/metadata`);
  //   return response.data;
  // }

  // // Search files
  // async searchFiles(params: {
  //   query?: string;
  //   status?: string[];
  //   format?: string[];
  //   date_from?: string;
  //   date_to?: string;
  //   limit?: number;
  //   offset?: number;
  // }): Promise<{ items: UploadedFile[]; total: number }> {
  //   const response = await api.get('/files/search/', { params });
  //   return response.data;
  // }

  // // Get upload progress
  // async getUploadProgress(uploadId: string): Promise<{
  //   progress: number;
  //   uploaded_bytes: number;
  //   total_bytes: number;
  //   speed: number;
  //   eta: number;
  // }> {
  //   const response = await api.get(`/uploads/${uploadId}/progress`);
  //   return response.data;
  // }

  // // Resume upload
  // async resumeUpload(uploadId: string): Promise<void> {
  //   await api.post(`/uploads/${uploadId}/resume`);
  // }

  // // Pause upload
  // async pauseUpload(uploadId: string): Promise<void> {
  //   await api.post(`/uploads/${uploadId}/pause`);
  // }

  // // Cancel upload
  // async cancelUpload(uploadId: string): Promise<void> {
  //   await api.post(`/uploads/${uploadId}/cancel`);
  // }
}

export const fileService = new FileService();