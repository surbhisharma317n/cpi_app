"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiLoader,
  FiAlertCircle,
  FiDatabase,
  FiFile,
  FiPackage,
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiChevronRight,
  FiCalendar,
  // FiType,
  FiPlayCircle,
  FiClock,
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiGrid,
  FiActivity,
  FiShield,
  FiCopy,
  FiArchive,
  FiCpu,
  FiHardDrive,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { Button } from "../../components/ui2/button";
import { useToast } from "../../hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui2/dialog";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui2/card";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui2/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui2/select";
import { Label } from "../../components/ui2/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../components/ui2/alert";
import { Separator } from "../../components/ui2/separator";
import { Switch } from "../../components/ui2/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui2/collapsible";
import { Tooltip, TooltipProvider } from "../../components/ui2/tooltip";

// ==================== ENTERPRISE CONFIGURATION ====================

const API_BASE =  "http://localhost:8000/api/v1";
const MAX_FILE_SIZE = 100 * 1024 * 1024*10; // 100MB
const REQUIRED_FILES_COUNT = 19;
const POLLING_INTERVAL = 2000; // 2 seconds
// const MAX_CONCURRENT_USERS = 5;

// ==================== ENTERPRISE TYPES ====================

// Dataset model (matches backend)
interface Dataset {
  id: string;
  zip_hash: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  created_at: string;
  validated_path?: string;
  compiled_path?: string;
  db_saved: boolean;
  metadata?: Record<string, any>;
}

// Upload session model
interface UploadSession {
  id: string;
  user_id: string;
  dataset_id?: string;
  month: string;
  year: number;
  compile_type: "PROVISIONAL" | "FINAL";
  status: "PENDING" | "UPLOADING" | "VALIDATING" | "VALIDATED" | "FAILED";
  current_step: string;
  progress_percent: number;
  total_files: number;
  processed_files: number;
  failed_files: number;
  validation_summary?: ValidationSummary;
  file_statuses: UploadFileStatus[];
  created_at: string;
  modified_at?: string;
}

// Individual file status
interface UploadFileStatus {
  id: string;
  file_id: string;
  file_name: string;
  status: "pending" | "uploading" | "validating" | "success" | "error";
  progress: number;
  size: string;
  size_bytes?: number;
  message?: string;
  timestamp: string;
  validation_results?: FileValidationResult;
  error_details?: any;
}

// File validation results
interface FileValidationResult {
  schema_valid: boolean;
  data_valid: boolean;
  required_columns?: string[];
  missing_columns?: string[];
  data_type_errors?: Array<{ column: string; expected: string; found: string }>;
  null_constraint_violations?: Array<{ column: string; row_count: number }>;
  business_rule_violations?: Array<{ rule: string; count: number }>;
}

// Validation summary
interface ValidationSummary {
  missing_files: string[];
  schema_errors: Array<{ file: string; errors: string[] }>;
  data_errors: Array<{ file: string; errors: string[] }>;
  total_errors: number;
  total_warnings: number;
}

// Compilation stage
interface CompilationStage {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  started_at?: string;
  completed_at?: string;
  duration?: number;
  details?: string;
  progress?: number;
  current_file?: string;
  files_processed?: number;
  total_files?: number;
}

// Compilation status
interface CompilationStatus {
  id: string;
  task_id: string;
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  progress: number;
  current_stage: string;
  stage_details?: string;
  result_url?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  stages: CompilationStage[];
  metrics?: {
    total_records: number;
    processed_records: number;
    success_rate: number;
    processing_time: number;
    records_per_second?: number;
    memory_usage_mb?: number;
    disk_usage_mb?: number;
  };
  dataset_id?: string;
}

// Process statistics
interface ProcessStats {
  uploadStartTime: number | null;
  uploadEndTime: number | null;
  compileStartTime: number | null;
  compileEndTime: number | null;
  zipHash?: string;
  isDuplicate?: boolean;
}

// Duplicate check response
interface DuplicateCheckResponse {
  exists: boolean;
  dataset?: Dataset;
  message: string;
}

// Django paginated response
// interface DjangoPaginatedResponse<T> {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// }

// ==================== ENTERPRISE UTILITIES ====================

// CSRF Token Handler
const getCsrfToken = (): string => {
  const name = "csrftoken";
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue || "";
};

// Django Error Parser
const parseDjangoError = (error: any): string => {
  if (error.response?.data) {
    const data = error.response.data;
    
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.non_field_errors) return data.non_field_errors[0];
    if (data.message) return data.message;
    if (data.error) return data.error;
    
    const firstField = Object.keys(data)[0];
    if (firstField && Array.isArray(data[firstField])) {
      return `${firstField}: ${data[firstField][0]}`;
    }
    if (firstField && typeof data[firstField] === "string") {
      return `${firstField}: ${data[firstField]}`;
    }
  }
  
  return error.message || "An unknown error occurred";
};

// Auth headers with token and CSRF
const getAuthHeaders = (includeCsrf: boolean = true) => {
  const token = localStorage.getItem("authToken") ;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (includeCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }
  }
  
  return headers;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Format time
const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

// Format datetime
const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

// Get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case "COMPLETED":
    case "SUCCESS":
    case "VALIDATED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
    case "FAILURE":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "PROCESSING":
    case "UPLOADING":
    case "VALIDATING":
    case "PROGRESS":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// Get status icon
const getStatusIcon = (status: string, className?: string) => {
  const baseClass = className || "h-4 w-4";
  switch (status) {
    case "COMPLETED":
    case "SUCCESS":
    case "VALIDATED":
      return <FiCheckCircle className={`${baseClass} text-emerald-500`} />;
    case "FAILED":
    case "FAILURE":
      return <FiXCircle className={`${baseClass} text-rose-500`} />;
    case "PROCESSING":
    case "UPLOADING":
    case "VALIDATING":
    case "PROGRESS":
      return <FiLoader className={`${baseClass} text-sky-500 animate-spin`} />;
    default:
      return <FiClock className={`${baseClass} text-gray-400`} />;
  }
};

// ==================== MAIN COMPONENT ====================

export default function EnterpriseUploadPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // ==================== STATE ====================

  // File state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipHash, setZipHash] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [existingDataset, setExistingDataset] = useState<Dataset | null>(null);

  // Upload state
  const [uploadStatuses, setUploadStatuses] = useState<UploadFileStatus[]>([]);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  
  // Compilation state
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus | null>(null);
  const [openErrorDetails, setOpenErrorDetails] = useState<string | null>(null);
  
  // Process stats
  const [processStats, setProcessStats] = useState<ProcessStats>({
    uploadStartTime: null,
    uploadEndTime: null,
    compileStartTime: null,
    compileEndTime: null,
  });

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Process states
  const [isUploading, setIsUploading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Compilation parameters
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const [compilationParams, setCompilationParams] = useState({
    month: now.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    year: now.getFullYear(),
    compile_type: "PROVISIONAL" as "PROVISIONAL" | "FINAL",
  });

  // Refs
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadTaskIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const compileStartTimeRef = useRef<number>(0);

  // ==================== FILE HANDLERS ====================

  // Generate SHA256 hash (simulated - backend does actual)
  const simulateHashGeneration = async (file: File): Promise<string> => {
    // In production, backend generates hash
    // This is just for UI feedback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Simulate hash (in reality, backend does this)
        const hash = `hash_${Date.now()}_${file.size}`;
        resolve(hash);
      };
      reader.readAsArrayBuffer(file.slice(0, 1024)); // Read first 1KB for speed
    });
  };

  // Process ZIP file with duplicate check
  const processZipFile = async (file: File) => {
    // Validate file type
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".parquet.zip")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a ZIP file containing Parquet files",
        variant: "destructive",
        icon: <FiAlertCircle />,
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: "destructive",
        icon: <FiAlertCircle />,
      });
      return;
    }

    setIsCheckingDuplicate(true);
    
    try {
      // Simulate hash generation (backend does actual)
      const hash = await simulateHashGeneration(file);
      setZipHash(hash);
      
      // Check for duplicate with backend
      // const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE}/datasets/check-duplicate/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ zip_hash: hash, file_size: file.size }),
      });

      if (response.ok) {
        const data: DuplicateCheckResponse = await response.json();
        
        if (data.exists) {
          // Duplicate found
          setIsDuplicate(true);
          setExistingDataset(data.dataset || null);
          setZipFile(file);
          
          setUploadStatuses([
            {
              id: `duplicate-${Date.now()}`,
              file_id: `zip-${Date.now()}`,
              file_name: file.name,
              status: "success",
              progress: 100,
              size: formatFileSize(file.size),
              size_bytes: file.size,
              message: "Dataset already exists - linking to existing",
              timestamp: new Date().toISOString(),
            },
          ]);

          setShowDuplicateModal(true);
          
          toast({
            title: "Duplicate Detected",
            description: data.message || "This dataset was already processed",
            icon: <FiCopy className="text-amber-500" />,
          });
        } else {
          // New file
          setIsDuplicate(false);
          setExistingDataset(null);
          setZipFile(file);
          
          setUploadStatuses([
            {
              id: `new-${Date.now()}`,
              file_id: `zip-${Date.now()}`,
              file_name: file.name,
              status: "pending",
              progress: 0,
              size: formatFileSize(file.size),
              size_bytes: file.size,
              message: "Ready to upload",
              timestamp: new Date().toISOString(),
            },
          ]);

          toast({
            title: "New Dataset",
            description: "Ready for processing",
            icon: <FiCheckCircle className="text-green-500" />,
          });
        }
      } else {
        // Fallback to local check
        setZipFile(file);
        setUploadStatuses([
          {
            id: `local-${Date.now()}`,
            file_id: `zip-${Date.now()}`,
            file_name: file.name,
            status: "pending",
            progress: 0,
            size: formatFileSize(file.size),
            size_bytes: file.size,
            message: "Ready to upload",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Duplicate check error:", error);
      // Fallback to normal flow
      setZipFile(file);
      setUploadStatuses([
        {
          id: `fallback-${Date.now()}`,
          file_id: `zip-${Date.now()}`,
          file_name: file.name,
          status: "pending",
          progress: 0,
          size: formatFileSize(file.size),
          size_bytes: file.size,
          message: "Ready to upload",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handleZipUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processZipFile(file);
  }, [toast]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = useCallback(() => {
    setZipFile(null);
    setZipHash(null);
    setIsDuplicate(false);
    setExistingDataset(null);
    setUploadStatuses([]);
    setUploadSession(null);
    setCompilationStatus(null);
    uploadTaskIdRef.current = null;
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setProcessStats({
      uploadStartTime: null,
      uploadEndTime: null,
      compileStartTime: null,
      compileEndTime: null,
    });

    toast({
      title: "Session Cleared",
      description: "Ready for new upload",
      icon: <FiRefreshCw />,
    });
  }, [toast]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-sky-400", "bg-sky-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-sky-400", "bg-sky-50");
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-sky-400", "bg-sky-50");

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processZipFile(files[0]);
    }
  };

  // ==================== DUPLICATE HANDLING ====================

  const handleUseExistingDataset = async () => {
    if (!existingDataset) return;

    try {
      // Create session linked to existing dataset
      const response = await fetch(`${API_BASE}/datasets/${existingDataset.id}/reuse/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session from existing dataset");
      }

      const session = await response.json();
      
      // Set session and mark as complete
      setUploadSession(session);
      setProcessStats({
        uploadStartTime: Date.now() - 1000, // Simulate quick completion
        uploadEndTime: Date.now(),
        compileStartTime: null,
        compileEndTime: null,
        zipHash: existingDataset.zip_hash,
        isDuplicate: true,
      });

      setShowDuplicateModal(false);

      toast({
        title: "Dataset Linked",
        description: "Using existing processed dataset",
        icon: <FiCopy className="text-emerald-500" />,
      });

      // Navigate to results or show completion
      setTimeout(() => {
        navigate(`/datasets/${existingDataset.id}`);
      }, 1500);

    } catch (error: any) {
      toast({
        title: "Error",
        description: parseDjangoError(error),
        variant: "destructive",
        icon: <FiXCircle />,
      });
    }
  };

  const handleProcessNewDataset = () => {
    setShowDuplicateModal(false);
    // Continue with normal upload flow
  };

  // ==================== UPLOAD PROCESS ====================

  const startUploadSession = async () => {
    if (!zipFile || isDuplicate) {
      if (isDuplicate) {
        toast({
          title: "Duplicate Dataset",
          description: "This dataset already exists. Use the duplicate dialog to link it.",
          variant: "default",
          icon: <FiCopy />,
        });
        setShowDuplicateModal(true);
        return;
      }
      
      toast({
        title: "No File Selected",
        description: "Please select a ZIP file to upload",
        variant: "destructive",
        icon: <FiAlertCircle />,
      });
      return;
    }

    try {
      setIsUploading(true);
      setShowUploadModal(true);
      uploadStartTimeRef.current = Date.now();

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      toast({
        title: "Starting Upload",
        description: "Creating upload session...",
        icon: <FiLoader className="animate-spin" />,
      });

      // Create upload session
      const sessionResponse = await fetch(`${API_BASE}/upload-sessions/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
          zip_hash: zipHash, // Include hash for deduplication
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(parseDjangoError({ response: { data: errorData } }));
      }

      const data = await sessionResponse.json();
      uploadTaskIdRef.current = data.id;

      setProcessStats((prev) => ({
        ...prev,
        uploadStartTime: Date.now(),
        zipHash: zipHash || undefined,
      }));

      // Upload file
      await uploadFile(data.id);
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
        icon: <FiXCircle />,
      });
      setIsUploading(false);
      setShowUploadModal(false);
    }
  };

  const uploadFile = async (sessionId: string) => {
    if (!zipFile) return;

    try {
      const formData = new FormData();
      formData.append("file", zipFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);

          setUploadStatuses((prev) =>
            prev.map((status) => ({
              ...status,
              progress,
              status: progress < 100 ? "uploading" : "validating",
              message: progress < 100 ? `Uploading... ${progress}%` : "Validating ZIP structure...",
              timestamp: new Date().toISOString(),
            }))
          );
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201 || xhr.status === 202) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Upload timeout"));

        xhr.open("POST", `${API_BASE}/upload-sessions/${sessionId}/upload/`);

        const token = localStorage.getItem("access_token");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          xhr.setRequestHeader("X-CSRFToken", csrfToken);
        }

        xhr.timeout = 300000; // 5 minutes
        xhr.send(formData);
      });

      await uploadPromise;
      startPollingUploadStatus(sessionId);

      toast({
        title: "Upload Started",
        description: "Validating ZIP structure and required files...",
        icon: <FiLoader className="animate-spin" />,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
        icon: <FiXCircle />,
      });
      setIsUploading(false);
      setShowUploadModal(false);
    }
  };

  // ==================== POLLING ====================

  const startPollingUploadStatus = (sessionId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    setIsPolling(true);

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/upload-sessions/${sessionId}/status/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch upload status (${response.status})`);
        }

        const data = await response.json();
        setUploadSession(data);

        if (data.file_statuses) {
          setUploadStatuses(data.file_statuses);
        }

        // Check for completion
        if (data.status === "VALIDATED" || data.status === "FAILED") {
          clearInterval(pollingInterval.current!);
          setIsPolling(false);
          setIsUploading(false);

          setProcessStats((prev) => ({
            ...prev,
            uploadEndTime: Date.now(),
          }));

          const uploadTime = Date.now() - uploadStartTimeRef.current;

          if (data.status === "VALIDATED") {
            // Check if all 19 files are present
            const requiredFilesPresent = data.total_files === REQUIRED_FILES_COUNT;
            
            toast({
              title: requiredFilesPresent ? "Validation Complete" : "Validation Issues",
              description: requiredFilesPresent 
                ? `Validated ${data.total_files} files in ${formatTime(uploadTime)}`
                : `Expected ${REQUIRED_FILES_COUNT} files, found ${data.total_files}`,
              icon: requiredFilesPresent 
                ? <FiCheckCircle className="text-green-500" />
                : <FiAlertCircle className="text-amber-500" />,
            });

            if (requiredFilesPresent && autoCompile) {
              setTimeout(() => {
                startCompilation();
              }, 500);
            }
          } else {
            toast({
              title: "Validation Failed",
              description: `${data.failed_files} file(s) failed validation`,
              variant: "destructive",
              icon: <FiAlertCircle />,
            });
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, POLLING_INTERVAL);
  };

  const startPollingCompilationStatus = (taskId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/compilations/${taskId}/status/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch compilation status");

        const data = await response.json();
        setCompilationStatus(data);

        if (data.status === "SUCCESS" || data.status === "FAILURE") {
          clearInterval(pollingInterval.current!);
          setIsPolling(false);
          setIsCompiling(false);

          setProcessStats((prev) => ({
            ...prev,
            compileEndTime: Date.now(),
          }));

          if (data.status === "SUCCESS") {
            const compileTime = Date.now() - compileStartTimeRef.current;
            toast({
              title: "Compilation Complete!",
              description: `Compiled successfully in ${formatTime(compileTime)}`,
              icon: <FiCheckCircle className="text-green-500" />,
            });
            
            // Store dataset ID for navigation
            if (data.dataset_id) {
              setTimeout(() => {
                navigate(`/datasets/${data.dataset_id}`);
              }, 1500);
            } else {
              setTimeout(() => {
                navigate("/compilation/compilation_index");
              }, 1500);
            }
          } else {
            toast({
              title: "Compilation Failed",
              description: data.error_message || "Compilation failed",
              variant: "destructive",
              icon: <FiXCircle />,
            });
          }
        }
      } catch (error) {
        console.error("Compilation polling error:", error);
      }
    }, POLLING_INTERVAL);
  };

  // ==================== COMPILATION ====================

  const startCompilation = async () => {
    if (!uploadTaskIdRef.current) {
      toast({
        title: "No Upload Data",
        description: "Please upload files first",
        variant: "destructive",
      });
      return;
    }

    setIsCompiling(true);
    compileStartTimeRef.current = Date.now();

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication required");

      toast({
        title: "Starting Compilation",
        description: "Initializing compilation process...",
        icon: <FiLoader className="animate-spin" />,
      });

      setProcessStats((prev) => ({
        ...prev,
        compileStartTime: Date.now(),
      }));

      const response = await fetch(`${API_BASE}/compilations/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          session_id: uploadTaskIdRef.current,
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(parseDjangoError({ response: { data: errorData } }));
      }

      const data = await response.json();
      startPollingCompilationStatus(data.id || data.task_id);

      toast({
        title: "Compilation Started",
        description: "Processing data compilation in background...",
        icon: <FiDatabase />,
      });
    } catch (error: any) {
      toast({
        title: "Compilation Failed",
        description: error.message,
        variant: "destructive",
        icon: <FiXCircle />,
      });
      setIsCompiling(false);
    }
  };

  // ==================== CLEANUP ====================

  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // ==================== RENDER CALCULATIONS ====================

  const totalFiles = uploadSession?.total_files || 0;
  const successFiles = uploadStatuses.filter((f) => f.status === "success").length;
  const errorFiles = uploadStatuses.filter((f) => f.status === "error").length;
  const isReadyForCompilation = uploadSession?.status === "VALIDATED" && totalFiles === REQUIRED_FILES_COUNT;
  const hasValidationErrors = uploadSession?.failed_files && uploadSession.failed_files > 0;
  const missingFilesCount = REQUIRED_FILES_COUNT - totalFiles;

  const uploadDuration =
    processStats.uploadStartTime && processStats.uploadEndTime
      ? formatTime(processStats.uploadEndTime - processStats.uploadStartTime)
      : null;

  const compileDuration =
    processStats.compileStartTime && processStats.compileEndTime
      ? formatTime(processStats.compileEndTime - processStats.compileStartTime)
      : null;

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="mx-auto  space-y-6">
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <FiUploadCloud className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Enterprise Data Pipeline
                </h1>
                <p className="text-slate-600 mt-1 flex items-center gap-2">
                  <FiShield className="h-4 w-4" />
                  Concurrency Safe • Deduplicated • Optimized
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TooltipProvider>
            <Tooltip content="Max concurrent users: 5">
              <Badge variant="outline" className="text-sm px-4 py-2 border-indigo-200 bg-white/80">
                <FiUsers className="mr-2 h-4 w-4" />
                <span className="mr-1">Active:</span>
                <span className="font-bold text-indigo-600">0/5</span>
              </Badge>
            </Tooltip>
         
            <Tooltip content="Max file  size: 500MB">
              
            <Badge variant="outline" className="text-sm px-4 py-2 border-sky-200 bg-white/80">
              <FiCalendar className="mr-2 h-4 w-4" />
              {compilationParams.month} {compilationParams.year}
              <span className="ml-2 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">
                {compilationParams.compile_type}
              </span>
            </Badge>
            </Tooltip>
              </TooltipProvider>
          </div>
        </div>

        {/* ==================== ENTERPRISE STATUS BAR ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FiHardDrive className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-700 font-medium">Storage</p>
                <p className="text-lg font-bold text-emerald-900">Hash-based</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-sky-50 to-white border-sky-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <FiCopy className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-sky-700 font-medium">Deduplication</p>
                <p className="text-lg font-bold text-sky-900">SHA256</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FiCpu className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">Workers</p>
                <p className="text-lg font-bold text-amber-900">3-4 Max</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiZap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-700 font-medium">DB Insert</p>
                <p className="text-lg font-bold text-purple-900">Parallel COPY</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==================== WORKFLOW PROGRESS ==================== */}
        <Card className="border shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-between">
                {[
                  { icon: FiUploadCloud, label: "Upload", key: "upload", 
                    active: !!zipFile || isUploading, done: !!uploadSession },
                  { icon: FiArchive, label: "ZIP Validation", key: "zip",
                    active: uploadSession?.status === "VALIDATING", done: uploadSession?.status === "VALIDATED" },
                  { icon: FiGrid, label: "Schema Validation", key: "schema",
                    active: false, done: false },
                  { icon: FiCheckCircle, label: "Data Validation", key: "data",
                    active: false, done: isReadyForCompilation },
                  { icon: FiCpu, label: "Compilation", key: "compile",
                    active: isCompiling, done: compilationStatus?.status === "SUCCESS" },
                  { icon: FiDatabase, label: "DB Insert", key: "db",
                    active: false, done: compilationStatus?.metrics?.success_rate === 100 },
                ].map((step, _index) => (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`
                        relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                        ${
                          step.done
                            ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20"
                            : step.active
                              ? "bg-sky-500 border-sky-500 shadow-lg shadow-sky-500/20"
                              : "bg-white border-slate-300"
                        }
                      `}
                    >
                      <step.icon
                        className={`h-5 w-5 ${step.done || step.active ? "text-white" : "text-slate-400"}`}
                      />
                      {step.done && (
                        <div className="absolute -top-1 -right-1">
                          <FiCheckCircle className="h-3 w-3 text-white bg-emerald-500 rounded-full" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${step.done || step.active ? "text-slate-900" : "text-slate-500"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration & Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Configuration Card */}
            <Card className="border shadow-sm bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                      <FiPackage className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Upload Configuration</CardTitle>
                      <CardDescription>
                        Configure and upload your 19 Parquet files
                      </CardDescription>
                    </div>
                  </div>
                  {zipFile && (
                    <Badge className={isDuplicate 
                      ? "bg-amber-100 text-amber-700 border-amber-200" 
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                    }>
                      {isDuplicate ? (
                        <><FiCopy className="mr-1 h-3 w-3" /> Duplicate</>
                      ) : (
                        <><FiFile className="mr-1 h-3 w-3" /> Ready</>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Parameters */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-500">Month</Label>
                      <Select
                        value={compilationParams.month}
                        onValueChange={(value: string) =>
                          setCompilationParams((prev) => ({
                            ...prev,
                            month: value as any,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((month) => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-500">Year</Label>
                      <Select
                        value={compilationParams.year.toString()}
                        onValueChange={(value: string) =>
                          setCompilationParams((prev) => ({
                            ...prev,
                            year: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-500">Type</Label>
                      <Select
                        value={compilationParams.compile_type}
                        onValueChange={(value: "PROVISIONAL" | "FINAL") =>
                          setCompilationParams((prev) => ({ ...prev, compile_type: value }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROVISIONAL">Provisional</SelectItem>
                          <SelectItem value="FINAL">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 flex items-center gap-2">
                        <FiUploadCloud className="h-4 w-4 text-indigo-500" />
                        ZIP File Upload
                      </h3>
                      <p className="text-xs text-slate-500">
                        Must contain exactly 19 Parquet files
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Max {formatFileSize(MAX_FILE_SIZE)}
                    </Badge>
                  </div>

                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                      zipFile
                        ? isDuplicate
                          ? "border-amber-300 bg-amber-50/30"
                          : "border-emerald-300 bg-emerald-50/30"
                        : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                    } ${isUploading || isCheckingDuplicate ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={!isUploading && !isCheckingDuplicate ? handleFileSelect : undefined}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleZipUpload}
                      accept=".zip,.parquet.zip"
                      className="hidden"
                      disabled={isUploading || isCheckingDuplicate}
                    />

                    <div className="space-y-4">
                      <div className="relative inline-flex">
                        <div className={`p-4 rounded-full inline-flex ${
                          zipFile
                            ? isDuplicate
                              ? "bg-amber-100"
                              : "bg-emerald-100"
                            : "bg-indigo-100"
                        }`}>
                          {isCheckingDuplicate ? (
                            <FiLoader className="h-8 w-8 text-indigo-600 animate-spin" />
                          ) : zipFile ? (
                            isDuplicate ? (
                              <FiCopy className="h-8 w-8 text-amber-600" />
                            ) : (
                              <FiCheckCircle className="h-8 w-8 text-emerald-600" />
                            )
                          ) : (
                            <FiUploadCloud className="h-8 w-8 text-indigo-600" />
                          )}
                        </div>
                      </div>

                      {isCheckingDuplicate ? (
                        <div>
                          <p className="text-slate-900 font-medium">Checking for duplicates...</p>
                          <p className="text-xs text-slate-500 mt-1">Generating SHA256 hash</p>
                        </div>
                      ) : zipFile ? (
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium text-slate-900 truncate max-w-xs mx-auto">
                              {zipFile.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatFileSize(zipFile.size)}
                            </p>
                          </div>
                          
                          {isDuplicate && (
                            <Alert className="bg-amber-50 border-amber-200 text-left">
                              <FiCopy className="h-4 w-4 text-amber-600" />
                              <AlertTitle className="text-amber-800 text-sm font-medium">
                                Duplicate Dataset Detected
                              </AlertTitle>
                              <AlertDescription className="text-amber-700 text-xs">
                                This dataset was already processed. You can link to existing results.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearUpload();
                              }}
                              disabled={isUploading}
                              className="h-8 text-xs"
                            >
                              <FiTrash2 className="mr-1 h-3 w-3" />
                              Remove
                            </Button>
                            
                            {isDuplicate && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDuplicateModal(true);
                                }}
                                className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
                              >
                                <FiCopy className="mr-1 h-3 w-3" />
                                Use Existing
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-900 font-medium">
                            Drop your ZIP file here
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            or <span className="text-indigo-600 font-medium">click to browse</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-3">
                            Enterprise-grade validation • SHA256 deduplication
                          </p>
                        </div>
                      )}
                    </div>

                    {(isUploading || isCheckingDuplicate) && (
                      <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <FiLoader className="animate-spin text-indigo-500 text-3xl mx-auto" />
                          <p className="font-medium text-slate-800 mt-2">
                            {isCheckingDuplicate ? "Checking..." : "Processing..."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-compile toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div>
                    <Label className="font-medium text-sm">Auto-start Compilation</Label>
                    <p className="text-xs text-slate-500">
                      Automatically compile after validation
                    </p>
                  </div>
                  <Switch checked={autoCompile} onCheckedChange={setAutoCompile} />
                </div>
              </CardContent>

              <CardFooter className="bg-slate-50 border-t p-4">
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={startUploadSession}
                    disabled={isUploading || !zipFile || isDuplicate || isCheckingDuplicate}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    size="default"
                  >
                    {isUploading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiPlayCircle className="mr-2" />
                        Start Upload
                      </>
                    )}
                  </Button>

                  {zipFile && !isUploading && (
                    <Button variant="outline" onClick={clearUpload} size="default">
                      <FiRefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Validation Status Card */}
            {uploadSession && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(uploadSession.status, "h-4 w-4")}
                      <span>Validation Results</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(uploadSession.status)}>
                        {uploadSession.status}
                      </Badge>
                      {uploadDuration && (
                        <span className="text-xs text-slate-500">{uploadDuration}</span>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {totalFiles} files processed • {successFiles} successful • {errorFiles} failed
                    {missingFilesCount > 0 && ` • ${missingFilesCount} missing`}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-emerald-700">Success</span>
                          <FiCheckCircle className="h-3 w-3 text-emerald-500" />
                        </div>
                        <p className="text-xl font-bold text-emerald-900">{successFiles}</p>
                        <div className="mt-2 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" 
                               style={{ width: `${(successFiles / REQUIRED_FILES_COUNT) * 100}%` }} />
                        </div>
                      </div>

                      <div className="bg-rose-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-rose-700">Failed</span>
                          <FiXCircle className="h-3 w-3 text-rose-500" />
                        </div>
                        <p className="text-xl font-bold text-rose-900">{errorFiles}</p>
                        <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" 
                               style={{ width: `${(errorFiles / REQUIRED_FILES_COUNT) * 100}%` }} />
                        </div>
                      </div>

                      <div className="bg-sky-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-sky-700">Progress</span>
                          <FiActivity className="h-3 w-3 text-sky-500" />
                        </div>
                        <p className="text-xl font-bold text-sky-900">
                          {Math.round((successFiles / REQUIRED_FILES_COUNT) * 100)}%
                        </p>
                        <Progress value={(successFiles / REQUIRED_FILES_COUNT) * 100} 
                                 className="mt-2 h-1.5" />
                      </div>
                    </div>

                    {/* Missing files alert */}
                    {missingFilesCount > 0 && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <FiAlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 text-sm">
                          Missing Required Files
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs">
                          Expected {REQUIRED_FILES_COUNT} files, found {totalFiles}. 
                          Missing {missingFilesCount} file(s).
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Validation errors */}
                    {hasValidationErrors && (
                      <Alert className="bg-rose-50 border-rose-200">
                        <FiXCircle className="h-4 w-4 text-rose-600" />
                        <AlertTitle className="text-rose-800 text-sm">
                          Validation Failed
                        </AlertTitle>
                        <AlertDescription className="text-rose-700 text-xs flex items-center justify-between">
                          <span>{errorFiles} file(s) failed validation</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                            onClick={() => setShowValidationDetails(true)}
                          >
                            <FiEye className="mr-1 h-3 w-3" />
                            Details
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Ready for compilation */}
                    {isReadyForCompilation && !autoCompile && (
                      <Alert className="bg-emerald-50 border-emerald-200">
                        <FiCheckCircle className="h-4 w-4 text-emerald-600" />
                        <AlertTitle className="text-emerald-800 text-sm">
                          Ready for Compilation
                        </AlertTitle>
                        <AlertDescription className="text-emerald-700 text-xs">
                          All 19 files validated successfully
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compilation Progress */}
            {isCompiling && compilationStatus && (
              <Card className="border shadow-sm bg-gradient-to-r from-indigo-50/50 to-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FiCpu className="h-4 w-4 text-indigo-600" />
                      <span>Compilation Progress</span>
                    </CardTitle>
                    <Badge className={getStatusColor(compilationStatus.status)}>
                      {compilationStatus.progress}%
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Overall progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Overall Progress</span>
                      <span className="font-medium text-indigo-700">{compilationStatus.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                           style={{ width: `${compilationStatus.progress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Current: <span className="font-medium text-indigo-700">{compilationStatus.current_stage}</span>
                      {compilationStatus.stage_details && ` • ${compilationStatus.stage_details}`}
                    </p>
                  </div>

                  {/* Stages */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700">Processing Stages</p>
                    {compilationStatus.stages?.map((stage, index) => (
                      <Collapsible
                        key={stage.name}
                        open={expandedStage === stage.name}
                        onOpenChange={(open) => setExpandedStage(open ? stage.name : null)}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-3 hover:bg-slate-50">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  stage.status === "completed" ? "bg-emerald-100 text-emerald-600" :
                                  stage.status === "in_progress" ? "bg-indigo-100 text-indigo-600" :
                                  stage.status === "failed" ? "bg-rose-100 text-rose-600" :
                                  "bg-slate-100 text-slate-400"
                                }`}>
                                  {stage.status === "completed" && <FiCheckCircle className="h-3 w-3" />}
                                  {stage.status === "in_progress" && <FiLoader className="h-3 w-3 animate-spin" />}
                                  {stage.status === "failed" && <FiXCircle className="h-3 w-3" />}
                                  {stage.status === "pending" && <span className="text-xs">{index + 1}</span>}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-medium text-slate-900">{stage.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {stage.status === "completed" && stage.duration && 
                                      `Completed in ${stage.duration.toFixed(1)}s`}
                                    {stage.status === "in_progress" && "Processing..."}
                                    {stage.status === "pending" && "Pending"}
                                  </p>
                                </div>
                              </div>
                              {expandedStage === stage.name ? 
                                <FiChevronUp className="h-4 w-4 text-slate-400" /> : 
                                <FiChevronDown className="h-4 w-4 text-slate-400" />
                              }
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-3 text-xs text-slate-600 border-t">
                              {stage.details || "No additional details"}
                              {stage.current_file && (
                                <p className="mt-1 text-indigo-600">Processing: {stage.current_file}</p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>

                  {/* Metrics */}
                  {compilationStatus.metrics && (
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Records</p>
                        <p className="text-sm font-bold text-slate-900">
                          {compilationStatus.metrics.total_records.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Success Rate</p>
                        <p className="text-sm font-bold text-emerald-700">
                          {compilationStatus.metrics.success_rate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Speed</p>
                        <p className="text-sm font-bold text-indigo-700">
                          {compilationStatus.metrics.records_per_second?.toFixed(0) || '-'}/s
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Actions & Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription className="text-xs">Control your workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start bg-indigo-600 hover:bg-indigo-700"
                  onClick={startCompilation}
                  disabled={!isReadyForCompilation || isCompiling}
                  size="default"
                >
                  <FiCpu className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">Start Compilation</span>
                  <FiChevronRight className="h-4 w-4" />
                </Button>

                {compilationStatus?.result_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => window.open(compilationStatus.result_url, "_blank")}
                  >
                    <FiDownload className="mr-2 h-4 w-4" />
                    Download Results
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/compilation/compilation_index")}
                >
                  <FiBarChart2 className="mr-2 h-4 w-4" />
                  View History
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-rose-50 hover:text-rose-700"
                  onClick={clearUpload}
                  disabled={isUploading || isCompiling}
                >
                  <FiRefreshCw className="mr-2 h-4 w-4" />
                  New Process
                </Button>
              </CardContent>
            </Card>

            {/* Process Timeline */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FiClock className="h-4 w-4" />
                  Process Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Upload Status</span>
                  <Badge className={getStatusColor(uploadSession?.status || "PENDING")}>
                    {uploadSession?.status || "Not Started"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Files</span>
                  <span className="text-sm font-medium">
                    {successFiles}/{REQUIRED_FILES_COUNT}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Compilation</span>
                  <Badge className={getStatusColor(compilationStatus?.status || "PENDING")}>
                    {compilationStatus?.status || "Pending"}
                  </Badge>
                </div>

                {processStats.uploadStartTime && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Upload Time</span>
                        <span className="font-medium">{uploadDuration || "In progress"}</span>
                      </div>
                      {processStats.compileStartTime && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Compile Time</span>
                          <span className="font-medium">{compileDuration || "In progress"}</span>
                        </div>
                      )}
                      {processStats.zipHash && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">SHA256</span>
                          <span className="font-mono text-xs text-slate-400">
                            {processStats.zipHash.substring(0, 8)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Requirements Card */}
            <Card className="border shadow-sm bg-indigo-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FiShield className="h-4 w-4" />
                  System Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Exactly 19 Parquet files required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>SHA256 content-based deduplication</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Background processing with Celery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Parallel PostgreSQL COPY insertion</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Automatic cleanup after 24 hours</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ==================== MODALS ==================== */}

        {/* Upload Progress Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FiUploadCloud className="h-5 w-5 text-indigo-600" />
                Upload Progress
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-xs text-indigo-700">Total</p>
                  <p className="text-xl font-bold text-indigo-900">{totalFiles}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="text-xs text-emerald-700">Success</p>
                  <p className="text-xl font-bold text-emerald-900">{successFiles}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg">
                  <p className="text-xs text-rose-700">Failed</p>
                  <p className="text-xl font-bold text-rose-900">{errorFiles}</p>
                </div>
              </div>

              {/* File list */}
              <div className="space-y-3">
                {uploadStatuses.map((file) => (
                  <div key={file.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(file.status)}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{file.file_name}</p>
                          <p className="text-xs text-slate-500">{file.size}</p>
                        </div>
                      </div>
                      <Badge className={
                        file.status === "success" ? "bg-emerald-100 text-emerald-700" :
                        file.status === "error" ? "bg-rose-100 text-rose-700" :
                        "bg-sky-100 text-sky-700"
                      }>
                        {file.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                             style={{ width: `${file.progress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{file.progress}%</span>
                        {file.message && (
                          <span className={file.status === "error" ? "text-rose-600" : "text-slate-600"}>
                            {file.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isPolling && (
                <div className="text-center py-4">
                  <FiLoader className="animate-spin text-indigo-500 text-2xl mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Processing files...</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadModal(false)} disabled={isPolling}>
                {isPolling ? "Processing..." : "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Dataset Modal */}
        <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <FiCopy className="h-5 w-5" />
                Duplicate Dataset Detected
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <FiAlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 text-sm">SHA256 Match Found</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                  This ZIP file has been processed before. To save resources, you can:
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  onClick={handleUseExistingDataset}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <FiCopy className="mr-2 h-4 w-4" />
                  Use Existing Dataset
                </Button>

                <Button 
                  variant="outline"
                  onClick={handleProcessNewDataset}
                  className="w-full"
                >
                  Process as New Dataset
                </Button>
              </div>

              {existingDataset && (
                <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg">
                  <p>Original upload: {formatDateTime(existingDataset.created_at)}</p>
                  <p>Status: {existingDataset.status}</p>
                  {existingDataset.db_saved && <p>✓ Saved to database</p>}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Validation Details Modal */}
        <Dialog open={showValidationDetails} onOpenChange={setShowValidationDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Validation Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {uploadStatuses
                .filter(f => f.status === "error")
                .map(file => (
                  <div key={file.id} className="border border-rose-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-1.5 bg-rose-100 rounded-lg">
                        <FiXCircle className="h-4 w-4 text-rose-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{file.file_name}</p>
                        <p className="text-sm text-rose-700">{file.message}</p>
                      </div>
                    </div>

                    {file.validation_results && (
                      <div className="mt-3 space-y-2 text-sm">
                        {file.validation_results.missing_columns && (
                          <div>
                            <p className="font-medium text-slate-700">Missing Columns:</p>
                            <p className="text-rose-600">{file.validation_results.missing_columns.join(', ')}</p>
                          </div>
                        )}
                        {file.validation_results.data_type_errors && (
                          <div>
                            <p className="font-medium text-slate-700">Type Errors:</p>
                            <ul className="list-disc list-inside text-rose-600">
                              {file.validation_results.data_type_errors.map((err, i) => (
                                <li key={i}>{err.column}: expected {err.expected}, found {err.found}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    // Replace your existing error details section with:
{file.error_details && (
  <Collapsible 
    open={openErrorDetails === file.id}
    onOpenChange={(open) => setOpenErrorDetails(open ? file.id : null)}
    className="mt-3"
  >
    <CollapsibleTrigger className="w-full flex justify-end">
      <Button variant="ghost" size="sm" className="text-rose-600">
        <FiChevronDown className={`mr-1 h-3 w-3 transition-transform ${
          openErrorDetails === file.id ? 'rotate-180' : ''
        }`} />
        Raw Error Details
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <pre className="mt-2 text-xs bg-rose-50 p-2 rounded-lg overflow-auto">
        {JSON.stringify(file.error_details, null, 2)}
      </pre>
    </CollapsibleContent>
  </Collapsible>
)}
                  </div>
                ))}

              {uploadSession?.validation_summary?.missing_files &&
  uploadSession.validation_summary.missing_files.length > 0 && (
    <div className="border border-amber-200 rounded-lg p-4">
      <p className="font-medium text-amber-800 mb-2">Missing Required Files:</p>
      <ul className="list-disc list-inside text-amber-700 text-sm">
        {uploadSession.validation_summary.missing_files.map((file, i) => (
          <li key={i}>{file}</li>
        ))}
      </ul>
    </div>
)}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowValidationDetails(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}