"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useAppDispatch } from "../../app/hooks";
import { compileIndexData } from "../../features/compilation/compileSlice";
// import ExportSampleButton from "../../components/ui/ExportSampleButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui2/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui1/table";
import { Progress } from "../../components/ui2/progress";
import { Badge } from "../../components/ui2/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui2/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui2/select";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// Types
// interface UploadFile {
//   name: string;
//   size: number;
//   type: string;
//   lastModified: number;
// }

interface ValidationResult {
  file_name: string;
  status: "success" | "failed" | "error" | "processing";
  message: string;
  missing_columns: string[];
  extra_columns: string[];
  row_count: number;
  file_size: string;
  processed_at?: string;
}

interface CompilationStatus {
  task_id: string;
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  progress: number;
  current_stage: string;
  result_url?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface UploadStatus {
  file_name: string;
  status: "uploading" | "validating" | "success" | "error";
  progress: number;
  size: string;
  message?: string;
}

// Components
const UploadStatusTable = ({ statuses }: { statuses: UploadStatus[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>File</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Progress</TableHead>
        <TableHead>Size</TableHead>
        <TableHead>Message</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {statuses.map((status, index) => (
        <TableRow key={index}>
          <TableCell className="font-medium">{status.file_name}</TableCell>
          <TableCell>
            <Badge
              variant={
                status.status === "success"
                  ? "success"
                  : status.status === "error"
                  ? "destructive"
                  : "secondary"
              }
            >
              {status.status}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Progress value={status.progress} className="w-full" />
              <span className="text-sm text-gray-500">{status.progress}%</span>
            </div>
          </TableCell>
          <TableCell>{status.size}</TableCell>
          <TableCell className="text-sm text-gray-500">{status.message || "-"}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const ValidationResultsTable = ({ results }: { results: ValidationResult[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>File Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Rows</TableHead>
        <TableHead>Missing Columns</TableHead>
        <TableHead>Message</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {results.map((result, index) => (
        <TableRow key={index}>
          <TableCell className="font-medium">{result.file_name}</TableCell>
          <TableCell>
            <Badge
              variant={
                result.status === "success"
                  ? "success"
                  : result.status === "failed"
                  ? "destructive"
                  : "secondary"
              }
            >
              {result.status}
            </Badge>
          </TableCell>
          <TableCell>{result.row_count.toLocaleString()}</TableCell>
          <TableCell>
            {result.missing_columns.length > 0 ? (
              <div className="text-sm text-red-500">
                {result.missing_columns.join(", ")}
              </div>
            ) : (
              <span className="text-sm text-green-500">All present</span>
            )}
          </TableCell>
          <TableCell className="text-sm">{result.message}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const CompilationProgress = ({ status }: { status: CompilationStatus }) => {
  const getStageColor = (stage: string) => {
    const stages = [
      { name: "Initialization", color: "bg-blue-500" },
      { name: "Data Extraction", color: "bg-purple-500" },
      { name: "Validation", color: "bg-yellow-500" },
      { name: "Processing", color: "bg-indigo-500" },
      { name: "Index Calculation", color: "bg-green-500" },
      { name: "Finalization", color: "bg-teal-500" },
    ];
    return stages.find(s => s.name === stage)?.color || "bg-gray-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compilation Progress</CardTitle>
        <CardDescription>Task ID: {status.task_id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Current Stage</span>
            <span className="font-medium">{status.current_stage}</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {["Initialization", "Processing", "Finalization"].map((stage) => (
            <div
              key={stage}
              className={`p-3 rounded text-center text-sm ${
                status.current_stage === stage
                  ? `${getStageColor(stage)} text-white`
                  : "bg-gray-100"
              }`}
            >
              {stage}
            </div>
          ))}
        </div>
        
        {status.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{status.error_message}</p>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          Started: {new Date(status.started_at).toLocaleTimeString()}
          {status.completed_at && (
            <> • Completed: {new Date(status.completed_at).toLocaleTimeString()}</>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function UploadPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // State
  const [uploadType, setUploadType] = useState<"single" | "zip">("zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [singleFiles, _setSingleFiles] = useState<Record<string, File | null>>({});
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus | null>(null);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showCompilationModal, setShowCompilationModal] = useState(false);
  
  // Process states
  const [isUploading, setIsUploading] = useState(false);
  const [_isValidating, setIsValidating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  
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
  const taskIdRef = useRef<string | null>(null);

  // File handlers
  const handleZipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.zip') && !file.name.endsWith('.parquet.zip')) {
      toast({
        title: "Invalid File",
        description: "Please upload a ZIP file containing parquet files",
        variant: "destructive",
      });
      return;
    }
    
    setZipFile(file);
    
    // Initialize upload status
    setUploadStatuses([{
      file_name: file.name,
      status: "uploading",
      progress: 0,
      size: formatFileSize(file.size),
    }]);
  };

  // const handleSingleFileUpload = (field: string, file: File | null) => {
  //   setSingleFiles(prev => ({ ...prev, [field]: file }));
  // };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload Process
  const handleUpload = async () => {
    if (uploadType === "zip" && !zipFile) {
      toast({
        title: "No File Selected",
        description: "Please select a ZIP file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setShowUploadModal(true);

    try {
      const formData = new FormData();
      
      if (uploadType === "zip") {
        formData.append("zip_file", zipFile!);
      } else {
        Object.entries(singleFiles).forEach(([field, file]) => {
          if (file) formData.append(field, file);
        });
      }

      // Add metadata
      formData.append("upload_type", uploadType);
      formData.append("month", compilationParams.month);
      formData.append("year", compilationParams.year.toString());
      formData.append("compile_type", compilationParams.compile_type);

      const token = localStorage.getItem("authToken");
      
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadStatuses(prev => prev.map(status => ({
            ...status,
            progress,
            status: progress < 100 ? "uploading" : "validating"
          })));
        }
      });

      const uploadPromise = new Promise<{ task_id: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error("Upload failed"));
        
        xhr.open("POST", `${API_BASE}/upload-data/`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });

      const result = await uploadPromise;
      taskIdRef.current = result.task_id;

      // Start polling for upload status
      startPollingUploadStatus(result.task_id);

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
    }
  };

  // Polling for upload status
  const startPollingUploadStatus = (taskId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/upload-status/${taskId}/`);
        const data = await response.json();

        if (data.status === "SUCCESS") {
          // Upload complete, proceed to validation
          clearInterval(pollingInterval.current!);
          setUploadStatuses(prev => prev.map(status => ({
            ...status,
            status: "success",
            progress: 100
          })));
          setIsUploading(false);
          handleValidation(data.result.validation_results);
        } else if (data.status === "FAILURE") {
          clearInterval(pollingInterval.current!);
          setUploadStatuses(prev => prev.map(status => ({
            ...status,
            status: "error",
            message: data.error_message
          })));
          setIsUploading(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  // Validation Process
  const handleValidation = (results: ValidationResult[]) => {
    setValidationResults(results);
    setShowUploadModal(false);
    setShowValidationModal(true);
    setIsValidating(false);
    
    const allValid = results.every(r => r.status === "success");
    
    toast({
      title: allValid ? "Validation Successful" : "Validation Completed",
      description: allValid 
        ? "All files validated successfully" 
        : "Some files failed validation. Please review.",
      icon: allValid ? <FiCheckCircle /> : <FiAlertCircle />,
      variant: allValid ? "default" : "destructive",
    });
  };

  // Compilation Process
  const handleCompile = async () => {
    if (!taskIdRef.current) {
      toast({
        title: "No Upload Task",
        description: "Please upload files first",
        variant: "destructive",
      });
      return;
    }

    setIsCompiling(true);
    setShowValidationModal(false);
    setShowCompilationModal(true);

    try {
      const token = localStorage.getItem("authToken");
      
      const response = await fetch(`${API_BASE}/start-compilation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_id: taskIdRef.current,
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
          data_source: compilationParams.data_source,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Compilation start failed");
      }

      setCompilationStatus(data);
      startPollingCompilationStatus(data.task_id);

      toast({
        title: "Compilation Started",
        description: "Data compilation is in progress",
        icon: <FiDatabase />,
      });

      // Also dispatch to Redux if needed
      dispatch(
        compileIndexData({
          month: compilationParams.month,
          year: compilationParams.year,
          compile_type: compilationParams.compile_type,
        })
      );

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
        const response = await fetch(`${API_BASE}/compilation-status/${taskId}/`);
        const data = await response.json();

        setCompilationStatus(data);

        if (data.status === "SUCCESS") {
          clearInterval(pollingInterval.current!);
          setIsCompiling(false);
          
          toast({
            title: "Compilation Complete",
            description: "Data has been compiled successfully",
            icon: <FiCheckCircle className="text-green-500" />,
          });

          // Redirect after delay
          setTimeout(() => {
            navigate("/compilation/compilation_index");
          }, 2000);

        } else if (data.status === "FAILURE") {
          clearInterval(pollingInterval.current!);
          setIsCompiling(false);
          
          toast({
            title: "Compilation Failed",
            description: data.error_message || "Compilation failed",
            variant: "destructive",
            icon: <FiXCircle />,
          });
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

  // Render
  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <FiUploadCloud className="text-blue-600 text-3xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Data Upload & Compilation
            </h1>
            <p className="text-gray-500 text-sm">
              Upload data files for index compilation
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {/* Open export modal */}}
            className="flex items-center gap-2"
          >
            <FiDownload />
            Download Templates
          </Button>
          {/* <ExportSampleButton
           data_type="parquet" 
           fileName="data_templates"
           className="flex items-center gap-2"
            
          /> */}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Compilation Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Compilation Parameters</CardTitle>
            <CardDescription>Set the parameters for this compilation cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select
                  value={compilationParams.month}
                  onValueChange={(value) => setCompilationParams(prev => ({ ...prev, month: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select
                  value={compilationParams.year.toString()}
                  onValueChange={(value) => setCompilationParams(prev => ({ ...prev, year: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Compilation Type</label>
                <Select
                  value={compilationParams.compile_type}
                  onValueChange={(value: "PROVISIONAL" | "FINAL") => 
                    setCompilationParams(prev => ({ ...prev, compile_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROVISIONAL">Provisional</SelectItem>
                    <SelectItem value="FINAL">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Source</label>
                <Select
                  value={compilationParams.data_source}
                  onValueChange={(value: "UPLOADED" | "DATABASE") => 
                    setCompilationParams(prev => ({ ...prev, data_source: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPLOADED">Upload Files</SelectItem>
                    <SelectItem value="DATABASE">Use Stored Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Data Files</CardTitle>
            <CardDescription>
              Upload your data files in ZIP format containing Parquet files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as "single" | "zip")}>
              <TabsList className="mb-4">
                <TabsTrigger value="zip">
                  <FiPackage className="mr-2" />
                  ZIP Upload
                </TabsTrigger>
                <TabsTrigger value="single">
                  <FiFile className="mr-2" />
                  Individual Files
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="zip" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <FiPackage className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Drag & drop your ZIP file here</p>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <input
                    type="file"
                    accept=".zip,.parquet.zip"
                    onChange={handleZipUpload}
                    className="hidden"
                    id="zip-upload"
                  />
                  <label htmlFor="zip-upload">
                    <Button variant="outline" className="cursor-pointer">
                      Browse Files
                    </Button>
                  </label>
                  {zipFile && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium">
                        Selected: {zipFile.name} ({formatFileSize(zipFile.size)})
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="single">
                {/* Individual file upload UI */}
                <div className="text-center text-gray-500">
                  Individual file upload coming soon...
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={isUploading || (uploadType === "zip" && !zipFile)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Uploading...
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
      </div>

      {/* Upload Progress Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Progress</DialogTitle>
            <DialogDescription>
              Tracking upload and validation status
            </DialogDescription>
          </DialogHeader>
          
          <UploadStatusTable statuses={uploadStatuses} />
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Results Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Validation Results</DialogTitle>
            <DialogDescription>
              Review file validation before compilation
            </DialogDescription>
          </DialogHeader>
          
          <ValidationResultsTable results={validationResults} />
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Summary</h3>
              <Badge variant={
                validationResults.every(r => r.status === "success") 
                  ? "success" 
                  : "destructive"
              }>
                {validationResults.filter(r => r.status === "success").length} / {validationResults.length} Files Valid
              </Badge>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowValidationModal(false)}
            >
              Back
            </Button>
            <Button
              onClick={handleCompile}
              disabled={validationResults.some(r => r.status !== "success")}
              className="bg-green-600 hover:bg-green-700"
            >
              Proceed to Compilation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compilation Progress Modal */}
      <Dialog open={showCompilationModal} onOpenChange={setShowCompilationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compilation Progress</DialogTitle>
            <DialogDescription>
              Data compilation is in progress. This may take several minutes.
            </DialogDescription>
          </DialogHeader>
          
          {compilationStatus && <CompilationProgress status={compilationStatus} />}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowCompilationModal(false)}
              disabled={isCompiling}
            >
              {isCompiling ? "Processing..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}