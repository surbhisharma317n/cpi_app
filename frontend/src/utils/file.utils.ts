// import { UploadedFile } from '../types/compilation.types';
import type { UploadedFile } from '../types/compilation.types';

// Generate unique file ID
export const generateFileId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format time
export const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

// Calculate file checksum
export const calculateChecksum = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Extract metadata from ZIP file
export const extractMetadataFromZip = async (file: File): Promise<Record<string, any>> => {
  if (!file.name.endsWith('.zip')) {
    return {};
  }

  try {
    // Basic metadata without parsing entire ZIP
    return {
      fileCount: 0, // Will be populated during validation
      estimatedSize: file.size,
      type: 'application/zip'
    };
  } catch (error) {
    console.error('Failed to extract ZIP metadata:', error);
    return {};
  }
};

// Validate file structure
export const validateFileStructure = (file: File): { valid: boolean; error?: string } => {
  // Check file extension
  const validExtensions = ['.zip', '.parquet', '.csv'];
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Only ZIP, Parquet, and CSV files are allowed.'
    };
  }

  // Check file size (500MB max)
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds maximum limit of 500MB.'
    };
  }

  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.'
    };
  }

  return { valid: true };
};

// Group files by status
export const groupFilesByStatus = (files: UploadedFile[]) => {
  return files.reduce((acc, file) => {
    acc[file.status] = acc[file.status] || [];
    acc[file.status].push(file);
    return acc;
  }, {} as Record<string, UploadedFile[]>);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Batch array into chunks
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Retry function with exponential backoff
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};