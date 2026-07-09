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
  FiType,
 
  FiPlayCircle,
  FiClock,

  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiGrid,
  FiActivity,
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

const API_BASE = "http://localhost:8000/api";

// Types
interface UploadStatus {
  file_id: string;
  file_name: string;
  status: "pending" | "uploading" | "validating" | "success" | "error";
  progress: number;
  size: string;
  message?: string;
  timestamp: string;
  error_details?: any;
}

interface CompilationStage {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  started_at?: string;
  completed_at?: string;
  duration?: number;
  details?: string;
}

interface CompilationStatus {
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
  };
}

interface UploadSession {
  session_id: string;
  status: "PENDING" | "UPLOADING" | "VALIDATING" | "VALIDATED" | "FAILED";
  total_files: number;
  processed_files: number;
  failed_files: number;
  validation_summary: any;
  file_statuses: UploadStatus[];
  created_at: string;
  updated_at: string;
}

interface ProcessStats {
  uploadStartTime: number | null;
  uploadEndTime: number | null;
  compileStartTime: number | null;
  compileEndTime: number | null;
}

export default function UploadPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [compilationStatus, setCompilationStatus] =
    useState<CompilationStatus | null>(null);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(
    null
  );
  const [processStats, setProcessStats] = useState<ProcessStats>({
    uploadStartTime: null,
    uploadEndTime: null,
    compileStartTime: null,
    compileEndTime: null,
  });

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Process states
  const [isUploading, setIsUploading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
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
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // File handlers
  const handleZipUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      processZipFile(file);
    },
    [toast]
  );
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = useCallback(() => {
    setZipFile(null);
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
      title: "Cleared",
      description: "Ready for new upload",
      icon: <FiRefreshCw />,
    });
  }, [toast]);

  // Upload Process
  const startUploadSession = async () => {
    if (!zipFile) {
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
      const sessionResponse = await fetch(`${API_BASE}/uploads/sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create session");
      }

      const { session_id } = await sessionResponse.json();
      uploadTaskIdRef.current = session_id;

      setProcessStats((prev) => ({
        ...prev,
        uploadStartTime: Date.now(),
      }));

      // Upload file
      await uploadFile(session_id);
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
              message:
                progress < 100 ? `Uploading... ${progress}%` : "Validating...",
              timestamp: new Date().toISOString(),
            }))
          );
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 202) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Upload timeout"));

        // ✅ FIXED URL
        xhr.open("POST", `${API_BASE}/uploads/sessions/${sessionId}/upload/`);

        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${localStorage.getItem("authToken")}`
        );

        xhr.timeout = 300000;
        xhr.send(formData);
      });

      await uploadPromise;

      startPollingUploadStatus(sessionId);

      toast({
        title: "Upload Started",
        description: "Uploading and validating files...",
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
  // Polling for upload status
  // Polling for upload status
  const startPollingUploadStatus = (sessionId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    setIsPolling(true);

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/uploads/sessions/status/${sessionId}/`, // ✅ FIXED
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch upload status (${response.status})`);
        }

        const data = await response.json();
        setUploadSession(data);

        if (data.file_statuses) {
          setUploadStatuses(data.file_statuses);
        }

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
            toast({
              title: "Upload Complete",
              description: `Validated ${data.total_files} files in ${formatTime(uploadTime)}`,
              icon: <FiCheckCircle className="text-green-500" />,
            });

            if (autoCompile) {
              setTimeout(() => {
                startCompilation();
              }, 500);
            }
          } else {
            toast({
              title: "Validation Issues",
              description: `${data.failed_files} file(s) failed validation`,
              variant: "destructive",
              icon: <FiAlertCircle />,
            });
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1500);
  };

  // Compilation Process
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
      const token = localStorage.getItem("authToken");
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

      const response = await fetch(`${API_BASE}/compilation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: uploadTaskIdRef.current,
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start compilation");
      }

      const data = await response.json();
      startPollingCompilationStatus(data.task_id);

      toast({
        title: "Compilation Started",
        description: "Processing data compilation...",
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

  // Polling for compilation status
  const startPollingCompilationStatus = (taskId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/compilation/${taskId}/status/`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

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
            // Smooth navigation
            setTimeout(() => {
              navigate("/compilation/compilation_index");
            }, 1000);
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
    }, 2000);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Calculate statistics
  const totalFiles = uploadSession?.total_files || 0;
  const successFiles = uploadStatuses.filter(
    (f) => f.status === "success"
  ).length;
  const errorFiles = uploadStatuses.filter((f) => f.status === "error").length;
  const isReadyForCompilation = uploadSession?.status === "VALIDATED";
  const hasValidationErrors =
    uploadSession?.failed_files && uploadSession.failed_files > 0;

  // Get status color with smooth transitions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALIDATED":
      case "SUCCESS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED":
      case "FAILURE":
        return "bg-rose-50 text-rose-700 border-rose-200";
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

  // Get status icon with animations
  const getStatusIcon = (status: string, className?: string) => {
    const baseClass = className || "h-4 w-4";
    switch (status) {
      case "VALIDATED":
      case "SUCCESS":
        return <FiCheckCircle className={`${baseClass} text-emerald-500`} />;
      case "FAILED":
      case "FAILURE":
        return <FiXCircle className={`${baseClass} text-rose-500`} />;
      case "UPLOADING":
      case "VALIDATING":
      case "PROGRESS":
        return (
          <FiLoader className={`${baseClass} text-sky-500 animate-spin`} />
        );
      default:
        return <FiClock className={`${baseClass} text-gray-400`} />;
    }
  };

  // Handle drag and drop with visual feedback
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

  const processZipFile = (file: File) => {
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".parquet.zip")) {
      toast({
        title: "Invalid File",
        description: "Please upload a ZIP file containing parquet files",
        variant: "destructive",
        icon: <FiAlertCircle />,
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024 * 15) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
        icon: <FiAlertCircle />,
      });
      return;
    }

    setZipFile(file);
    setUploadStatuses([
      {
        file_id: `zip-${Date.now()}`,
        file_name: file.name,
        status: "pending",
        progress: 0,
        size: formatFileSize(file.size),
        message: "Ready to upload",
        timestamp: new Date().toISOString(),
      },
    ]);

    toast({
      title: "File Selected",
      description: `${file.name} (${formatFileSize(file.size)})`,
      icon: <FiCheckCircle className="text-green-500" />,
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-sky-400", "bg-sky-50");

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processZipFile(files[0]); // ✅ Direct call
    }
  };

  // Calculate durations
  const uploadDuration =
    processStats.uploadStartTime && processStats.uploadEndTime
      ? formatTime(processStats.uploadEndTime - processStats.uploadStartTime)
      : null;

  const compileDuration =
    processStats.compileStartTime && processStats.compileEndTime
      ? formatTime(processStats.compileEndTime - processStats.compileStartTime)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
                <FiUploadCloud className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Data Processing Pipeline
                </h1>
                <p className="text-gray-600 mt-1">
                  Upload → Validate → Compile → Analyze
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-sm px-4 py-2 border-sky-200 bg-white/80"
            >
              <FiCalendar className="mr-2 h-4 w-4" />
              {compilationParams.month} {compilationParams.year}
              <span className="ml-2 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">
                {compilationParams.compile_type}
              </span>
            </Badge>
          </div>
        </div>

        {/* Workflow Progress Bar */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="relative">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-between">
              {[
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
                  done: isReadyForCompilation,
                },
                {
                  icon: FiDatabase,
                  label: "Compile",
                  active: isCompiling,
                  done: compilationStatus?.status === "SUCCESS",
                },
              ].map((step, ) => (
                <div key={step.label} className="flex flex-col items-center">
                  <div
                    className={`
                    relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
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
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration & Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Configuration Card */}
            <Card className="border shadow-lg bg-white hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                      <FiPackage className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        Upload Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure and upload your data files
                      </CardDescription>
                    </div>
                  </div>
                  {zipFile && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
                      <FiFile className="mr-2 h-3 w-3" />
                      Ready
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Configuration */}
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Month */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiCalendar className="h-4 w-4 text-indigo-500" />
                        Month
                      </Label>
                      <Select
                        value={compilationParams.month}
                        onValueChange={(value) =>
                          setCompilationParams((prev) => ({
                            ...prev,
                            month: value,
                          }))
                        }
                        options={[
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
                        ].map((month) => ({
                          value: month,
                          label: month,
                        }))}
                        placeholder="Select month"
                      />
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">
                        <FiCalendar className="h-4 w-4 text-indigo-500" />
                        Year
                      </Label>
                      <Select
                        value={compilationParams.year.toString()}
                        onValueChange={(value) =>
                          setCompilationParams((prev) => ({
                            ...prev,
                            year: parseInt(value),
                          }))
                        }
                        options={Array.from(
                          { length: 5 },
                          (_, i) => new Date().getFullYear() - i
                        ).map((year) => ({
                          value: year.toString(),
                          label: year.toString(),
                        }))}
                        placeholder="Select year"
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiType className="h-4 w-4 text-indigo-500" />
                        Type
                      </Label>
                      <Select
                        value={compilationParams.compile_type}
                        onValueChange={(value: "PROVISIONAL" | "FINAL") =>
                          setCompilationParams((prev) => ({
                            ...prev,
                            compile_type: value,
                          }))
                        }
                        options={[
                          { value: "PROVISIONAL", label: "Provisional" },
                          { value: "FINAL", label: "Final" },
                        ]}
                        placeholder="Select type"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* File Upload Area */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FiUploadCloud className="h-4 w-4 text-sky-500" />
                        Upload Files
                      </h3>
                      <p className="text-sm text-gray-500">
                        Drag & drop or click to browse
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-sky-50 text-sky-700"
                    >
                      Max 100MB
                    </Badge>
                  </div>

                  <div
                    className={`relative border-3 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                      zipFile
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-gray-300 hover:border-sky-400 hover:bg-sky-50/30"
                    } ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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

                    <div className="space-y-5">
                      <div className="relative inline-flex">
                        <div
                          className={`p-5 rounded-full inline-flex ${
                            zipFile
                              ? "bg-gradient-to-br from-emerald-100 to-green-100 shadow-lg"
                              : "bg-gradient-to-br from-sky-100 to-blue-100"
                          }`}
                        >
                          {zipFile ? (
                            <FiCheckCircle className="h-12 w-12 text-emerald-600" />
                          ) : (
                            <FiUploadCloud className="h-12 w-12 text-sky-600" />
                          )}
                        </div>
                      </div>

                      {zipFile ? (
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-lg text-gray-900 truncate">
                              {zipFile.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(zipFile.size)}
                            </p>
                          </div>
                          <div className="flex justify-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearUpload();
                              }}
                              disabled={isUploading}
                              className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-700 font-medium text-lg">
                            Drop your ZIP file here
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            or{" "}
                            <span className="text-sky-600 font-semibold">
                              click to browse
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-3">
                            Supports .zip files containing parquet data
                          </p>
                        </div>
                      )}
                    </div>

                    {isUploading && (
                      <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <FiLoader className="animate-spin text-sky-500 text-4xl mx-auto" />
                          <div>
                            <p className="font-semibold text-gray-800">
                              Uploading...
                            </p>
                            <p className="text-sm text-gray-500">
                              Please wait while we process your file
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-compile toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div className="space-y-0.5">
                    <Label className="font-medium">
                      Auto-start Compilation
                    </Label>
                    <p className="text-sm text-gray-500">
                      Automatically compile after successful validation
                    </p>
                  </div>
                  <Switch
                    checked={autoCompile}
                    onCheckedChange={setAutoCompile}
                  />
                </div>
              </CardContent>

              <CardFooter className="bg-gray-50 border-t pt-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button
                    onClick={startUploadSession}
                    disabled={isUploading || !zipFile}
                    className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-lg"
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <FiLoader className="animate-spin mr-3" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiPlayCircle className="mr-3 h-5 w-5" />
                        Start Upload Process
                        <FiChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  {zipFile && !isUploading && (
                    <Button
                      variant="outline"
                      onClick={clearUpload}
                      size="lg"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <FiRefreshCw className="mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Validation Status Card */}
            {uploadSession && (
              <Card className="border shadow-lg bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg">
                        {getStatusIcon(uploadSession.status, "h-5 w-5")}
                      </div>
                      <span>Validation Results</span>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`${getStatusColor(uploadSession.status)} px-4 py-1.5 font-medium`}
                      >
                        {uploadSession.status}
                      </Badge>
                      {uploadDuration && (
                        <span className="text-sm text-gray-500">
                          {uploadDuration}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    Processed {totalFiles} files with {successFiles} successful
                    and {errorFiles} failed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {/* Progress Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border border-emerald-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-emerald-700">
                            Success
                          </span>
                          <FiCheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                        <p className="text-3xl font-bold text-emerald-900">
                          {successFiles}
                        </p>
                        <div className="mt-3 h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${(successFiles / totalFiles) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-xl border border-rose-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-rose-700">
                            Failed
                          </span>
                          <FiXCircle className="h-5 w-5 text-rose-500" />
                        </div>
                        <p className="text-3xl font-bold text-rose-900">
                          {errorFiles}
                        </p>
                        <div className="mt-3 h-2 bg-rose-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${(errorFiles / totalFiles) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-sky-50 to-white p-5 rounded-xl border border-sky-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-sky-700">
                            Progress
                          </span>
                          <FiActivity className="h-5 w-5 text-sky-500" />
                        </div>
                        <p className="text-3xl font-bold text-sky-900">
                          {Math.round((successFiles / totalFiles) * 100)}%
                        </p>
                        <Progress
                          value={(successFiles / totalFiles) * 100}
                          className="mt-3 h-2 bg-sky-100"
                        />
                      </div>
                    </div>

                    {/* Status Messages */}
                    {hasValidationErrors && (
                      <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                        <FiAlertCircle className="h-5 w-5 text-amber-600" />
                        <AlertTitle className="text-amber-800">
                          Validation Issues Detected
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 flex items-center justify-between">
                          <span>
                            {uploadSession.failed_files} files require attention
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => setShowValidationDetails(true)}
                          >
                            <FiEye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {isReadyForCompilation && !autoCompile && (
                      <Alert className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
                        <FiCheckCircle className="h-5 w-5 text-emerald-600" />
                        <AlertTitle className="text-emerald-800">
                          Ready for Compilation
                        </AlertTitle>
                        <AlertDescription className="text-emerald-700">
                          All files validated successfully. Ready to compile.
                          {uploadDuration && (
                            <span className="ml-2 text-emerald-600">
                              • Upload took {uploadDuration}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compilation Progress Card */}
            {isCompiling && compilationStatus && (
              <Card className="border shadow-lg bg-gradient-to-br from-white to-indigo-50/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <FiDatabase className="h-6 w-6 text-white" />
                      </div>
                      <span>Compilation Progress</span>
                    </CardTitle>
                    <Badge
                      className={`${getStatusColor(compilationStatus.status)} px-4 py-1.5 font-medium`}
                    >
                      {compilationStatus.progress}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Overall Progress
                      </span>
                      <span className="font-bold text-indigo-700">
                        {compilationStatus.progress}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${compilationStatus.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Current Stage:{" "}
                      <span className="font-medium text-indigo-700">
                        {compilationStatus.current_stage}
                      </span>
                      {compilationStatus.stage_details && (
                        <span className="ml-2 text-gray-400">
                          • {compilationStatus.stage_details}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Stages */}
                  <div className="space-y-4">
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <FiGrid className="h-4 w-4 text-gray-400" />
                      Processing Stages
                    </p>
                    <div className="space-y-2">
                      {compilationStatus.stages?.map((stage, index) => (
                        <Collapsible
                          key={stage.name}
                          open={expandedStage === stage.name}
                          onOpenChange={(open) =>
                            setExpandedStage(open ? stage.name : null)
                          }
                          className="border rounded-xl overflow-hidden hover:border-indigo-200 transition-colors"
                        >
                          <CollapsibleTrigger>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                                    stage.status === "completed"
                                      ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20"
                                      : stage.status === "in_progress"
                                        ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500/20"
                                        : stage.status === "failed"
                                          ? "bg-rose-100 text-rose-600 ring-2 ring-rose-500/20"
                                          : "bg-gray-100 text-gray-400 ring-2 ring-gray-500/10"
                                  }`}
                                >
                                  {stage.status === "completed" && (
                                    <FiCheckCircle className="h-5 w-5" />
                                  )}
                                  {stage.status === "in_progress" && (
                                    <FiLoader className="h-5 w-5 animate-spin" />
                                  )}
                                  {stage.status === "failed" && (
                                    <FiXCircle className="h-5 w-5" />
                                  )}
                                  {stage.status === "pending" && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                  )}

                                  {/* Stage number */}
                                  <div className="absolute -top-1 -right-1 bg-white border rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-gray-900">
                                    {stage.name}
                                  </p>
                                  <div className="flex items-center gap-3 text-sm text-gray-500">
                                    {stage.status === "completed" &&
                                      stage.duration && (
                                        <span>
                                          Completed in{" "}
                                          {stage.duration.toFixed(1)}s
                                        </span>
                                      )}
                                    {stage.status === "in_progress" && (
                                      <span className="text-indigo-600 font-medium">
                                        Processing...
                                      </span>
                                    )}
                                    {stage.status === "pending" && (
                                      <span>Waiting to start</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {expandedStage === stage.name ? (
                                <FiChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 text-sm text-gray-600">
                              {stage.details ? (
                                <p>{stage.details}</p>
                              ) : (
                                <p className="text-gray-500">
                                  No additional details available.
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  {compilationStatus.metrics && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Records</p>
                        <p className="text-xl font-bold text-gray-900">
                          {compilationStatus.metrics.total_records.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-xl font-bold text-emerald-700">
                          {compilationStatus.metrics.success_rate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Processing Time</p>
                        <p className="text-xl font-bold text-indigo-700">
                          {formatTime(
                            compilationStatus.metrics.processing_time
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Actions & Tracking */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-sky-100 to-blue-100 rounded-lg">
                    <FiPlayCircle className="h-5 w-5 text-sky-600" />
                  </div>
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>Control your workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full justify-start bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
                  onClick={startCompilation}
                  disabled={!isReadyForCompilation || isCompiling}
                  size="lg"
                >
                  <FiDatabase className="mr-3 h-5 w-5" />
                  <div className="text-left flex-1">
                    <div className="font-semibold">Start Compilation</div>
                    <div className="text-sm font-normal opacity-90">
                      {isReadyForCompilation
                        ? "Ready to compile"
                        : "Validate files first"}
                    </div>
                  </div>
                  <FiChevronRight className="ml-auto h-5 w-5" />
                </Button>

                {compilationStatus?.result_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-emerald-200 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800"
                    onClick={() =>
                      window.open(compilationStatus.result_url, "_blank")
                    }
                  >
                    <FiDownload className="mr-3 h-5 w-5" />
                    Download Results
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-gray-50"
                  onClick={() => navigate("/compilation/compilation_index")}
                >
                  <FiBarChart2 className="mr-3 h-5 w-5" />
                  View History
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  onClick={clearUpload}
                  disabled={isUploading || isCompiling}
                >
                  <FiRefreshCw className="mr-3 h-5 w-5" />
                  Start New Process
                </Button>
              </CardContent>
            </Card>

            {/* Process Timeline */}
            <Card className="border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiClock className="h-5 w-5 text-gray-500" />
                  Process Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Upload Status
                      </span>
                      <Badge
                        className={getStatusColor(
                          uploadSession?.status || "PENDING"
                        )}
                      >
                        {uploadSession?.status || "Not Started"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Files Processed
                      </span>
                      <span className="font-bold">
                        {successFiles}/{totalFiles || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Compilation Status
                      </span>
                      <Badge
                        className={getStatusColor(
                          compilationStatus?.status || "PENDING"
                        )}
                      >
                        {compilationStatus?.status || "Not Started"}
                      </Badge>
                    </div>

                    {/* Timing Metrics */}
                    {processStats.uploadStartTime && (
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Upload Duration
                          </span>
                          <span className="font-medium text-gray-900">
                            {uploadDuration || "In progress..."}
                          </span>
                        </div>
                        {processStats.compileStartTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Compile Duration
                            </span>
                            <span className="font-medium text-gray-900">
                              {compileDuration || "In progress..."}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Legend */}
            <Card className="border shadow-lg bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Status Legend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-gray-600">
                    Success / Complete
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-gray-600">
                    Pending / Waiting
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-sm text-gray-600">Failed / Error</span>
                </div>
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

            <div className="space-y-4">
              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    Total Files
                  </p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {totalFiles}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <p className="text-sm text-emerald-700 font-medium">
                    Success
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">
                    {successFiles}
                  </p>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                  <p className="text-sm text-rose-700 font-medium">Failed</p>
                  <p className="text-2xl font-bold text-rose-900 mt-1">
                    {errorFiles}
                  </p>
                </div>
              </div>

              {/* File Progress List */}
              <div className="space-y-3">
                {uploadStatuses.map((file,) => (
                  <div
                    key={file.file_id}
                    className="border rounded-xl p-4 hover:bg-gray-50/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(file.status)}
                        <div>
                          <span className="font-medium text-gray-900 truncate block max-w-xs">
                            {file.file_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {file.size}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={`
                          ${
                            file.status === "success"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : file.status === "error"
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : "bg-sky-100 text-sky-700 border-sky-200"
                          }
                        `}
                      >
                        {file.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{file.progress}%</span>
                        {file.message && (
                          <span
                            className={`font-medium ${
                              file.status === "error"
                                ? "text-rose-600"
                                : "text-gray-600"
                            }`}
                          >
                            {file.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isPolling && (
                <div className="text-center py-6 border-t">
                  <div className="relative inline-flex">
                    <FiLoader className="animate-spin text-sky-500 text-4xl" />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Processing files...
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={isPolling}
                className="border-gray-300 hover:bg-gray-50"
              >
                {isPolling ? "Processing..." : "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Validation Details Modal */}
        <Dialog
          open={showValidationDetails}
          onOpenChange={setShowValidationDetails}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Validation Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {uploadStatuses
                .filter((f) => f.status === "error")
                .map((file) => (
                  <div
                    key={file.file_id}
                    className="border border-rose-200 rounded-xl p-4 bg-gradient-to-r from-rose-50/50 to-white"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-rose-100 rounded-lg">
                        <FiXCircle className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">
                          {file.file_name}
                        </span>
                        <p className="text-sm text-rose-700 mt-1">
                          {file.message}
                        </p>
                      </div>
                    </div>
                    {file.error_details && (
                      <Collapsible
                        open={false}
                        onOpenChange={() => {}}
                        className="border rounded-lg bg-rose-50/50 hover:bg-rose-50 transition-colors"
                      >
                        <CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <FiChevronDown className="mr-2 h-4 w-4" />
                            View Error Details
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre className="mt-3 text-xs bg-rose-50 p-3 rounded-lg overflow-auto max-h-40">
                            {JSON.stringify(file.error_details, null, 2)}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowValidationDetails(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
