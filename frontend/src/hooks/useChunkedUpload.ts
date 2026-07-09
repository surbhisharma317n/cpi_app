import { useState } from 'react';
// import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios';
import type {  FileData, FormDataType, UseChunkedUploadProps } from '../types/compilation';
import type { AxiosProgressEvent, CancelTokenSource } from 'axios';
import axios from 'axios';
// import { FileData, FormDataType, UseChunkedUploadProps } from '../types';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const CONCURRENCY_LIMIT = 3;

export const useChunkedUpload = ({ onProgress, onComplete, onError }: UseChunkedUploadProps) => {
  const [uploads, setUploads] = useState<Record<string, CancelTokenSource>>({});
  const [activeUploads, setActiveUploads] = useState<number>(0);

  const uploadFileInChunks = async (
    file: File, 
    fileId: string, 
    metadata: FormDataType
  ): Promise<void> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${fileId}-${Date.now()}`;
    const cancelToken = axios.CancelToken.source();
    
    setUploads(prev => ({ ...prev, [fileId]: cancelToken }));

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('fileId', fileId);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('metadata', JSON.stringify(metadata));

        await axios.post('/api/upload/chunk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          cancelToken: cancelToken.token,
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const chunkProgress = (chunkIndex / totalChunks) * 100;
              const chunkPercent = (progressEvent.loaded / progressEvent.total) * (100 / totalChunks);
              const overallProgress = Math.min(99, Math.round(chunkProgress + chunkPercent));
              onProgress(fileId, overallProgress);
            }
          }
        });

        // Update progress after chunk completes
        const progress = Math.min(99, Math.round(((chunkIndex + 1) / totalChunks) * 100));
        onProgress(fileId, progress);
      }

      // Notify server that all chunks are uploaded
      await axios.post('/api/upload/complete', {
        fileId,
        uploadId,
        totalChunks,
        fileName: file.name,
        metadata
      });

      onProgress(fileId, 100);
      onComplete(fileId);
      
    } catch (error) {
      if (!axios.isCancel(error)) {
        onError(fileId, error instanceof Error ? error.message : 'Upload failed');
      }
    } finally {
      setUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[fileId];
        return newUploads;
      });
      setActiveUploads(prev => Math.max(0, prev - 1));
    }
  };

  const uploadFiles = async (files: FileData[], metadata: FormDataType): Promise<void> => {
    const uploadPromises = files
      .filter(f => f.status !== 'uploaded')
      .map(fileObj => async () => {
        setActiveUploads(prev => prev + 1);
        await uploadFileInChunks(fileObj.file, fileObj.id, metadata);
      });

    // Process with concurrency limit
    const results: Promise<void>[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of uploadPromises) {
      const p = promise();
      results.push(p);
      
      if (uploadPromises.length > CONCURRENCY_LIMIT) {
        const e: Promise<void> = p.then(() => {
          executing.splice(executing.indexOf(e), 1);
        });
        executing.push(e);
        
        if (executing.length >= CONCURRENCY_LIMIT) {
          await Promise.race(executing);
        }
      }
    }

    await Promise.all(results);
  };

  const cancelUpload = (fileId: string): void => {
    const upload = uploads[fileId];
    if (upload) {
      upload.cancel('Upload cancelled by user');
      setUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[fileId];
        return newUploads;
      });
      onError(fileId, 'Upload cancelled');
    }
  };

  const cancelAllUploads = (): void => {
    Object.values(uploads).forEach(upload => {
      upload.cancel('Upload cancelled by user');
    });
    setUploads({});
    setActiveUploads(0);
  };

  return { 
    uploadFiles, 
    cancelUpload,
    cancelAllUploads,
    activeUploads 
  };
};