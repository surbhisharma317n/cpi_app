"use client";

import React, { useState,  useEffect, useRef } from "react";
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

  FiTrash2,

  FiChevronRight,
 
  FiGrid,
 
  FiSettings,
} from "react-icons/fi";
import { Button } from "../../components/ui2/button";
import { useToast } from "../../hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui2/dialog";
import { useNavigate } from "react-router-dom";
// import { useAppDispatch, useAppSelector } from "../../app/hooks";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui2/card";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui2/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  // SelectContent,
  // SelectItem,
  // SelectTrigger,
  // SelectValue,
} from "../../components/ui2/select";
// import { Input } from "../../components/ui2/input";
import { Label } from "../../components/ui2/label";
// import {
//   Alert,
//   AlertDescription,
//   AlertTitle,
// } from "../../components/ui2/alert";
import { Separator } from "../../components/ui2/separator";

// Import TanStack React Table

import { Table, TableHeader, TableRow, TableBody, TableCell, TableHead } from "../../components/ui1/table";

const API_BASE = "http://localhost:8000/api";

// Types
interface UploadStatus {
  file_id: string;
  file_name: string;
  status: "pending" | "uploading" | "validating" | "success" | "error" | "warning";
  progress: number;
  size: string;
  message?: string;
  validation_result?: any;
  error_details?: any;
}

interface CompilationStatus {
  task_id: string;
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  progress: number;
  current_stage: string;
  result_url?: string;
  error_message?: string;
  error_details?: any;
  started_at: string;
  completed_at?: string;
  stages: Array<{
    name: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    started_at?: string;
    completed_at?: string;
    duration?: number;
  }>;
}

interface UploadSession {
  session_id: string;
  status: "PENDING" | "UPLOADING" | "VALIDATING" | "VALIDATED" | "FAILED" | "READY";
  total_files: number;
  processed_files: number;
  failed_files: number;
  validation_summary: any;
  file_statuses: UploadStatus[];
  created_at: string;
  updated_at: string;
}

// TanStack Table columns for file status
// const fileStatusColumns: ColumnDef<UploadStatus>[] = [
//   {
//     accessorKey: "file_name",
//     header: "File Name",
//     cell: ({ row }) => (
//       <div className="flex items-center space-x-3">
//         <FiFile className="h-4 w-4 text-gray-400" />
//         <div>
//           <p className="font-medium text-sm text-gray-900">{row.original.file_name}</p>
//           <p className="text-xs text-gray-500">{row.original.size}</p>
//         </div>
//       </div>
//     ),
//   },
//   {
//     accessorKey: "status",
//     header: "Status",
//     cell: ({ row }) => {
//       const status = row.original.status;
//       const variant = status === "success" ? "success" :
//         status === "error" ? "destructive" :
//           status === "warning" ? "warning" : "secondary";
      
//       const statusIcons = {
//         success: <FiCheckCircle className="h-4 w-4 mr-2" />,
//         error: <FiXCircle className="h-4 w-4 mr-2" />,
//         warning: <FiAlertCircle className="h-4 w-4 mr-2" />,
//         uploading: <FiLoader className="h-4 w-4 mr-2 animate-spin" />,
//         validating: <FiLoader className="h-4 w-4 mr-2 animate-spin" />,
//         pending: <FiLoader className="h-4 w-4 mr-2" />
//       };

//       return (
//         <Badge variant={variant} className="flex items-center w-fit">
//           {statusIcons[status] || statusIcons.pending}
//           {status.charAt(0).toUpperCase() + status.slice(1)}
//         </Badge>
//       );
//     },
//   },
//   {
//     accessorKey: "progress",
//     header: "Progress",
//     cell: ({ row }) => (
//       <div className="w-32">
//         <div className="flex justify-between text-xs text-gray-500 mb-1">
//           <span>{row.original.status === "success" ? "Complete" : "In Progress"}</span>
//           <span>{row.original.progress}%</span>
//         </div>
//         <Progress value={row.original.progress} className="h-2" />
//       </div>
//     ),
//   },
//   {
//     accessorKey: "message",
//     header: "Message",
//     cell: ({ row }) => (
//       <p className="text-sm text-gray-600 max-w-xs truncate">
//         {row.original.message || "—"}
//       </p>
//     ),
//   },
// ];

// Main Component
export default function UploadPage() {
  const { toast } = useToast();
  
  const navigate = useNavigate();
  
  // State
  const [uploadType, ] = useState<"single" | "zip">("zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus | null>(null);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [, setShowCompilationModal] = useState(false);
  
  // Process states
  const [isUploading, setIsUploading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  
  // Compilation parameters
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const [compilationParams, setCompilationParams] = useState({
    month: now.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    year: now.getFullYear(),
    compile_type: "PROVISIONAL" as "PROVISIONAL" | "FINAL",
    data_source: "UPLOADED" as "UPLOADED" | "DATABASE",
  });

  // Refs
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const uploadTaskIdRef = useRef<string | null>(null);
  const compilationTaskIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // File handlers
  const handleZipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".parquet.zip")) {
      toast({
        title: "Invalid File",
        description: "Please upload a ZIP file containing parquet files",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      });
      return;
    }
    
    setZipFile(file);
    
    // Initialize upload status
    setUploadStatuses([
      {
        file_id: `zip-${Date.now()}`,
        file_name: file.name,
        status: "pending",
        progress: 0,
        size: formatFileSize(file.size),
      },
    ]);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
    setZipFile(null);
    setUploadStatuses([]);
    setUploadSession(null);
    localStorage.removeItem("lastUploadSession");
    uploadTaskIdRef.current = null;
  };

  // Upload Process
  const startUploadSession = async () => {
    if (uploadType === "zip" && !zipFile) {
      toast({
        title: "No File Selected",
        description: "Please select a ZIP file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setShowUploadModal(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required. Please login.");
      }

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
          upload_type: uploadType.toUpperCase(),
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create upload session");
      }

      const { session_id } = await sessionResponse.json();
      uploadTaskIdRef.current = session_id;

      // Start file upload
      await uploadFiles(session_id);
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
        icon: <FiXCircle />,
      });
      setIsUploading(false);
    }
  };

  const uploadFiles = async (sessionId: string) => {
    if (!zipFile) return;

    try {
      const formData = new FormData();
      formData.append("file", zipFile);
      formData.append("session_id", sessionId);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadStatuses((prev) =>
            prev.map((status) => ({
              ...status,
              progress,
              status: progress < 100 ? "uploading" : "validating",
              message: progress < 100 ? "Uploading..." : "Validating...",
            }))
          );
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error("Invalid response from server"));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.detail || `Upload failed: ${xhr.statusText}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.ontimeout = () => reject(new Error("Upload timeout"));
        
        xhr.open("POST", `${API_BASE}/uploads/sessions/upload-file/`);
        xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("authToken")}`);
        xhr.timeout = 300000;
        xhr.send(formData);
      });

      await uploadPromise;
      startPollingUploadStatus(sessionId);

      toast({
        title: "Upload Started",
        description: "Files are being uploaded and validated",
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
  const startPollingUploadStatus = (sessionId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    setIsPolling(true);
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/uploads/status/${sessionId}/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch upload status");
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

          if (data.status === "VALIDATED") {
            toast({
              title: "Upload Complete",
              description: "All files validated successfully",
              icon: <FiCheckCircle className="text-green-500" />,
            });
          } else {
            toast({
              title: "Upload Completed with Errors",
              description: `${data.failed_files} file(s) failed validation`,
              variant: "destructive",
              icon: <FiAlertCircle />,
            });
          }

          localStorage.setItem("lastUploadSession", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
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
    setShowCompilationModal(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required. Please login.");
      }

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
          data_source: compilationParams.data_source,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start compilation");
      }

      const data = await response.json();
      compilationTaskIdRef.current = data.task_id;

      startPollingCompilationStatus(data.task_id);

      toast({
        title: "Compilation Started",
        description: "Data compilation is in progress",
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
      setShowCompilationModal(false);
    }
  };

  // Polling for compilation status
  const startPollingCompilationStatus = (taskId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    setIsPolling(true);
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

        if (!response.ok) {
          throw new Error("Failed to fetch compilation status");
        }

        const data = await response.json();
        setCompilationStatus(data);

        if (data.status === "SUCCESS" || data.status === "FAILURE") {
          clearInterval(pollingInterval.current!);
          setIsPolling(false);
          setIsCompiling(false);

          if (data.status === "SUCCESS") {
            toast({
              title: "Compilation Complete",
              description: "Data has been compiled successfully",
              icon: <FiCheckCircle className="text-green-500" />,
            });
            setTimeout(() => {
              navigate("/compilation/compilation_index");
            }, 2000);
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
    }, 3000);
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
  const processedFiles = uploadSession?.processed_files || 0;
  const successFiles = uploadStatuses.filter(f => f.status === "success").length;
  const uploadProgress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
  const isReadyForCompilation = uploadSession?.status === "VALIDATED";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className=" space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Upload & Compilation</h1>
            <p className="text-gray-600">Upload ZIP files and compile indices</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              <FiSettings className="mr-2 h-4 w-4" />
              {compilationParams.month} {compilationParams.year}
            </Badge>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Parameters & Upload */}
          <div className="lg:col-span-1 space-y-6">
            {/* Parameters Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FiSettings className="mr-2 h-5 w-5" />
                  Compilation Parameters
                </CardTitle>
                <CardDescription>
                  Configure settings for data compilation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="month">Month</Label>
      <Select
        value={compilationParams.month}
        onValueChange={(value) =>
          setCompilationParams((prev) => ({
            ...prev,
            month: value,
          }))
        }
        options={[
          "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
        ].map(month => ({
          value: month,
          label: month
        }))}
        placeholder="Select month"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="year">Year</Label>
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
        ).map(year => ({
          value: year.toString(),
          label: year.toString()
        }))}
        placeholder="Select year"
      />
    </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="compile_type">Type</Label>
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
          { value: "FINAL", label: "Final" }
        ]}
        placeholder="Select type"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="data_source">Source</Label>
      <Select
        value={compilationParams.data_source}
        onValueChange={(value: "UPLOADED" | "DATABASE") =>
          setCompilationParams((prev) => ({
            ...prev,
            data_source: value,
          }))
        }
        options={[
          { value: "UPLOADED", label: "Upload Files" },
          { value: "DATABASE", label: "Stored Data" }
        ]}
        placeholder="Select source"
      />
    </div>
  </div>

  <Separator />

  {/* File Upload Section */}
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Upload ZIP File</Label>
      <Badge variant="secondary">Max 100MB</Badge>
    </div>

    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
        zipFile
          ? "border-green-500 bg-green-50"
          : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
      }`}
      onClick={handleFileSelect}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleZipUpload}
        accept=".zip,.parquet.zip"
        className="hidden"
      />
      <FiPackage
        className={`mx-auto text-4xl mb-4 ${
          zipFile ? "text-green-500" : "text-gray-400"
        }`}
      />
      {zipFile ? (
        <div className="space-y-2">
          <p className="font-medium text-green-700 truncate">
            {zipFile.name}
          </p>
          <p className="text-sm text-gray-500">
            {formatFileSize(zipFile.size)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              clearUpload();
            }}
            className="mt-2"
          >
            <FiTrash2 className="mr-2 h-4 w-4" />
            Remove File
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 font-medium">Click to select ZIP file</p>
          <p className="text-sm text-gray-500 mt-1">
            Supports .zip files with parquet files
          </p>
        </div>
      )}
    </div>

    {uploadStatuses.length > 0 && (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Upload Progress</span>
          <span>{successFiles}/{uploadStatuses.length} files</span>
        </div>
        <Progress value={uploadProgress} />
      </div>
    )}

    <Button
      onClick={startUploadSession}
      disabled={isUploading || !zipFile || isPolling}
      className="w-full bg-blue-600 hover:bg-blue-700"
      size="lg"
    >
      {isUploading || isPolling ? (
        <>
          <FiLoader className="animate-spin mr-2" />
          {isUploading ? "Uploading..." : "Processing..."}
        </>
      ) : (
        <>
          <FiUploadCloud className="mr-2" />
          Upload & Validate
        </>
      )}
    </Button>
  </div>
</CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FiGrid className="mr-2 h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={startCompilation}
                  disabled={!isReadyForCompilation || isCompiling}
                >
                  <FiDatabase className="mr-2" />
                  Start Compilation
                  {isReadyForCompilation && (
                    <FiChevronRight className="ml-auto h-4 w-4" />
                  )}
                </Button>
                {compilationStatus?.result_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {/* Download logic */}}
                  >
                    <FiDownload className="mr-2" />
                    Download Results
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Progress & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Upload Status</p>
                      <p className="text-2xl font-bold mt-1">
                        {uploadSession?.status === "VALIDATED"
                          ? "Ready"
                          : uploadSession?.status || "Waiting"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      uploadSession?.status === "VALIDATED"
                        ? "bg-green-100"
                        : "bg-blue-100"
                    }`}>
                      <FiUploadCloud className={`h-6 w-6 ${
                        uploadSession?.status === "VALIDATED"
                          ? "text-green-600"
                          : "text-blue-600"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Files Processed</p>
                      <p className="text-2xl font-bold mt-1">
                        {successFiles}/{totalFiles}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                      <FiFile className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Compilation</p>
                      <p className="text-2xl font-bold mt-1">
                        {compilationStatus?.status === "SUCCESS"
                          ? "Complete"
                          : compilationStatus?.status || "Pending"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      compilationStatus?.status === "SUCCESS"
                        ? "bg-green-100"
                        : compilationStatus?.status === "FAILURE"
                        ? "bg-red-100"
                        : "bg-purple-100"
                    }`}>
                      <FiDatabase className={`h-6 w-6 ${
                        compilationStatus?.status === "SUCCESS"
                          ? "text-green-600"
                          : compilationStatus?.status === "FAILURE"
                          ? "text-red-600"
                          : "text-purple-600"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upload Progress Table */}
            {uploadStatuses.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Upload Progress</CardTitle>
                    <Badge variant={
                      uploadSession?.status === "VALIDATED"
                        ? "success"
                        : uploadSession?.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                    }>
                      {uploadSession?.status || "Pending"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Real-time file upload and validation status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadStatuses.map((file) => (
                          <TableRow key={file.file_id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <FiFile className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="font-medium text-sm">{file.file_name}</p>
                                  <p className="text-xs text-gray-500">{file.size}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                file.status === "success" ? "success" :
                                file.status === "error" ? "destructive" :
                                file.status === "warning" ? "warning" : "secondary"
                              }>
                                {file.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="w-32">
                                <Progress value={file.progress} className="h-2" />
                                <p className="text-xs text-gray-500 mt-1 text-center">
                                  {file.progress}%
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-600">{file.message || "—"}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compilation Progress */}
            {(isCompiling || compilationStatus) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Compilation Progress</CardTitle>
                    <Badge
                      variant={
                        compilationStatus?.status === "SUCCESS"
                          ? "success"
                          : compilationStatus?.status === "FAILURE"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {compilationStatus?.status || "Starting..."}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {compilationStatus ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Progress</span>
                          <span>{compilationStatus.progress}%</span>
                        </div>
                        <Progress value={compilationStatus.progress} className="h-3" />
                        <p className="text-sm text-gray-500">
                          Current Stage: {compilationStatus.current_stage}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <p className="font-medium">Compilation Stages</p>
                        {compilationStatus.stages?.map((stage, _index) => (
                          <div key={stage.name} className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              stage.status === "completed" ? "bg-green-100 text-green-600" :
                              stage.status === "in_progress" ? "bg-blue-100 text-blue-600 animate-pulse" :
                              stage.status === "failed" ? "bg-red-100 text-red-600" :
                              "bg-gray-100 text-gray-400"
                            }`}>
                              {stage.status === "completed" && <FiCheckCircle className="h-4 w-4" />}
                              {stage.status === "in_progress" && <FiLoader className="h-4 w-4 animate-spin" />}
                              {stage.status === "failed" && <FiXCircle className="h-4 w-4" />}
                              {stage.status === "pending" && <div className="w-2 h-2 rounded-full bg-gray-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{stage.name}</p>
                              {stage.duration && (
                                <p className="text-sm text-gray-500">{stage.duration}s</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FiLoader className="animate-spin text-gray-400 text-4xl mx-auto mb-4" />
                      <p className="text-gray-500">Starting compilation...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Upload Progress Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Progress</DialogTitle>
            <DialogDescription>
              Tracking file upload and validation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">Total Files</p>
                <p className="text-2xl font-bold">{totalFiles}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700">Success</p>
                <p className="text-2xl font-bold">{successFiles}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">Failed</p>
                <p className="text-2xl font-bold">{uploadSession?.failed_files || 0}</p>
              </div>
            </div>

            <div className="space-y-3">
              {uploadStatuses.map((file) => (
                <div key={file.file_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {file.status === "success" && <FiCheckCircle className="text-green-500" />}
                      {file.status === "error" && <FiXCircle className="text-red-500" />}
                      {["uploading", "validating"].includes(file.status) && (
                        <FiLoader className="animate-spin text-blue-500" />
                      )}
                      <span className="font-medium">{file.file_name}</span>
                    </div>
                    <Badge variant={
                      file.status === "success" ? "success" :
                      file.status === "error" ? "destructive" : "secondary"
                    }>
                      {file.status}
                    </Badge>
                  </div>
                  <Progress value={file.progress} className="h-2" />
                  {file.message && (
                    <p className="text-sm text-gray-600 mt-2">{file.message}</p>
                  )}
                </div>
              ))}
            </div>

            {isPolling && (
              <div className="text-center py-4">
                <FiLoader className="animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Processing files...</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}