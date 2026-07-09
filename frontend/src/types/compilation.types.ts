// File Types
export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  format: 'zip' | 'parquet' | 'csv';
  status: 'pending' | 'validating' | 'validated' | 'uploading' | 'uploaded' | 'failed' | 'rejected';
  progress: number;
  checksum?: string;
  serverPath?: string;
  fileId?: string;
  validationErrors?: string[];
  rowCount?: number;
  metadata?: FileMetadata;
  error?: string;
  timestamp: string;
  preview?: any;
}

export interface FileMetadata {
  fileCount?: number;
  totalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
  files?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  encoding?: string;
  delimiter?: string;
  hasHeader?: boolean;
  rowGroupCount?: number;
  createdBy?: string;
  schema?: Record<string, any>;
  compression?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
  metadata: Record<string, any>;
  quality?: number;
  validatedAt: string;
}

export interface ValidationStats {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalRows: number;
  duration: number;
}

// Upload Types
export interface UploadSession {
  session_id: string;
  status: 'PENDING' | 'UPLOADING' | 'VALIDATING' | 'VALIDATED' | 'FAILED';
  total_files: number;
  processed_files: number;
  failed_files: number;
  validation_summary: any;
  file_statuses: UploadStatus[];
  created_at: string;
  updated_at: string;
}

export interface UploadStatus {
  file_id: string;
  file_name: string;
  status: 'pending' | 'uploading' | 'validating' | 'success' | 'error';
  progress: number;
  size: string;
  message?: string;
  timestamp: string;
  error_details?: any;
}

// Compilation Types
export interface CompilationParams {
  month: string;
  year: number;
  compile_type: 'PROVISIONAL' | 'FINAL';
  description?: string;
  tags?: string[];
  priority?: 'normal' | 'high' | 'low';
}

export interface CompilationStage {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  duration?: number;
  details?: string;
  progress?: number;
}

export interface CompilationStatus {
  task_id: string;
  status: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
  progress: number;
  current_stage: string;
  stage_details?: string;
  result_url?: string;
  output_path?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  stages: CompilationStage[];
  metrics?: {
    total_records: number;
    processed_records: number;
    success_rate: number;
    processing_time: number;
    memory_usage?: number;
    cpu_usage?: number;
  };
}

// Database Types
export interface DatabaseSyncStatus {
  status: 'syncing' | 'completed' | 'failed';
  progress: number;
  records_processed?: number;
  total_records?: number;
  records_synced?: number;
  tables_updated?: string[];
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface DatabaseRecord {
  id: string;
  table_name: string;
  record_count: number;
  created_at: string;
  metadata?: Record<string, any>;
}

// Process Stats
export interface ProcessStats {
  uploadStartTime: number | null;
  uploadEndTime: number | null;
  validationStartTime: number | null;
  validationEndTime: number | null;
  compileStartTime: number | null;
  compileEndTime: number | null;
  dbSyncStartTime: number | null;
  dbSyncEndTime: number | null;
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}