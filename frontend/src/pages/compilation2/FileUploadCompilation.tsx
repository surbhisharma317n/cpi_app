"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiLoader,
  FiAlertCircle,
  FiDatabase,
  FiPackage,
  FiTrash2,
  FiRefreshCw,
  FiPlayCircle,
  FiClock,
  FiBarChart2,
  FiSettings,
  FiServer,
  FiFile,
  FiCalendar,
  FiType,
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
// import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  // CardFooter,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui2/tooltip";
import { Input } from "../../components/ui2/input";
import { capiService } from "../../api/endpoints/capi_data/index";


import JSZip from "jszip";

// Constants
// const API_BASE = "http://localhost:8000/api";
const API_BASE = "https://cpi-2024.mospi.gov.in/api";
const MAX_FILE_SIZE = 100 * 1024 * 1024 * 20; // 2GB
const POLLING_INTERVAL = 1000; // 1 second (faster polling)
// const UPLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB chunks for upload

// Types
interface UploadStatus {
  file_id: string;
  file_name: string;
  status:
    | "pending"
    | "uploading"
    | "validating"
    | "success"
    | "error"
    | "PENDING"
    | "UPLOADING"
    | "VALIDATING"
    | "SUCCESS"
    | "ERROR"
    | "VALIDATED"
    | "FAILED"
    | "FAILURE"
    | "COMPLETED"
    | "PROGRESS";
  progress: number;
  size: string;
  message?: string;
  timestamp: string;
  error_details?: any;
  row_count?: number;
  columns?: string[];
}

interface CompilationMethod {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  description: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
}

interface CompilationStatus {
  task_id: string;
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  progress: number;
  current_method: string;
  method_details?: string;
  result_url?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  methods: CompilationMethod[];
  metrics?: {
    total_records: number;
    processed_records: number;
    success_rate: number;
    processing_time: number;
    file_path?: string;
    file_size?: string;
  };
  compiled_file_info?: {
    filename: string;
    size: string;
    modified: string;
    path?: string;
  };
  compiled_record_count?: number;
  compiled_columns?: string[];
  // Make these optional
  month?: number | string;
  year?: number;
  session_id?: string;
}

interface UploadSession {
  session_id: string;
  status:
    | "PENDING"
    | "UPLOADING"
    | "VALIDATING"
    | "VALIDATED"
    | "PARTIALLY_VALIDATED"
    | "FAILED"
    | "COMPLETED";
  total_files: number;
  processed_files: number;
  failed_files: number;
  progress?: string | number; // Can be string from backend or number
  current_step?: string;
  step_details?: string;
  error_message?: string;
  validation_summary: any;
  file_statuses: UploadStatus[];
  created_at: string;
  updated_at: string;
  validated_files?: Array<{ name: string; size: string }>;
}

// Add this helper function near the top of your frontend file
const isSuccessfulStatus = (status: string): boolean => {
  const successStatuses = [
    "SUCCESS",
    "COMPLETED",
    "VALIDATED",
    "success",
    "completed",
  ];
  return successStatuses.includes(status);
};

const isFailedStatus = (status: string): boolean => {
  const failedStatuses = ["FAILED", "FAILURE", "ERROR", "failed", "error"];
  return failedStatuses.includes(status);
};

const isCompleteStatus = (status: string): boolean => {
  return isSuccessfulStatus(status) || isFailedStatus(status);
};


// const isInProgressStatus = (status: string): boolean => {
//   const progressStatuses = [
//     "PROGRESS",
//     "IN_PROGRESS",
//     "UPLOADING",
//     "VALIDATING",
//     "progress",
//   ];
//   return progressStatuses.includes(status);
// };

interface TableStats {
  inserted: number;
  records: number;
  files: number;
  total_in_table?: number;
  error?: string;
}

interface DataTypeProgress {
  total: number;
  completed: number;
  current: string;
  imported: string[];
  failed: string[];
  stats?: Record<string, TableStats>;
}

interface ImportSummary {
  validated: DataTypeProgress;
  output: DataTypeProgress;
  month: string | number;
  year: number;
  end_time?: string;
  start_time?: string;
  message?: string;
  last_update?: string;
}

interface DatabaseImportStatus {
  // Core fields
  task_id: string;
  compilation_task_id?: string;
  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "FAILED"
    | "PARTIALLY_COMPLETED";
  progress: number;
  import_mode: "append" | "replace" | "merge";

  // Table tracking
  imported_tables: string[];
  failed_tables: string[];

  // Record counts
  total_records: number;
  imported_records: number;

  // Error handling
  error_message?: string;

  // Timestamps
  started_at: string;
  completed_at?: string;
  updated_at?: string;

  // User tracking
  created_by?: number;

  // Separate progress for validated and output data
  validated: DataTypeProgress;
  output: DataTypeProgress;

  // UI helper fields (computed from summary)
  current_table?: string;
  completed_tables?: number;
  total_tables?: number;
  progress_message?: string;
  eta_seconds?: number;

  // Raw summary data from backend
  summary?: ImportSummary;

  // Table prefix/schema info
  table_prefix?: string;

  // Optional: Add these for better UX
  isComplete?: boolean;
  isInProgress?: boolean;
  isFailed?: boolean;
  isPartial?: boolean;
}
interface ProcessStats {
  uploadStartTime: number | null;
  uploadEndTime: number | null;
  compileStartTime: number | null;
  compileEndTime: number | null;
  dbStartTime: number | null;
  dbEndTime: number | null;
}

interface ZipFileInfo {
  name: string;
  size: string;
  size_bytes: number;
  row_count?: number;
  columns?: string[];
  status: "pending" | "extracting" | "ready" | "error";
}

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    VALIDATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    FAILED: "bg-rose-50 text-rose-700 border-rose-200",
    FAILURE: "bg-rose-50 text-rose-700 border-rose-200",
    UPLOADING: "bg-sky-50 text-sky-700 border-sky-200",
    VALIDATING: "bg-sky-50 text-sky-700 border-sky-200",
    PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
    IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PARTIALLY_VALIDATED: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
};

const getStatusIcon = (status: string, className?: string) => {
  const baseClass = className || "h-4 w-4";
  const icons: Record<string, React.ReactNode> = {
    VALIDATED: <FiCheckCircle className={`${baseClass} text-emerald-500`} />,
    SUCCESS: <FiCheckCircle className={`${baseClass} text-emerald-500`} />,
    COMPLETED: <FiCheckCircle className={`${baseClass} text-emerald-500`} />,
    FAILED: <FiXCircle className={`${baseClass} text-rose-500`} />,
    FAILURE: <FiXCircle className={`${baseClass} text-rose-500`} />,
    UPLOADING: (
      <FiLoader className={`${baseClass} text-sky-500 animate-spin`} />
    ),
    VALIDATING: (
      <FiLoader className={`${baseClass} text-sky-500 animate-spin`} />
    ),
    PROGRESS: <FiLoader className={`${baseClass} text-sky-500 animate-spin`} />,
    IN_PROGRESS: (
      <FiLoader className={`${baseClass} text-sky-500 animate-spin`} />
    ),
  };
  return icons[status] || <FiClock className={`${baseClass} text-gray-400`} />;
};

// Helper function to safely map backend response to DatabaseImportStatus
// const mapToDatabaseImportStatus = (data: any): DatabaseImportStatus => {
//   return {
//     task_id: data?.task_id || '',
//     compilation_task_id: data?.compilation_task_id,
//     status: data?.status || 'IN_PROGRESS',
//     progress: data?.progress || 0,
//     import_mode: data?.import_mode || 'append',
//     imported_tables: data?.imported_tables || [],
//     failed_tables: data?.failed_tables || [],
//     total_records: data?.total_records || 0,
//     imported_records: data?.imported_records || 0,
//     error_message: data?.error_message,
//     started_at: data?.started_at || new Date().toISOString(),
//     completed_at: data?.completed_at,
//     updated_at: data?.updated_at,
//     created_by: data?.created_by,
//     table_prefix: data?.table_prefix,

//     validated: {
//       total: data?.validated?.total || 0,
//       completed: data?.validated?.completed || 0,
//       current: data?.validated?.current || '',
//       imported: data?.validated?.imported || [],
//       failed: data?.validated?.failed || [],
//       stats: data?.validated?.stats
//     },

//     output: {
//       total: data?.output?.total || 0,
//       completed: data?.output?.completed || 0,
//       current: data?.output?.current || '',
//       imported: data?.output?.imported || [],
//       failed: data?.output?.failed || [],
//       stats: data?.output?.stats
//     },

//     current_table: data?.current_table || data?.validated?.current || data?.output?.current,
//     completed_tables: data?.completed_tables ||
//       (data?.validated?.completed || 0) + (data?.output?.completed || 0),
//     total_tables: data?.total_tables ||
//       (data?.validated?.total || 0) + (data?.output?.total || 0),
//     progress_message: data?.progress_message || data?.summary?.message,
//     eta_seconds: data?.eta_seconds,

//     summary: data?.summary
//   };
// };

// Helper function to safely get progress value
const getProgressValue = (progress: string | number | undefined): number => {
  if (progress === undefined || progress === null) return 0;
  if (typeof progress === "number") return progress;
  const parsed = parseInt(progress);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to convert month name to number
// const getMonthNumber = (monthName: string): number => {
//   const months: Record<string, number> = {
//     JAN: 1,
//     FEB: 2,
//     MAR: 3,
//     APR: 4,
//     MAY: 5,
//     JUN: 6,
//     JUL: 7,
//     AUG: 8,
//     SEP: 9,
//     OCT: 10,
//     NOV: 11,
//     DEC: 12,
//   };
//   return months[monthName] || 0;
// };

// Helper function to get month name from number
const getMonthName = (monthNumber: number): string => {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return months[monthNumber - 1] || "JAN";
};

// Helper functions to check status
export const isImportComplete = (
  status: DatabaseImportStatus["status"]
): boolean => {
  return status === "COMPLETED";
};

export const isImportInProgress = (
  status: DatabaseImportStatus["status"]
): boolean => {
  return status === "IN_PROGRESS";
};

export const isImportFailed = (
  status: DatabaseImportStatus["status"]
): boolean => {
  return status === "FAILED";
};

export const isImportPartial = (
  status: DatabaseImportStatus["status"]
): boolean => {
  return status === "PARTIALLY_COMPLETED";
};

// Helper to get total tables
export const getTotalTables = (status: DatabaseImportStatus): number => {
  return (status.validated?.total || 0) + (status.output?.total || 0);
};

// Helper to get completed tables
export const getCompletedTables = (status: DatabaseImportStatus): number => {
  return (status.validated?.completed || 0) + (status.output?.completed || 0);
};

// Helper to get current table being processed
export const getCurrentTable = (status: DatabaseImportStatus): string => {
  return status.validated?.current || status.output?.current || "";
};

// Helper to get all imported tables
export const getAllImportedTables = (
  status: DatabaseImportStatus
): string[] => {
  return [
    ...(status.validated?.imported || []),
    ...(status.output?.imported || []),
  ];
};

// Helper to get all failed tables
export const getAllFailedTables = (status: DatabaseImportStatus): string[] => {
  return [
    ...(status.validated?.failed || []),
    ...(status.output?.failed || []),
  ];
};

const defaultDatabaseImportStatus: DatabaseImportStatus = {
  task_id: "",
  status: "PENDING",
  progress: 0,
  import_mode: "append",
  imported_tables: [],
  failed_tables: [],
  total_records: 0,
  imported_records: 0,
  started_at: "",
  validated: {
    total: 0,
    completed: 0,
    current: "",
    imported: [],
    failed: [],
  },
  output: {
    total: 0,
    completed: 0,
    current: "",
    imported: [],
    failed: [],
  },
};

export default function FileUploadCompilation() {
  const { toast } = useToast();
  // const navigate = useNavigate();

  // State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [compilationStatus, setCompilationStatus] =
    useState<CompilationStatus | null>(null);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(
    null
  );
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseImportStatus>(
    defaultDatabaseImportStatus
  );
  const [processStats, setProcessStats] = useState<ProcessStats>({
    uploadStartTime: null,
    uploadEndTime: null,
    compileStartTime: null,
    compileEndTime: null,
    dbStartTime: null,
    dbEndTime: null,
  });

  const [zipContents, setZipContents] = useState<ZipFileInfo[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  // const [showFileDetails, setShowFileDetails] = useState<UploadStatus | null>(
  //   null
  // );
  const [showDbImportModal, setShowDbImportModal] = useState(false);
  const [_showCompiledFileInfo, setShowCompiledFileInfo] = useState(false);

  // Process states
  const [isUploading, setIsUploading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isImportingToDb, setIsImportingToDb] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const [autoDbImport, setAutoDbImport] = useState(false);
  // const [expandedStage, setExpandedStage] = useState<string | null>(null);
  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>("");
  const [uploadedBytes, setUploadedBytes] = useState(0);
  //nihi
  //const [loadingFilters, setLoadingFilters] = useState(false);
const [, setLoadingFilters] = useState(false);
// const [setLoadingFilters] = useState(false);
const [compilationFilterOptions, setCompilationFilterOptions] = useState<any[]>([]);
//nihi


  // Compilation parameters
  // Get current month as number (1-12)
  //const now = new Date();
  //const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  // const [compilationParams, setCompilationParams] = useState({
  //   month: currentMonth, // Store as number (1-12)
  //   year: now.getFullYear(),
  //   compile_type: "PROVISIONAL" as "PROVISIONAL" | "FINAL",
  // });

  const [compilationParams, setCompilationParams] = useState({
  month: "",
  year: "",
  compile_type: "",
});
  // Database import parameters
  const [dbImportParams, setDbImportParams] = useState({
    table_name: "",
    create_backup: true,
    import_mode: "append" as "append" | "replace" | "merge",
  });

  // Refs
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadTaskIdRef = useRef<string | null>(null);
  const compileTaskIdRef = useRef<string | null>(null);
  const dbTaskIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number | null>(null);

  //FILTER DROPDWON DATA//
const fetchFilterOptions = async () => {
  try {
    setLoadingFilters(true);

    const response: any = await capiService.getCompilationFilters();

    console.log("API response:", response);

    setCompilationFilterOptions(response?.options || []);
  } catch (error) {
    console.error("Error fetching filters:", error);
  } finally {
    setLoadingFilters(false);
  }
};
useEffect(() => {
  fetchFilterOptions();
}, []);

// Check if compilation parameters are selected
// const isParameterSelected =
//   !!compilationParams.compile_type &&
//   !!compilationParams.year &&
//   !!compilationParams.month;

const isParameterSelected =
  compilationParams.compile_type !== "" &&
  compilationParams.year !== "" &&
  compilationParams.month !== "";

//////nihi////
  // Computed values
  const filteredFiles = useMemo(
    () =>
      zipContents.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [zipContents, searchTerm]
  );

/////////


  //////
  // const totalRows = useMemo(
  //   () => zipContents.reduce((sum, file) => sum + (file.row_count || 0), 0),
  //   [zipContents]
  // );

  // const totalSize = useMemo(
  //   () => zipContents.reduce((sum, file) => sum + file.size_bytes, 0),
  //   [zipContents]
  // );

  const selectedCount = selectedFiles.size;

  const uploadDuration = useMemo(
    () =>
      processStats.uploadStartTime && processStats.uploadEndTime
        ? formatTime(processStats.uploadEndTime - processStats.uploadStartTime)
        : null,
    [processStats.uploadStartTime, processStats.uploadEndTime]
  );

  const compileDuration = useMemo(
    () =>
      processStats.compileStartTime && processStats.compileEndTime
        ? formatTime(
            processStats.compileEndTime - processStats.compileStartTime
          )
        : null,
    [processStats.compileStartTime, processStats.compileEndTime]
  );

  const dbDuration = useMemo(
    () =>
      processStats.dbStartTime && processStats.dbEndTime
        ? formatTime(processStats.dbEndTime - processStats.dbStartTime)
        : null,
    [processStats.dbStartTime, processStats.dbEndTime]
  );


//  const [filterOptions, setFilterOptions] = useState<any[]>([]);
const [, setFilterOptions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/compilation/filters/`)
      .then((res) => res.json())
      .then((data) => {
        setFilterOptions(data.options || []);
      })
      .catch((err) => console.error(err));
  }, []);

  // Update table name when compilation params change
  useEffect(() => {
    if (compilationParams.month && compilationParams.year) {
      setDbImportParams((prev) => ({
        ...prev,
        table_name: `compiled_data_${compilationParams.month}_${compilationParams.year}`,
      }));
    }
  }, [compilationParams.month, compilationParams.year]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // const handleMonthChange = (value: string) => {
  //   const monthNumber = parseInt(value);
  //   setCompilationParams((prev) => ({
  //     ...prev,
  //     month: monthNumber,
  //     month_name: getMonthName(monthNumber),
  //   }));
  // };

  // OPTIMIZED: Fast ZIP extraction without metadata parsing
  // OPTIMIZED: Fast ZIP extraction with metadata parsing
  const extractZipContentsFast = async (file: File): Promise<ZipFileInfo[]> => {
    setIsExtracting(true);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file, {
        createFolders: true,
      });

      const files: ZipFileInfo[] = [];

      // Process files in parallel for speed
      const filePromises = Object.entries(contents.files)
        .filter(
          ([fileName, zipFile]) => !zipFile.dir && fileName.endsWith(".parquet")
        )
        .map(async ([fileName, zipFile]) => {
          const fileData = await zipFile.async("arraybuffer");

          // Try to extract metadata from parquet file
          let rowCount = 0;
          let columns: string[] = [];

          try {
            // Import hyparquet dynamically to avoid loading if not needed
            const { parquetMetadataAsync, parquetSchema } = await import(
              "hyparquet"
            );

            const metadata = await parquetMetadataAsync({
              slice: async (start: number, end?: number) => {
                return fileData.slice(start, end);
              },
              byteLength: fileData.byteLength,
            });

            rowCount = Number(metadata.num_rows) || 0;

            const schema = parquetSchema(metadata);
            if (schema?.children) {
              columns = schema.children.map((child: any) => child.element.name);
            }
          } catch (e) {
            console.log("Could not read parquet metadata for:", fileName, e);
            // If metadata extraction fails, at least try to get basic info
            try {
              // Alternative: try to read the first few bytes to determine schema
              // const view = new DataView(fileData);
              // You could add more sophisticated parsing here if needed
            } catch (e2) {
              console.log("Alternative parsing also failed:", e2);
            }
          }

          return {
            name: fileName,
            size: formatFileSize(fileData.byteLength),
            size_bytes: fileData.byteLength,
            row_count: rowCount,
            columns: columns,
            status: "ready" as const,
          };
        });

      // Wait for all files to be processed
      const processedFiles = await Promise.all(filePromises);
      files.push(...processedFiles);

      // Select all files by default
      setSelectedFiles(new Set(files.map((f) => f.name)));

      toast({
        title: "ZIP Loaded",
        description: `Found ${files.length} parquet files`,
      });

      return files;
    } catch (error) {
      console.error("Error reading ZIP:", error);
      toast({
        title: "Error",
        description: "Failed to read ZIP file",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsExtracting(false);
    }
  };

  const processZipFile = async (file: File) => {
    if (!file.name.match(/\.(zip|parquet\.zip)$/i)) {
      toast({
        title: "Invalid File",
        description: "Please upload a ZIP file containing parquet files",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: "destructive",
      });
      return;
    }

    setZipFile(file);
    setIsExtracting(true);

    try {
      toast({
        title: "Extracting ZIP",
        description: "Analyzing ZIP contents...",
      });

      // Use the version with metadata extraction
      const contents = await extractZipContentsFast(file);
      setZipContents(contents);

      const totalRows = contents.reduce(
        (sum, f) => sum + (f.row_count || 0),
        0
      );
      const totalCols = contents.reduce(
        (sum, f) => sum + (f.columns?.length || 0),
        0
      );

      toast({
        title: "ZIP Analyzed",
        description: `Found ${contents.length} files, ${totalRows.toLocaleString()} total rows, ${totalCols} total columns`,
      });
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: "Failed to analyze ZIP contents",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleZipUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await processZipFile(file);
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.remove("border-sky-400", "bg-sky-50");

      if (isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) await processZipFile(file);
    },
    [isUploading]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-sky-400", "bg-sky-50");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-sky-400", "bg-sky-50");
  }, []);

  const toggleFileSelection = useCallback((fileName: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  }, []);

  const toggleAllFiles = useCallback(() => {
    setSelectedFiles((prev) =>
      prev.size === filteredFiles.length
        ? new Set()
        : new Set(filteredFiles.map((f) => f.name))
    );
  }, [filteredFiles]);

  const clearUpload = useCallback(() => {
    setZipFile(null);
    setZipContents([]);
    setSelectedFiles(new Set());
    setSearchTerm("");
    setUploadStatuses([]);
    setUploadSession(null);
    setCompilationStatus(null);
    setDatabaseStatus(defaultDatabaseImportStatus);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadSpeed("");

    setProcessStats({
      uploadStartTime: null,
      uploadEndTime: null,
      compileStartTime: null,
      compileEndTime: null,
      dbStartTime: null,
      dbEndTime: null,
    });

    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    toast({
      title: "Cleared",
      description: "Ready for new upload",
    });
  }, [toast]);

  // const token = localStorage.getItem("authToken") || "";

  // OPTIMIZED: Upload with progress tracking
  // OPTIMIZED: Upload with progress tracking
  const startUploadSession = async () => {
    if (!zipFile || selectedCount === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    uploadStartTimeRef.current = Date.now();
    setProcessStats((prev) => ({ ...prev, uploadStartTime: Date.now() }));
    setShowUploadModal(true);

    // Start speed calculation interval
    const speedInterval = setInterval(() => {
      if (uploadStartTimeRef.current && uploadedBytes > 0) {
        const elapsedSeconds = (Date.now() - uploadStartTimeRef.current) / 1000;
        const speedBps = uploadedBytes / elapsedSeconds;
        const speedMbps = (speedBps * 8) / (1024 * 1024);
        setUploadSpeed(`${speedMbps.toFixed(1)} Mbps`);
      }
    }, 1000);

    try {
      const formData = new FormData();
      formData.append("file", zipFile);
      formData.append(
        "selected_files",
        JSON.stringify(
          zipContents
            .filter((f) => selectedFiles.has(f.name))
            .map((f) => f.name)
        )
      );

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          setUploadProgress(percentComplete);
          setUploadedBytes(event.loaded);
        }
      });

      const response = await new Promise<any>((resolve, reject) => {
        xhr.open("POST", `${API_BASE}/cpi/upload/start`);

        // ❌ Removed Authorization header here

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error("Invalid response"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      clearInterval(speedInterval);
      uploadTaskIdRef.current = response.session_id;

      setUploadSession(response);

      if (response.status === "FAILED") {
        setProcessStats((prev) => ({ ...prev, uploadEndTime: Date.now() }));
        setIsUploading(false);

        toast({
          title: "Upload Failed",
          description: response.error_message || "Failed to process upload",
          variant: "destructive",
        });
        return;
      }

      const currentSessionId = response.session_id;

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${API_BASE}/cpi/upload/status/${currentSessionId}`
            // ❌ No Authorization header here either
          );

          if (!statusResponse.ok) {
            console.error("Status check failed:", statusResponse.status);
            return;
          }

          const statusData = await statusResponse.json();

          setUploadSession(statusData);

          if (statusData.file_statuses) {
            const relevantFiles = statusData.file_statuses.filter(
              (f: UploadStatus) =>
                selectedFiles.has(f.file_name) ||
                ["UPLOADING", "VALIDATING", "PROGRESS", "PENDING"].includes(
                  f.status
                )
            );
            setUploadStatuses(relevantFiles);
          }

          if (
            [
              "VALIDATED",
              "PARTIALLY_VALIDATED",
              "FAILED",
              "COMPLETED",
            ].includes(statusData.status)
          ) {
            clearInterval(pollInterval);
            setProcessStats((prev) => ({ ...prev, uploadEndTime: Date.now() }));
            setIsUploading(false);

            if (statusData.status !== "FAILED") {
              setShowUploadModal(false);
            }

            if (
              ["VALIDATED", "PARTIALLY_VALIDATED", "COMPLETED"].includes(
                statusData.status
              )
            ) {
              toast({
                title: "Upload Complete",
                description: `${statusData.processed_files || 0} files validated (${statusData.failed_files || 0} failed)`,
              });

              if (autoCompile) {
                setTimeout(() => startCompilation(statusData), 1000);
              }
            } else if (statusData.status === "FAILED") {
              toast({
                title: "Upload Failed",
                description: statusData.error_message || "Validation failed",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("Poll error:", error);
        }
      }, POLLING_INTERVAL);

      pollingInterval.current = pollInterval;
    } catch (error) {
      clearInterval(speedInterval);
      console.error("Upload error:", error);
      setIsUploading(false);
      setProcessStats((prev) => ({ ...prev, uploadEndTime: Date.now() }));

      toast({
        title: "Upload Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start upload session",
        variant: "destructive",
      });
    }
  };

  const startCompilation = async (session: any) => {
    const sessionId = session?.session_id || session;

    if (!sessionId) {
      toast({
        title: "Cannot Compile",
        description: "No session ID provided",
        variant: "destructive",
      });
      return;
    }

    if (
      !["VALIDATED", "PARTIALLY_VALIDATED", "COMPLETED"].includes(
        session?.status || "UNKNOWN"
      )
    ) {
      if (typeof session === "string") {
        try {
          const sessionResponse = await fetch(
            `${API_BASE}/cpi/upload/status/${sessionId}`
          );

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (
              !["VALIDATED", "PARTIALLY_VALIDATED", "COMPLETED"].includes(
                sessionData.status
              )
            ) {
              toast({
                title: "Cannot Compile",
                description: "Please wait for files to be validated first",
                variant: "destructive",
              });
              return;
            }
          } else {
            toast({
              title: "Cannot Compile",
              description: "Please validate files first",
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.error("Error checking session status:", error);
          toast({
            title: "Cannot Compile",
            description: "Unable to verify session status",
            variant: "destructive",
          });
          return;
        }
      } else {
        toast({
          title: "Cannot Compile",
          description: "Please validate files first",
          variant: "destructive",
        });
        return;
      }
    }

    setIsCompiling(true);
    setProcessStats((prev) => ({ ...prev, compileStartTime: Date.now() }));

    try {
      const response = await fetch(`${API_BASE}/cpi/compile/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // ❌ Authorization removed
        },
        body: JSON.stringify({
          session_id: sessionId,
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Compilation failed with status ${response.status}`
        );
      }

      const data = await response.json();
      compileTaskIdRef.current = data.task_id;

      setCompilationStatus({
        task_id: data.task_id,
        status: "PROGRESS",
        progress: 0,
        current_method: "Initializing",
        method_details: "Starting compilation...",
        started_at: new Date().toISOString(),
        methods: [
          {
            name: "house_rent_script",
            status: "pending",
            description: "Compiling house rent index...",
          },
          {
            name: "electricity_index_script",
            status: "pending",
            description: "Compiling electricity index...",
          },
          {
            name: "pds_item_index_script",
            status: "pending",
            description: "Compiling PDS item index...",
          },
          {
            name: "fuel_price_index_script",
            status: "pending",
            description: "Compiling fuel price index...",
          },
          {
            name: "telecom_price_index_script",
            status: "pending",
            description: "Compiling telecom price index...",
          },
          {
            name: "postal_ott_index_script",
            status: "pending",
            description: "Compiling postal and OTT index...",
          },
          {
            name: "railfare_index_script",
            status: "pending",
            description: "Compiling railfare and metro fare index...",
          },
          {
            name: "market_item_index_script",
            status: "pending",
            description: "Compiling market price index...",
          },
          {
            name: "all_index_script",
            status: "pending",
            description: "Compiling all India index...",
          },
        ],
        compiled_file_info: undefined,
        compiled_record_count: 0,
        month: compilationParams.month,
        // year: compilationParams.year,
        year: Number(compilationParams.year),
        session_id: sessionId,
      });

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${API_BASE}/cpi/compile/status/${data.task_id}`
          );

          if (!statusResponse.ok) {
            console.error("Status check failed:", statusResponse.status);
            return;
          }

          const statusData = await statusResponse.json();
          setCompilationStatus(statusData);

          if (statusData.started_at) {
            setProcessStats((prev) => ({
              ...prev,
              compileStartTime: new Date(statusData.started_at).getTime(),
            }));
          }

          if (statusData.completed_at) {
            setProcessStats((prev) => ({
              ...prev,
              compileEndTime: new Date(statusData.completed_at).getTime(),
            }));
          }

          if (isCompleteStatus(statusData.status)) {
            clearInterval(pollInterval);
            setIsCompiling(false);

            if (isSuccessfulStatus(statusData.status)) {
              const completedMethods =
                statusData.methods?.filter((m: any) => m.status === "completed")
                  .length || 0;
              const totalMethods = statusData.methods?.length || 0;

              toast({
                title: "✅ Compilation Complete",
                description: `Successfully executed ${completedMethods}/${totalMethods} methods`,
              });

              if (statusData.compiled_file_info || statusData.result_url) {
                setShowCompiledFileInfo(true);
              }

              if (autoDbImport) {
                setTimeout(() => startDatabaseImport(), 1000);
              }
            } else if (isFailedStatus(statusData.status)) {
              toast({
                title: "❌ Compilation Failed",
                description: statusData.error_message || "Compilation failed",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("Poll error:", error);
        }
      }, POLLING_INTERVAL);

      pollingInterval.current = pollInterval;
    } catch (error) {
      console.error("Compilation error:", error);
      setIsCompiling(false);
      setProcessStats((prev) => ({ ...prev, compileEndTime: Date.now() }));

      toast({
        title: "❌ Compilation Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start compilation",
        variant: "destructive",
      });
    }
  };

  // // Helper functions for status checking
  // const isCompleteStatus = (status: string): boolean => {
  //   return ["SUCCESS", "FAILURE", "COMPLETED", "FAILED"].includes(status);
  // };

  // const isSuccessfulStatus = (status: string): boolean => {
  //   return ["SUCCESS", "COMPLETED"].includes(status);
  // };

  // const isFailedStatus = (status: string): boolean => {
  //   return ["FAILURE", "FAILED"].includes(status);
  // };

  const startDatabaseImport = async () => {
    if (
      !compilationStatus ||
      !["SUCCESS", "COMPLETED"].includes(compilationStatus.status)
    ) {
      toast({
        title: "Cannot Import",
        description:
          "Compilation must be successful before database import. Current status: " +
          compilationStatus?.status,
        variant: "destructive",
      });
      return;
    }

    setIsImportingToDb(true);
    setProcessStats((prev) => ({ ...prev, dbStartTime: Date.now() }));
    setShowDbImportModal(true);

    const defaultStatus: DatabaseImportStatus = {
      task_id: "",
      status: "IN_PROGRESS",
      progress: 0,
      import_mode: "append",
      imported_tables: [],
      failed_tables: [],
      total_records: 0,
      imported_records: 0,
      started_at: new Date().toISOString(),
      validated: {
        total: 0,
        completed: 0,
        current: "",
        imported: [],
        failed: [],
      },
      output: {
        total: 0,
        completed: 0,
        current: "",
        imported: [],
        failed: [],
      },
    };

    setDatabaseStatus(defaultStatus);

    try {
      const month = compilationParams.month || compilationStatus.month;
      const year = compilationParams.year || compilationStatus.year;
      const sessionId =
        uploadSession?.session_id || compilationStatus.session_id;

      const response = await fetch(
        `${API_BASE}/cpi/compilation/import/${compilationStatus.task_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // ❌ Authorization removed
          },
          body: JSON.stringify({
            table_name: dbImportParams.table_name,
            import_mode: dbImportParams.import_mode,
            create_backup: dbImportParams.create_backup,
            month: month,
            year: year,
            session_id: sessionId,
            compile_type: compilationParams.compile_type,  //added by nihi
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Database import failed with status ${response.status}`
        );
      }

      const data = await response.json();
      dbTaskIdRef.current = data.import_task_id;

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${API_BASE}/cpi/database/import/status/${data.import_task_id}`
          );

          if (!statusResponse.ok) {
            console.error("Status check failed:", statusResponse.status);
            return;
          }

          const statusData = await statusResponse.json();

          const mappedStatus: DatabaseImportStatus = {
            task_id: statusData.task_id || "",
            compilation_task_id: statusData.compilation_task_id,
            status: statusData.status || "IN_PROGRESS",
            progress: statusData.progress || 0,
            import_mode: statusData.import_mode || "append",
            imported_tables: statusData.imported_tables || [],
            failed_tables: statusData.failed_tables || [],
            total_records: statusData.total_records || 0,
            imported_records: statusData.imported_records || 0,
            error_message: statusData.error_message,
            started_at: statusData.started_at || new Date().toISOString(),
            completed_at: statusData.completed_at,
            updated_at: statusData.updated_at,
            created_by: statusData.created_by,
            table_prefix: statusData.table_prefix,

            validated: {
              total: statusData.validated?.total || 0,
              completed: statusData.validated?.completed || 0,
              current: statusData.validated?.current || "",
              imported: statusData.validated?.imported || [],
              failed: statusData.validated?.failed || [],
              stats: statusData.validated?.stats,
            },

            output: {
              total: statusData.output?.total || 0,
              completed: statusData.output?.completed || 0,
              current: statusData.output?.current || "",
              imported: statusData.output?.imported || [],
              failed: statusData.output?.failed || [],
              stats: statusData.output?.stats,
            },

            current_table:
              statusData.current_table ||
              statusData.validated?.current ||
              statusData.output?.current,

            completed_tables:
              statusData.completed_tables ||
              (statusData.validated?.completed || 0) +
                (statusData.output?.completed || 0),

            total_tables:
              statusData.total_tables ||
              (statusData.validated?.total || 0) +
                (statusData.output?.total || 0),

            progress_message:
              statusData.progress_message || statusData.summary?.message,

            eta_seconds: statusData.eta_seconds,
            summary: statusData.summary,
          };

          setDatabaseStatus(mappedStatus);

          if (mappedStatus.status === "COMPLETED") {
            clearInterval(pollInterval);
            setProcessStats((prev) => ({ ...prev, dbEndTime: Date.now() }));
            setIsImportingToDb(false);

            toast({
              title: "✅ Database Import Complete",
              description: `Imported ${mappedStatus.imported_records?.toLocaleString() || 0} records to ${mappedStatus.imported_tables?.length || 0} tables`,
            });

            setTimeout(() => setShowDbImportModal(false), 2000);
          } else if (mappedStatus.status === "PARTIALLY_COMPLETED") {
            clearInterval(pollInterval);
            setProcessStats((prev) => ({ ...prev, dbEndTime: Date.now() }));
            setIsImportingToDb(false);

            toast({
              title: "⚠️ Partial Import",
              description: `Imported: ${
                (mappedStatus.validated?.imported?.length || 0) +
                (mappedStatus.output?.imported?.length || 0)
              } tables`,
            });
          } else if (mappedStatus.status === "FAILED") {
            clearInterval(pollInterval);
            setProcessStats((prev) => ({ ...prev, dbEndTime: Date.now() }));
            setIsImportingToDb(false);

            toast({
              title: "❌ Database Import Failed",
              description: mappedStatus.error_message || "Unknown error",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Poll error:", error);
        }
      }, POLLING_INTERVAL);

      pollingInterval.current = pollInterval;
    } catch (error) {
      console.error("Database import error:", error);
      setIsImportingToDb(false);
      setProcessStats((prev) => ({ ...prev, dbEndTime: Date.now() }));
      setShowDbImportModal(false);

      setDatabaseStatus({
        ...defaultStatus,
        status: "FAILED",
        error_message:
          error instanceof Error
            ? error.message
            : "Failed to start database import",
      });

      toast({
        title: "❌ Database Import Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start database import",
        variant: "destructive",
      });
    }
  };

  // Add this debug function
  // const checkTaskStatus = async () => {
  //   if (!compilationStatus?.task_id) return;

  //   try {
  //     const response = await fetch(
  //       `${API_BASE}/cpi/compilation/task-status/${compilationStatus.task_id}`,
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );
  //     const data = await response.json();
  //     console.log("Task status from backend:", data);
  //     toast({
  //       title: "Task Status",
  //       description: `Status: ${data.status}, Month: ${data.month}, Year: ${data.year}`,
  //     });
  //   } catch (error) {
  //     console.error("Debug error:", error);
  //   }
  // };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Workflow steps
  const workflowSteps = [
    {
      icon: FiUploadCloud,
      label: "Upload",
      active: !!zipFile || isUploading,
      done: !!uploadSession,
    },
    {
      icon: FiCheckCircle,
      label: "Validate",
      active: !!uploadSession,
      done:
        uploadSession?.status === "VALIDATED" ||
        uploadSession?.status === "PARTIALLY_VALIDATED",
    },
    {
      icon: FiDatabase,
      label: "Compile",
      active: isCompiling,
      done: compilationStatus?.status === "SUCCESS",
    },
    {
      icon: FiServer,
      label: "Database",
      active: isImportingToDb,
      done: databaseStatus?.status === "COMPLETED",
    },
  ];

  function downloadCompiledFile(
    _event: React.MouseEvent<HTMLButtonElement>
  ): void {
    throw new Error("Function not implemented.");
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
              <FiUploadCloud className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                CPI Compilation Module
              </h1>
              <p className="text-gray-600 mt-1">
                Upload → Validate → Compile (to File) → Import to Database
              </p>
            </div>
          </div>

          {/* Workflow Progress */}
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-between">
                  {workflowSteps.map((step, _index) => (
                    <div
                      key={step.label}
                      className="flex flex-col items-center"
                    >
                      <div
                        className={`
                          relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                          ${
                            step.done
                              ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20"
                              : step.active
                                ? "bg-sky-500 border-sky-500 shadow-lg shadow-sky-500/20"
                                : "bg-white border-gray-300"
                          }
                        `}
                      >
                        <step.icon
                          className={`h-6 w-6 ${step.done || step.active ? "text-white" : "text-gray-400"}`}
                        />
                        {step.done && (
                          <div className="absolute -top-1 -right-1">
                            <FiCheckCircle className="h-4 w-4 text-white bg-emerald-500 rounded-full" />
                          </div>
                        )}
                      </div>
                      <span
                        className={`mt-3 text-sm font-medium ${step.done || step.active ? "text-gray-900" : "text-gray-500"}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload & Progress */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FiPackage className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>Upload Price Data</CardTitle>
                        <CardDescription>Upload your ZIP file</CardDescription>
                      </div>
                    </div>
                    {zipFile && (
                      <Badge className="bg-emerald-500 text-white">
                        {zipContents.length} files
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* File Upload Area */}
                  <div
                    className={`
                      relative border-2 border-dashed rounded-lg p-8 text-center transition-all
                      ${zipFile ? "border-emerald-400 bg-emerald-50" : "border-gray-300 hover:border-sky-400 hover:bg-sky-50"}
                      ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    onClick={!isUploading ? handleFileSelect : undefined}
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
                      disabled={isUploading}
                    />

                    <div className="space-y-4">
                      <div className="inline-flex p-4 rounded-full bg-gray-100">
                        {zipFile ? (
                          <FiCheckCircle className="h-8 w-8 text-emerald-600" />
                        ) : (
                          <FiUploadCloud className="h-8 w-8 text-gray-600" />
                        )}
                      </div>

                      {zipFile ? (
                        <div>
                          <p className="font-medium text-gray-900 truncate">
                            {zipFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(zipFile.size)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearUpload();
                            }}
                            className="mt-2"
                          >
                            <FiTrash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-700 font-medium">
                            Drop your ZIP file here
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            or{" "}
                            <span className="text-sky-600 font-semibold">
                              click to browse
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Max size: {formatFileSize(MAX_FILE_SIZE)}
                          </p>
                        </div>
                      )}
                    </div>

                    {isExtracting && (
                      <div className="absolute inset-0 bg-white/90 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <FiLoader className="animate-spin text-sky-500 text-3xl mx-auto" />
                          <p className="mt-2 font-medium">Extracting ZIP...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Files List */}
                  {/* Files List */}
                  {zipContents.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Files in ZIP</h3>
                        <div className="flex items-center gap-2">
                          {isExtracting && (
                            <div className="flex items-center gap-2 text-sm text-amber-600">
                              <FiLoader className="animate-spin h-4 w-4" />
                              <span>Extracting metadata...</span>
                            </div>
                          )}
                          <Input
                            placeholder="Search files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                            disabled={isExtracting}
                          />
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  checked={
                                    filteredFiles.length > 0 &&
                                    selectedFiles.size === filteredFiles.length
                                  }
                                  onChange={toggleAllFiles}
                                  className="rounded border-gray-300"
                                />
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold">
                                Filename
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold">
                                Size
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold">
                                Rows
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold">
                                Columns
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredFiles.map((file) => (
                              <tr key={file.name} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.name)}
                                    onChange={() =>
                                      toggleFileSelection(file.name)
                                    }
                                    className="rounded border-gray-300"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Tooltip content="Click for details">
                                    <TooltipTrigger>
                                      <span className="block truncate max-w-xs">
                                        {file.name}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">
                                        <p>Size: {file.size}</p>
                                        <p>
                                          Rows:{" "}
                                          {file.row_count?.toLocaleString()}
                                        </p>
                                        <p>Columns: {file.columns?.length}</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                <td className="px-4 py-2">{file.size}</td>
                                <td className="px-4 py-2">
                                  {file.row_count?.toLocaleString() || "-"}
                                </td>
                                <td className="px-4 py-2">
                                  <Badge variant="outline">
                                    {file.columns?.length || 0} columns
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          Selected {selectedCount} of {filteredFiles.length}{" "}
                          files
                        </span>
                        {selectedCount > 0 && (
                          <span className="font-medium text-indigo-600">
                            {zipContents
                              .filter((f) => selectedFiles.has(f.name))
                              .reduce((sum, f) => sum + (f.row_count || 0), 0)
                              .toLocaleString()}{" "}
                            rows
                          </span>
                        )}
                      </div>

                      {/* Auto-process toggles */}
                      <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className=" p-4 rounded">
                            <Label className="font-medium">Auto-compile</Label>
                            <p className="text-sm text-gray-500">
                              Start compilation after validation
                            </p>
                          </div>
                          <Switch
                            checked={autoCompile}
                            onCheckedChange={setAutoCompile}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label className="font-medium">
                              Auto-import to DB
                            </Label>
                            <p className="text-sm text-gray-500">
                              Import to database after compilation
                            </p>
                          </div>
                          <Switch
                            checked={autoDbImport}
                            onCheckedChange={setAutoDbImport}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* <CardFooter className="bg-gray-50 border-t">
                  <Button
                    onClick={startUploadSession}
                    disabled={isUploading || !zipFile || selectedCount === 0 || !isParameterSelected }
                    className="w-full bg-gradient-to-r from-sky-600 to-blue-600"
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <FiPlayCircle className="mr-2" />
                        Upload Selected Files ({selectedCount})
                      </>
                    )}
                  </Button>
                  {!isParameterSelected && (
                  <p className="text-xs text-red-500 mt-2">
                   Please select Type, Year and Month first
                  </p>
                )}
                </CardFooter> */}
              </Card>

              {/* Validation Status */}
              {uploadSession && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(uploadSession.status)}
                        Validation Results
                      </CardTitle>
                      <Badge className={getStatusColor(uploadSession.status)}>
                        {uploadSession.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-emerald-700">Success</p>
                        <p className="text-2xl font-bold text-emerald-900">
                          {uploadSession.processed_files}
                        </p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-lg">
                        <p className="text-sm text-rose-700">Failed</p>
                        <p className="text-2xl font-bold text-rose-900">
                          {uploadSession.failed_files}
                        </p>
                      </div>
                      <div className="p-4 bg-sky-50 rounded-lg">
                        <p className="text-sm text-sky-700">Total</p>
                        <p className="text-2xl font-bold text-sky-900">
                          {uploadSession.total_files}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compilation Progress */}
              {isCompiling && compilationStatus && (
                <Card className="bg-gradient-to-br from-indigo-50 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FiDatabase className="text-indigo-600" />
                      Compilation Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span className="font-bold text-indigo-700">
                          {compilationStatus.progress}%
                        </span>
                      </div>
                      <Progress
                        value={compilationStatus.progress}
                        className="h-2"
                      />
                    </div>

                    {/* Current Method */}
                    {compilationStatus.current_method &&
                      compilationStatus.current_method !== "Completed" && (
                        <div className="bg-white p-3 rounded-lg border border-indigo-100">
                          <p className="text-sm font-medium text-indigo-800">
                            Currently Running:
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <FiLoader className="animate-spin text-indigo-600 h-4 w-4" />
                            <span className="font-medium">
                              {compilationStatus.current_method}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {compilationStatus.method_details}
                          </p>
                        </div>
                      )}

                    {/* Methods List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {compilationStatus.methods?.map((method) => (
                        <div
                          key={method.name}
                          className="flex items-center justify-between p-2 bg-white rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {method.status === "completed" && (
                              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                            )}
                            {method.status === "in_progress" && (
                              <FiLoader className="h-4 w-4 text-indigo-500 animate-spin" />
                            )}
                            {method.status === "pending" && (
                              <FiClock className="h-4 w-4 text-gray-400" />
                            )}
                            {method.status === "failed" && (
                              <FiXCircle className="h-4 w-4 text-rose-500" />
                            )}
                            <div>
                              <span className="text-sm font-medium">
                                {method.name}
                              </span>
                              {method.description && (
                                <p className="text-xs text-gray-500">
                                  {method.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {method.duration && (
                            <span className="text-xs text-gray-500">
                              {method.duration.toFixed(1)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Completed Summary */}
                    {compilationStatus.methods && (
                      <div className="flex justify-between text-sm text-gray-600 pt-2 border-t">
                        <span>Completed:</span>
                        <span className="font-medium">
                          {
                            compilationStatus.methods.filter(
                              (m) => m.status === "completed"
                            ).length
                          }{" "}
                          / {compilationStatus.methods.length}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {compilationStatus?.status === "SUCCESS" &&
                compilationStatus.compiled_file_info && (
                  <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-emerald-700">
                        <FiCheckCircle className="text-emerald-500" />
                        Compiled File Ready
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FiFile className="text-emerald-500" />
                            <span className="font-medium">
                              {compilationStatus.compiled_file_info.filename}
                            </span>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {compilationStatus.compiled_file_info.size}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          <p>
                            Records:{" "}
                            {compilationStatus.compiled_record_count?.toLocaleString() ||
                              "N/A"}
                          </p>
                          <p>
                            Modified:{" "}
                            {new Date(
                              compilationStatus.compiled_file_info.modified
                            ).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() =>
                            window.open(
                              `${API_BASE}/cpi/compile/download/${compilationStatus.task_id}`,
                              "_blank"
                            )
                          }
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                          <FiDownload className="mr-2" />
                          Download Compiled File
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>

            {/* Right Column - Configuration & Actions */}
            <div className="space-y-6">
              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiSettings className="text-purple-600" />
                    Select Compilation Parameters
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                {/* //nihi */}
 <div className="bg-white border rounded-2xl p-6 shadow-sm">
 <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">

  {/* Type */}
  <div className="flex items-center gap-2">
    <Label className="w-20 flex items-center gap-2 text-sm font-medium text-gray-700">
      <FiType className="h-4 w-4 text-indigo-500 shrink-0" />
      <span>Type</span>
    </Label>

    <div className="flex-1">
     <Select
  value={compilationParams.compile_type}
  onValueChange={(value) =>
    setCompilationParams({
      compile_type: value,
      year: "",
      month: "",
    })
  }
  options={[
    ...new Map(
      compilationFilterOptions.map((item: any) => [
        item.type,
        {
          value: item.type,
          label: item.type,
        },
      ])
    ).values(),
  ]}
  placeholder="Select type"
/>
    </div>
  </div>

  {/* Year */}
  <div className="flex items-center gap-2">
    <Label className="w-20 flex items-center gap-2 text-sm font-medium text-gray-700">
      <FiCalendar className="h-4 w-4 text-indigo-500 shrink-0" />
      <span>Year</span>
    </Label>

    <div className="flex-1">
<Select
  value={compilationParams.year}
  onValueChange={(value) =>
    setCompilationParams((prev) => ({
      ...prev,
      year: value,
    }))
  }
  options={[
    ...new Map(
      compilationFilterOptions
        .filter(
          (item: any) =>
            !compilationParams.compile_type ||
            item.type === compilationParams.compile_type
        )
        .map((item: any) => [
          item.year,
          {
            value: item.year.toString(),
            label: item.year.toString(),
          },
        ])
    ).values(),
  ]}
  placeholder="Select year"
/>
    </div>
  </div>

  {/* Month */}
  <div className="flex items-center gap-2">
    <Label className="w-20 flex items-center gap-2 text-sm font-medium text-gray-700">
      <FiCalendar className="h-4 w-4 text-indigo-500 shrink-0" />
      <span>Month</span>
    </Label>

    <div className="flex-1">
    <Select
  value={compilationParams.month}
  onValueChange={(value) =>
    setCompilationParams((prev) => ({
      ...prev,
      month: value,
    }))
  }
  options={compilationFilterOptions
    .filter(
      (item: any) =>
        item.type === compilationParams.compile_type &&
        item.year.toString() === compilationParams.year
    )
    .map((item: any) => ({
      value: item.month.toString(),
      label: getMonthName(item.month),
    }))}
  placeholder="Select month"
/>
    </div>
  </div>
</div>
</div>


{/* ///nihi */}
  {compilationStatus?.status === "SUCCESS" && (
    <>
      <Separator />

      <div className="space-y-2">
        <Label>Target Table</Label>
        <Input
          value={dbImportParams.table_name}
          onChange={(e) =>
            setDbImportParams((prev) => ({
              ...prev,
              table_name: e.target.value,
            }))
          }
          placeholder="compiled_data_jan_2026"
        />
      </div>

      <div className="space-y-2">
        <Label>Import Mode</Label>
        <Select
          value={dbImportParams.import_mode}
          onValueChange={(value: "append" | "replace" | "merge") =>
            setDbImportParams((prev) => ({
              ...prev,
              import_mode: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="append">Append</SelectItem>
            <SelectItem value="replace">Replace</SelectItem>
            <SelectItem value="merge">Merge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Create Backup</Label>
        <Switch
          checked={dbImportParams.create_backup}
          onCheckedChange={(checked) =>
            setDbImportParams((prev) => ({
              ...prev,
              create_backup: checked,
            }))
          }
        />
      </div>
    </>
  )}
</CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiPlayCircle className="text-sky-600" />
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* <Button
                    className="w-full justify-start  bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={startCompilation}
                    disabled={
                      !uploadSession ||
                      !["VALIDATED", "PARTIALLY_VALIDATED"].includes(
                        uploadSession.status
                      ) ||
                      isCompiling
                    }
                  >
                    <FiDatabase className="mr-2" />
                    Start Compilation
                  </Button> */}

                   <Button
                    onClick={startUploadSession}
                    disabled={isUploading || !zipFile || selectedCount === 0 || !isParameterSelected }
                     className="w-full justify-start  bg-blue-600 hover:bg-blue-700 text-white"
                    // className="w-full bg-gradient-to-r from-sky-600 to-blue-600"
                    // size="lg"
                  >
                    {isUploading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <FiPlayCircle className="mr-2" />
                        Compile Files({selectedCount})
                      </>
                    )}
                  </Button>
                 {/* Validation message */}
                  {!isParameterSelected && (
                   <p className="text-xs text-red-500 mt-2 text-center">
                    Please select Type, Year and Month first
                   </p>
                  )}


                  

                  <Button
                    className="w-full justify-start  bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={startDatabaseImport}
                    disabled={
                      compilationStatus?.status !== "SUCCESS" || isImportingToDb
                    }
                  >
                    <FiServer className="mr-2" />
                    Import to Database
                  </Button>

                  {compilationStatus?.status === "SUCCESS" &&
                    compilationStatus.compiled_file_info && (
                      <Button
                        variant="outline"
                        className="w-full justify-start  bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={downloadCompiledFile}
                      >
                        <FiDownload className="mr-2" />
                        Download Compiled File
                      </Button>
                    )}

                  {/* <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/compilation/history")}
                  >
                    <FiBarChart2 className="mr-2" />
                    View History
                  </Button> */}

                  <Button
                    variant="outline"
                    className="w-full justify-start text-rose-600 hover:text-rose-700"
                    onClick={clearUpload}
                    disabled={isUploading || isCompiling || isImportingToDb}
                  >
                    <FiRefreshCw className="mr-2" />
                    Start New
                  </Button>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiClock className="text-gray-500" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Upload</span>
                    <Badge
                      className={getStatusColor(
                        uploadSession?.status || "PENDING"
                      )}
                    >
                      {uploadSession?.status || "Pending"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Compilation</span>
                    <Badge
                      className={getStatusColor(
                        compilationStatus?.status || "PENDING"
                      )}
                    >
                      {compilationStatus?.status || "Pending"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <Badge
                      className={getStatusColor(
                        databaseStatus?.status || "PENDING"
                      )}
                    >
                      {databaseStatus?.status === "COMPLETED"
                        ? "Imported"
                        : databaseStatus?.status || "Pending"}
                    </Badge>
                  </div>

                  {(uploadDuration || compileDuration || dbDuration) && (
                    <div className="pt-3 border-t space-y-2">
                      {uploadDuration && (
                        <div className="flex justify-between text-sm">
                          <span>Upload Time:</span>
                          <span className="font-medium">{uploadDuration}</span>
                        </div>
                      )}
                      {compileDuration && (
                        <div className="flex justify-between text-sm">
                          <span>Compile Time:</span>
                          <span className="font-medium">{compileDuration}</span>
                        </div>
                      )}
                      {dbDuration && (
                        <div className="flex justify-between text-sm">
                          <span>DB Import:</span>
                          <span className="font-medium">{dbDuration}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upload Progress Modal */}
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg">
                    <FiUploadCloud className="h-5 w-5 text-sky-600" />
                  </div>
                  <span>Upload Progress</span>
                </DialogTitle>
              </DialogHeader>

              {/* Upload Progress Modal Content */}
              <div className="space-y-4">
                {/* Upload Progress Bar */}
                {isUploading && uploadProgress < 100 && (
                  <div className="bg-sky-50 p-4 rounded-xl border border-sky-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sky-700">
                        Uploading...
                      </span>
                      <span className="text-sky-700 font-bold">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress
                      value={uploadProgress}
                      className="h-2 bg-sky-100"
                    />
                    {uploadSpeed && (
                      <p className="text-xs text-sky-600 mt-2">
                        Speed: {uploadSpeed} • {formatFileSize(uploadedBytes)}{" "}
                        uploaded
                      </p>
                    )}
                  </div>
                )}

                {/* Validation Progress Section */}
                {uploadSession?.status === "VALIDATING" && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <FiLoader className="animate-spin text-amber-600 h-5 w-5" />
                        <span className="font-medium text-amber-700">
                          {uploadSession.current_step || "Validating..."}
                        </span>
                      </div>
                      <span className="text-amber-700 font-bold">
                        {uploadSession.progress || 0}%
                      </span>
                    </div>
                    <Progress
                      value={getProgressValue(uploadSession.progress)}
                      className="h-2 bg-amber-100"
                    />
                    {uploadSession.step_details && (
                      <p className="text-xs text-amber-600 mt-2">
                        {uploadSession.step_details}
                      </p>
                    )}
                  </div>
                )}

                {/* Session Status Banner */}
                {uploadSession?.status === "FAILED" && (
                  <Alert
                    variant="destructive"
                    className="border-rose-200 bg-rose-50"
                  >
                    <FiAlertCircle className="h-4 w-4 text-rose-600" />
                    <AlertTitle className="text-rose-800 font-medium">
                      Upload Failed
                    </AlertTitle>
                    <AlertDescription className="text-rose-700">
                      {uploadSession.error_message ||
                        "The upload could not be processed."}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium">
                      Total Files
                    </p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {uploadSession?.total_files || selectedCount || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Selected for upload
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-700 font-medium">
                      Validated
                    </p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">
                      {uploadSession?.processed_files ||
                        uploadStatuses.filter((f) =>
                          ["VALIDATED", "SUCCESS", "COMPLETED"].includes(
                            f.status
                          )
                        ).length ||
                        0}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Successfully validated
                    </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                    <p className="text-sm text-rose-700 font-medium">Failed</p>
                    <p className="text-2xl font-bold text-rose-900 mt-1">
                      {uploadSession?.failed_files ||
                        uploadStatuses.filter((f) =>
                          ["FAILED", "ERROR", "FAILURE"].includes(f.status)
                        ).length ||
                        0}
                    </p>
                    <p className="text-xs text-rose-600 mt-1">
                      Validation failed
                    </p>
                  </div>
                </div>

                {/* Overall Progress Summary */}
                {uploadSession?.progress !== undefined &&
                  uploadSession?.progress !== null &&
                  getProgressValue(uploadSession.progress) > 0 &&
                  getProgressValue(uploadSession.progress) < 100 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Overall Progress</span>
                        <span className="font-semibold text-gray-900">
                          {uploadSession.progress}%
                        </span>
                      </div>
                      <Progress
                        value={getProgressValue(uploadSession.progress)}
                        className="h-1.5 mt-2"
                      />
                    </div>
                  )}

                {/* File Progress List - Show ALL files with validation status */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {uploadStatuses.length > 0 ? (
                    uploadStatuses.map((file, index) => {
                      const getDisplayStatus = (status: string): string => {
                        const statusMap: Record<string, string> = {
                          pending: "PENDING",
                          PENDING: "PENDING",
                          uploading: "UPLOADING",
                          UPLOADING: "UPLOADING",
                          validating: "VALIDATING",
                          VALIDATING: "VALIDATING",
                          success: "VALIDATED",
                          SUCCESS: "VALIDATED",
                          VALIDATED: "VALIDATED",
                          COMPLETED: "VALIDATED",
                          error: "FAILED",
                          ERROR: "FAILED",
                          FAILED: "FAILED",
                          FAILURE: "FAILED",
                          PROGRESS: "VALIDATING",
                        };
                        return statusMap[status] || status;
                      };

                      const getStatusProgress = (status: string): number => {
                        if (
                          ["VALIDATED", "SUCCESS", "COMPLETED"].includes(status)
                        )
                          return 100;
                        if (["FAILED", "ERROR", "FAILURE"].includes(status))
                          return 100;
                        if (["VALIDATING", "PROGRESS"].includes(status))
                          return 75;
                        if (["UPLOADING"].includes(status)) return 50;
                        if (["PENDING"].includes(status)) return 25;
                        return file.progress || 0;
                      };

                      const getBadgeClass = (status: string) => {
                        const upperStatus = status.toUpperCase();
                        if (
                          ["VALIDATED", "SUCCESS", "COMPLETED"].includes(
                            upperStatus
                          )
                        )
                          return "bg-emerald-100 text-emerald-700 border-emerald-200";
                        if (
                          ["ERROR", "FAILED", "FAILURE"].includes(upperStatus)
                        )
                          return "bg-rose-100 text-rose-700 border-rose-200";
                        if (["UPLOADING", "PROGRESS"].includes(upperStatus))
                          return "bg-sky-100 text-sky-700 border-sky-200";
                        if (["VALIDATING"].includes(upperStatus))
                          return "bg-amber-100 text-amber-700 border-amber-200";
                        if (["PENDING"].includes(upperStatus))
                          return "bg-gray-100 text-gray-700 border-gray-200";
                        return "bg-gray-100 text-gray-700 border-gray-200";
                      };

                      return (
                        <div
                          key={file.file_id || index}
                          className="border rounded-xl p-4 hover:bg-gray-50/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {getStatusIcon(file.status)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 truncate">
                                    {file.file_name}
                                  </span>
                                  {file.row_count ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {file.row_count.toLocaleString()} rows
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span>{file.size}</span>
                                  {file.columns && file.columns.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{file.columns.length} columns</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge className={getBadgeClass(file.status)}>
                              {getDisplayStatus(file.status)}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  file.status === "FAILED" ||
                                  file.status === "ERROR"
                                    ? "bg-rose-500"
                                    : file.status === "VALIDATED" ||
                                        file.status === "SUCCESS"
                                      ? "bg-emerald-500"
                                      : "bg-gradient-to-r from-sky-500 to-blue-500"
                                }`}
                                style={{
                                  width: `${getStatusProgress(file.status)}%`,
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">
                                {getStatusProgress(file.status)}%
                              </span>
                              {file.message && (
                                <span
                                  className={`font-medium ${
                                    [
                                      "error",
                                      "ERROR",
                                      "FAILED",
                                      "FAILURE",
                                    ].includes(String(file.status))
                                      ? "text-rose-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {file.message}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Show columns preview if available */}
                          {file.columns && file.columns.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {file.columns.slice(0, 5).map((col, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs bg-gray-50"
                                >
                                  {col}
                                </Badge>
                              ))}
                              {file.columns.length > 5 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-gray-50"
                                >
                                  +{file.columns.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : uploadSession?.status === "FAILED" ? (
                    <div className="text-center py-12">
                      <div className="inline-flex p-4 bg-rose-100 rounded-full mb-4">
                        <FiXCircle className="h-12 w-12 text-rose-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Upload Failed
                      </h3>
                      <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                        {uploadSession.error_message ||
                          "The upload could not be processed."}
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUploadModal(false)}
                        >
                          Close
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowUploadModal(false);
                            clearUpload();
                          }}
                          className="bg-rose-600 hover:bg-rose-700"
                        >
                          <FiRefreshCw className="mr-2 h-4 w-4" />
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="relative inline-flex mb-4">
                        <FiLoader className="animate-spin text-sky-500 text-4xl" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedCount > 0
                          ? `Processing ${selectedCount} selected files...`
                          : "Waiting for files to be processed..."}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {selectedCount} files selected for upload
                      </p>
                    </div>
                  )}
                </div>

                {/* File Info */}
                {zipFile && uploadSession?.status === "FAILED" && (
                  <div className="border-t pt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        File Information:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">Filename:</span>
                        <span className="text-gray-900 font-medium">
                          {zipFile.name}
                        </span>
                        <span className="text-gray-600">Size:</span>
                        <span className="text-gray-900 font-medium">
                          {formatFileSize(zipFile.size)}
                        </span>
                        <span className="text-gray-600">Selected files:</span>
                        <span className="text-gray-900 font-medium">
                          {selectedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Close
                </Button>

                {uploadSession?.status === "FAILED" && (
                  <Button
                    onClick={() => {
                      setShowUploadModal(false);
                      clearUpload();
                    }}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    <FiRefreshCw className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Database Import Modal */}
          <Dialog open={showDbImportModal} onOpenChange={setShowDbImportModal}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FiDatabase className="text-blue-600" />
                  Database Import Progress
                </DialogTitle>
              </DialogHeader>

              {databaseStatus ? (
                <div className="space-y-6 py-4">
                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Overall Progress
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {databaseStatus.progress}%
                      </span>
                    </div>
                    <Progress
                      value={databaseStatus.progress}
                      className="h-2.5"
                    />
                  </div>

                  {/* Status Banner */}
                  {databaseStatus.status === "COMPLETED" && (
                    <Alert className="bg-emerald-50 border-emerald-200">
                      <FiCheckCircle className="h-4 w-4 text-emerald-600" />
                      <AlertTitle className="text-emerald-800">
                        Import Completed Successfully
                      </AlertTitle>
                      <AlertDescription className="text-emerald-700">
                        Imported{" "}
                        {databaseStatus.imported_records?.toLocaleString()}{" "}
                        records to {databaseStatus.imported_tables?.length}{" "}
                        tables
                      </AlertDescription>
                    </Alert>
                  )}

                  {databaseStatus.status === "PARTIALLY_COMPLETED" && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <FiAlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800">
                        Partial Import Completed
                      </AlertTitle>
                      <AlertDescription className="text-amber-700">
                        {databaseStatus.imported_tables?.length} tables
                        succeeded, {databaseStatus.failed_tables?.length} tables
                        failed
                      </AlertDescription>
                    </Alert>
                  )}

                  {databaseStatus.status === "FAILED" && (
                    <Alert variant="destructive">
                      <FiXCircle className="h-4 w-4" />
                      <AlertTitle>Import Failed</AlertTitle>
                      <AlertDescription>
                        {databaseStatus.error_message ||
                          "Unknown error occurred"}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validated Data Progress */}
                  {databaseStatus.validated &&
                    databaseStatus.validated.total > 0 && (
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <FiDatabase className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">
                                Validated Data
                              </h3>
                              <p className="text-xs text-gray-500">
                                prices schema
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            {databaseStatus.validated.completed || 0}/
                            {databaseStatus.validated.total || 0} tables
                          </Badge>
                        </div>

                        <Progress
                          value={
                            databaseStatus.validated.total
                              ? ((databaseStatus.validated.completed || 0) /
                                  databaseStatus.validated.total) *
                                100
                              : 0
                          }
                          className="h-2 mb-3"
                        />

                        {databaseStatus.validated.current &&
                          databaseStatus.status === "IN_PROGRESS" && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg mb-2">
                              <FiLoader className="animate-spin text-blue-600 h-3 w-3" />
                              <span className="text-xs">
                                Currently importing:{" "}
                                <span className="font-mono font-medium">
                                  {databaseStatus.validated.current}
                                </span>
                              </span>
                            </div>
                          )}

                        {/* Imported tables list */}
                        {databaseStatus.validated.imported &&
                          databaseStatus.validated.imported.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Imported tables:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {databaseStatus.validated.imported
                                  .slice(0, 3)
                                  .map((table, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs bg-green-50 text-green-700 border-green-200"
                                    >
                                      {table.split(".").pop()}
                                    </Badge>
                                  ))}
                                {databaseStatus.validated.imported.length >
                                  3 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-gray-50"
                                  >
                                    +
                                    {databaseStatus.validated.imported.length -
                                      3}{" "}
                                    more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Failed tables list */}
                        {databaseStatus.validated.failed &&
                          databaseStatus.validated.failed.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-rose-500 mb-1">
                                Failed tables:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {databaseStatus.validated.failed
                                  .slice(0, 3)
                                  .map((table, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs bg-rose-50 text-rose-700 border-rose-200"
                                    >
                                      {table.split(".").pop()}
                                    </Badge>
                                  ))}
                                {databaseStatus.validated.failed.length > 3 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-rose-50 text-rose-700 border-rose-200"
                                  >
                                    +
                                    {databaseStatus.validated.failed.length - 3}{" "}
                                    more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                  {/* Output Data Progress */}
                  {databaseStatus.output && databaseStatus.output.total > 0 && (
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <FiBarChart2 className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              Output Data
                            </h3>
                            <p className="text-xs text-gray-500">
                              price_idx schema
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {databaseStatus.output.completed || 0}/
                          {databaseStatus.output.total || 0} tables
                        </Badge>
                      </div>

                      <Progress
                        value={
                          databaseStatus.output.total
                            ? ((databaseStatus.output.completed || 0) /
                                databaseStatus.output.total) *
                              100
                            : 0
                        }
                        className="h-2 mb-3"
                      />

                      {databaseStatus.output.current &&
                        databaseStatus.status === "IN_PROGRESS" && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg mb-2">
                            <FiLoader className="animate-spin text-blue-600 h-3 w-3" />
                            <span className="text-xs">
                              Currently importing:{" "}
                              <span className="font-mono font-medium">
                                {databaseStatus.output.current}
                              </span>
                            </span>
                          </div>
                        )}

                      {/* Imported tables list */}
                      {databaseStatus.output.imported &&
                        databaseStatus.output.imported.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Imported tables:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {databaseStatus.output.imported
                                .slice(0, 3)
                                .map((table, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                  >
                                    {table.split(".").pop()}
                                  </Badge>
                                ))}
                              {databaseStatus.output.imported.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-gray-50"
                                >
                                  +{databaseStatus.output.imported.length - 3}{" "}
                                  more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Failed tables list */}
                      {databaseStatus.output.failed &&
                        databaseStatus.output.failed.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-rose-500 mb-1">
                              Failed tables:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {databaseStatus.output.failed
                                .slice(0, 3)
                                .map((table, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs bg-rose-50 text-rose-700 border-rose-200"
                                  >
                                    {table.split(".").pop()}
                                  </Badge>
                                ))}
                              {databaseStatus.output.failed.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-rose-50 text-rose-700 border-rose-200"
                                >
                                  +{databaseStatus.output.failed.length - 3}{" "}
                                  more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600">Total Tables</p>
                      <p className="text-xl font-bold text-blue-900">
                        {(databaseStatus.validated?.total || 0) +
                          (databaseStatus.output?.total || 0)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      <p className="text-xs text-emerald-600">Completed</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {(databaseStatus.validated?.completed || 0) +
                          (databaseStatus.output?.completed || 0)}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <p className="text-xs text-amber-600">In Progress</p>
                      <p className="text-xl font-bold text-amber-900">
                        {databaseStatus.status === "IN_PROGRESS"
                          ? (databaseStatus.validated?.total || 0) +
                            (databaseStatus.output?.total || 0) -
                            ((databaseStatus.validated?.completed || 0) +
                              (databaseStatus.output?.completed || 0))
                          : 0}
                      </p>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                      <p className="text-xs text-rose-600">Failed</p>
                      <p className="text-xl font-bold text-rose-900">
                        {(databaseStatus.validated?.failed?.length || 0) +
                          (databaseStatus.output?.failed?.length || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Records Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-xs text-gray-500">Total Records</p>
                      <p className="text-lg font-semibold">
                        {databaseStatus.total_records?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-xs text-gray-500">Imported Records</p>
                      <p className="text-lg font-semibold text-emerald-600">
                        {databaseStatus.imported_records?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {/* Progress Message */}
                  {databaseStatus.progress_message &&
                    databaseStatus.status === "IN_PROGRESS" && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">
                          {databaseStatus.progress_message}
                        </p>
                      </div>
                    )}

                  {/* ETA */}
                  {databaseStatus.eta_seconds &&
                    databaseStatus.status === "IN_PROGRESS" && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiClock className="h-4 w-4" />
                        <span>
                          Estimated time remaining:{" "}
                          {Math.floor(databaseStatus.eta_seconds / 60)}m{" "}
                          {databaseStatus.eta_seconds % 60}s
                        </span>
                      </div>
                    )}

                  {/* Error Details */}
                  {databaseStatus.error_message &&
                    databaseStatus.status === "FAILED" && (
                      <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                        <p className="text-sm font-medium text-rose-800 mb-1">
                          Error Details:
                        </p>
                        <p className="text-xs text-rose-700 font-mono bg-white p-2 rounded border border-rose-200 overflow-auto max-h-32">
                          {databaseStatus.error_message}
                        </p>
                      </div>
                    )}

                  {/* Close Button */}
                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDbImportModal(false)}
                      disabled={databaseStatus.status === "IN_PROGRESS"}
                    >
                      {databaseStatus.status === "IN_PROGRESS"
                        ? "Import in Progress..."
                        : "Close"}
                    </Button>

                    {databaseStatus.status === "COMPLETED" && (
                      <Button
                        onClick={() => setShowDbImportModal(false)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <FiCheckCircle className="mr-2 h-4 w-4" />
                        Done
                      </Button>
                    )}

                    {databaseStatus.status === "FAILED" && (
                      <Button
                        variant="destructive"
                        onClick={() => setShowDbImportModal(false)}
                      >
                        <FiXCircle className="mr-2 h-4 w-4" />
                        Close
                      </Button>
                    )}

                    {databaseStatus.status === "PARTIALLY_COMPLETED" && (
                      <Button
                        variant="default"
                        onClick={() => setShowDbImportModal(false)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <FiAlertCircle className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FiLoader className="animate-spin text-blue-600 h-8 w-8 mb-4" />
                  <p className="text-gray-600">Starting import...</p>
                  <p className="text-xs text-gray-400 mt-2">
                    This may take a few moments
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Validation Details Modal */}
          <Dialog
            open={showValidationDetails}
            onOpenChange={setShowValidationDetails}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Validation Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {uploadStatuses
                  .filter((f) =>
                    ["error", "ERROR", "FAILED"].includes(f.status)
                  )
                  .map((file) => (
                    <div
                      key={file.file_id}
                      className="p-4 bg-rose-50 rounded-lg"
                    >
                      <p className="font-medium text-rose-900">
                        {file.file_name}
                      </p>
                      <p className="text-sm text-rose-700 mt-1">
                        {file.message}
                      </p>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}
