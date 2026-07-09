// File related types
export interface FileData {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  status: 'pending' | 'validating' | 'validated' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
  validated: boolean;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

// Form types
export interface FormDataType {
  compilationName: string;
  description: string;
  category: string;
  tags: string;
  deadline: string;
}

// Compilation types
export interface CompilationStatus {
  status: 'idle' | 'initializing' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  results?: CompilationResults;
}

export interface CompilationResults {
  id: string;
  compilationId: string;
  status: string;
  startTime: string;
  endTime?: string;
  summary: {
    totalFiles: number;
    totalRecords: number;
    successCount: number;
    failureCount: number;
  };
  outputData: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    rowCount: number;
  };
  databaseRecords: {
    inputTable: string;
    outputTable: string;
    recordsStored: number;
  };
}

// API request/response types
export interface UploadChunkRequest {
  chunk: Blob;
  fileId: string;
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  metadata: FormDataType;
}

export interface UploadCompleteRequest {
  fileId: string;
  uploadId: string;
  totalChunks: number;
  fileName: string;
}

export interface StartCompilationRequest {
  files: Array<{
    id: string;
    name: string;
    validation: ValidationResult;
  }>;
  metadata: FormDataType;
}

export interface CompilationStatusResponse {
  compilationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  results?: CompilationResults;
  error?: string;
}

// Worker message types
export interface ValidationWorkerMessage {
  fileId: string;
  file: File;
}

export interface ValidationWorkerResponse {
  fileId: string;
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
  validated: boolean;
}

// Hook types
export interface UseChunkedUploadProps {
  onProgress: (fileId: string, progress: number) => void;
  onComplete: (fileId: string) => void;
  onError: (fileId: string, error: string) => void;
}

export interface UseCompilationProps {
  onStart: () => void;
  onProgress: (progress: number) => void;
  onComplete: (results: CompilationResults) => void;
  onError: (error: string) => void;
}