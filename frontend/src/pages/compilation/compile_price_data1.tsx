// features/compilation/CompilePriceData.tsx
"use client";

import  { useState, useCallback, useEffect, useRef, type ChangeEvent } from "react";
import {
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiLoader,
  FiArchive,
  FiFile,
 
} from "react-icons/fi";
import { Button } from "../../components/ui2/button";
import { useToast } from "../../hooks/useToast";
import AdvanceInputField from "../../components/ui/Form/AdvanceInputField";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "../../components/ui2/dialog";
import { useNavigate } from "react-router-dom";
// import ExportSampleButton from "../../components/ui/ExportSampleButton";

// const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";
const API_BASE =  "http://localhost:8000/api";

// Types
interface ParquetFileStatus {
  file_name: string;
  status: 'pending' | 'validating' | 'validated' | 'failed' | 'uploaded';
  record_count: number;
  inserted_count: number;
  failed_count: number;
  validation_errors: {
    missing_columns?: string[];
    data_type_errors?: string[];
    error?: string;
    column_mismatch?: string[];
  };
  missing_columns: string[];
  data_type_errors: string[];
}

interface ValidationSummary {
  session_id: string;
  status: string;
  total_files: number;
  total_records: number;
  files: ParquetFileStatus[];
  summary: {
    total_files: number;
    validated_files: number;
    failed_files: number;
    total_records: number;
    total_inserted: number;
    total_failed: number;
  };
  metadata: {
    month: string;
    year: number;
    compile_type: string;
    uploaded_at: string;
    processing_time?: number;
  };
}

// Expected files configuration
const EXPECTED_FILES = [
  'rural_market_data.parquet',
  'urban_market_data.parquet',
  'rural_housing_rent_data.parquet',
  'urban_housing_rent_data.parquet',
  'rural_elect_data.parquet',
  'urban_elect_data.parquet',
  'online_market_data.parquet',
  'airfare_data.parquet',
  'urban_pds_data.parquet'
];

// Dropdown field configuration
const dropDownField = {
  month: {
    label: "Month",
    options: [
      { value: "JAN", label: "January" },
      { value: "FEB", label: "February" },
      { value: "MAR", label: "March" },
      { value: "APR", label: "April" },
      { value: "MAY", label: "May" },
      { value: "JUN", label: "June" },
      { value: "JUL", label: "July" },
      { value: "AUG", label: "August" },
      { value: "SEP", label: "September" },
      { value: "OCT", label: "October" },
      { value: "NOV", label: "November" },
      { value: "DEC", label: "December" },
    ]
  },
  year: {
    label: "Year",
    options: Array.from({ length: 10 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { value: year, label: year.toString() };
    })
  },
  compile_type: {
    label: "Compilation Type",
    options: [
      { value: "Provisional", label: "Provisional" },
      { value: "Final", label: "Final" },
      { value: "Revised", label: "Revised" },
    ]
  }
};

// Custom hook for polling
const usePolling = (callback: () => Promise<void>, interval: number, enabled: boolean) => {
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        await callback();
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial call
    poll();
    
    // Set up interval
    pollingRef.current = setInterval(poll, interval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [callback, interval, enabled]);
};

export default function CompilePriceData() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Form state
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const defaultMonth = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const defaultYear = now.getFullYear();
  
  const [formData, setFormData] = useState({
    month: defaultMonth,
    year: defaultYear,
    compile_type: "Provisional",
  });

  // Set error helper
  const setError = useCallback((field: string, message: string | null) => {
    setErrors(prev => ({
      ...prev,
      [field]: message || ""
    }));
  }, []);

  // Handle ZIP file upload
  const handleZipUpload = useCallback((e: ChangeEvent<HTMLInputElement> | any) => {
    let file: File | null = null;
    
    // Handle both regular change events and synthetic events
    if (e?.target?.files?.[0]) {
      file = e.target.files[0];
    } else if (e?.target?.value instanceof File) {
      file = e.target.value;
    } else if (e?.target?.files?.[0]) {
      file = e.target.files[0];
    }

    if (!file) {
      setZipFile(null);
      setError("zipFile", "");
      return;
    }

    // Validate ZIP file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError("zipFile", 'Only .zip files are allowed');
      setZipFile(null);
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError("zipFile", 'File must be smaller than 500 MB');
      setZipFile(null);
      return;
    }

    setError("zipFile", "");
    setZipFile(file);
  }, [setError]);

  // Handle form field changes
  const handleFormChange = useCallback((field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Polling callback
  const pollValidationStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE}/validation-status/${sessionId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch status');

      const data: ValidationSummary = await response.json();
      setValidationSummary(data);

      // Update progress
      updateProgress(data);

      // Stop polling if process is complete
      if (['completed', 'failed'].includes(data.status)) {
        setIsValidating(false);
        setIsProcessing(false);
        
        if (data.status === 'completed') {
          toast({
            title: "Process Completed",
            description: "All files processed successfully",
            icon: <FiCheckCircle className="text-green-500" />,
          });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [sessionId, toast]);

  // Set up polling
  const isPollingEnabled = !!sessionId && 
    validationSummary?.status !== 'completed' && 
    validationSummary?.status !== 'failed';
  
  usePolling(pollValidationStatus, 3000, isPollingEnabled);

  // Update progress based on validation status
  const updateProgress = (summary: ValidationSummary) => {
    if (!summary?.files) return;

    const totalFiles = summary.files.length;
    const validatedFiles = summary.files.filter(f => 
      ['validated', 'uploaded'].includes(f.status)
    ).length;
    const uploadedFiles = summary.files.filter(f => f.status === 'uploaded').length;

    let calculatedProgress = 0;
    
    if (summary.status === 'validating') {
      calculatedProgress = (validatedFiles / totalFiles) * 50;
    } else if (summary.status === 'processing') {
      calculatedProgress = 50 + (uploadedFiles / totalFiles) * 50;
    } else if (summary.status === 'completed') {
      calculatedProgress = 100;
    }

    setProgress(Math.min(100, Math.max(0, calculatedProgress)));
  };

  // Upload and validate ZIP file
  const handleUploadAndValidate = async () => {
    if (!zipFile) {
      toast({
        title: "No ZIP File",
        description: "Please select a ZIP file to upload",
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
      return;
    }

    setIsValidating(true);
    setShowValidationModal(true);
    setValidationSummary(null);
    setProgress(0);

    try {
      const payload = new FormData();
      payload.append('zip_file', zipFile);
      payload.append('month', String(formData.month));
      payload.append('year', String(formData.year));
      payload.append('compile_type', String(formData.compile_type));

      const token = localStorage.getItem("authToken");

      const response = await fetch(`${API_BASE}/upload-zip-validate/`, {
        method: 'POST',
        body: payload,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSessionId(data.session_id);
      
      toast({
        title: "Upload Started",
        description: "ZIP file uploaded. Validation in progress...",
        icon: <FiLoader className="animate-spin" />,
      });

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
      setIsValidating(false);
    }
  };

  // Process validated files
  const handleProcessFiles = async () => {
    if (!sessionId) {
      toast({
        title: "No Session",
        description: "Please validate files first",
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem("authToken");
      
      const response = await fetch(`${API_BASE}/process-files/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          session_id: sessionId,
          month: formData.month,
          year: formData.year,
          compile_type: formData.compile_type
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      toast({
        title: "Processing Started",
        description: "Data insertion in progress...",
        icon: <FiLoader className="animate-spin" />,
      });

    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message || "An error occurred during processing",
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
      setIsProcessing(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated':
      case 'uploaded':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'validating':
      case 'uploading':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
      case 'uploaded':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiXCircle className="text-red-500" />;
      case 'validating':
      case 'uploading':
        return <FiLoader className="animate-spin text-yellow-500" />;
      case 'pending':
        return <FiFile className="text-gray-500" />;
      default:
        return null;
    }
  };

  // Reset form
  const resetForm = () => {
    setZipFile(null);
    setErrors({});
    setValidationSummary(null);
    setSessionId(null);
    setProgress(0);
    setIsValidating(false);
    setIsProcessing(false);
  };

  // Handle modal close
  const handleModalClose = () => {
    if (validationSummary?.status === 'completed') {
      navigate('/compilation/compilation_index');
    } else {
      setShowValidationModal(false);
      resetForm();
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <FiArchive className="text-blue-800 text-3xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Upload ZIP with Parquet Files
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a ZIP file containing all required Parquet files for compilation
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {/* Export functionality */}}
          className="flex items-center gap-2 border border-blue-800 text-blue-800 hover:bg-blue-100"
        >
          <FiDownload />
          Download Sample ZIP
        </Button>
      </div>

      {/* Main Form */}
      <form className="mb-6" onSubmit={(e) => e.preventDefault()}>
        {/* Configuration Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(dropDownField).map(([key, field]) => (
            <div key={key} className="flex flex-col">
              <label className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {field.label}
              </label>
              <select
                name={key}
                value={formData[key as keyof typeof formData]}
                onChange={(e) => handleFormChange(
                  key as keyof typeof formData, 
                  key === 'year' ? parseInt(e.target.value) : e.target.value
                )}
                className="border border-gray-300 dark:border-gray-700 rounded-md p-2.5 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 
                  bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                {field.options.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* File Upload Section */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 
          rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
          <FiArchive className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-lg mb-2">
            Upload ZIP File
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload a ZIP file containing {EXPECTED_FILES.length} Parquet files
          </p>
          
          {/* File Input */}
          <AdvanceInputField
            name="zipFile"
            label=""
            type="file"
            accept=".zip"
            value={zipFile || ''}
            onChange={handleZipUpload}
            error={errors.zipFile}
            helperText="Max file size: 500MB. Required files: all Parquet files."
            className="max-w-md mx-auto"
          />

          {/* Expected Files List */}
          <div className="mt-6 text-left max-w-2xl mx-auto">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected files in ZIP:
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {EXPECTED_FILES.map((file, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FiFile className="text-blue-500" />
                  {file}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end mt-6 space-x-3">
          <Button
            variant="outline"
            onClick={resetForm}
            className="border-gray-300 hover:bg-gray-50"
          >
            Reset
          </Button>
          <Button
            onClick={handleUploadAndValidate}
            disabled={isValidating || !zipFile}
            className="bg-blue-800 hover:bg-blue-700 text-white px-8 
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Uploading & Validating...
              </>
            ) : (
              <>
                <FiUploadCloud className="mr-2" />
                Upload & Validate
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Validation Modal */}
      <Dialog 
        open={showValidationModal} 
        onOpenChange={(open) => !open && handleModalClose()}
      >
        <DialogContent
          title="File Validation & Processing"
          description="Track the status of your uploaded files"
          className="max-w-6xl"
        >
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {validationSummary?.status === 'processing' ? 
                  'Processing Data...' : 
                  'Validating Files...'}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Files Status Table */}
          <div className="max-h-[400px] overflow-y-auto">
            {validationSummary?.files && validationSummary.files.length > 0 ? (
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="border p-3 text-left">File Name</th>
                    <th className="border p-3 text-left">Status</th>
                    <th className="border p-3 text-left">Records</th>
                    <th className="border p-3 text-left">Inserted</th>
                    <th className="border p-3 text-left">Failed</th>
                    <th className="border p-3 text-left">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {validationSummary.files.map((file, index) => (
                    <tr 
                      key={index} 
                      className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        file.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          <FiFile className="text-gray-400" />
                          {file.file_name}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 
                          rounded-full text-xs border ${getStatusColor(file.status)}`}>
                          {getStatusIcon(file.status)}
                          {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        {file.record_count > 0 ? file.record_count.toLocaleString() : '—'}
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {file.inserted_count > 0 ? file.inserted_count.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        {file.failed_count > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {file.failed_count.toLocaleString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3">
                        {file.validation_errors?.missing_columns && (
                          <div className="mb-1 text-xs">
                            <span className="text-red-600">Missing columns: </span>
                            {file.validation_errors.missing_columns.join(', ')}
                          </div>
                        )}
                        {file.validation_errors?.data_type_errors && (
                          <div className="mb-1 text-xs">
                            <span className="text-red-600">Type errors: </span>
                            {file.validation_errors.data_type_errors.join(', ')}
                          </div>
                        )}
                        {file.validation_errors?.error && (
                          <div className="text-xs text-red-600">
                            {file.validation_errors.error}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiLoader className="animate-spin text-3xl mx-auto mb-4" />
                <p>Starting validation process...</p>
              </div>
            )}
          </div>

          {/* Summary Section */}
          {validationSummary?.summary && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                    {validationSummary.summary.total_files}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {validationSummary.summary.validated_files}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Validated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                    {validationSummary.summary.failed_files}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                    {validationSummary.summary.total_records.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {validationSummary.summary.total_inserted.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Inserted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                    {validationSummary.summary.total_failed.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed Records</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="secondary"
              onClick={handleModalClose}
              disabled={isValidating || isProcessing}
            >
              {validationSummary?.status === 'completed' ? 'View Results' : 'Cancel'}
            </Button>
            
            {validationSummary?.status === 'validated' && (
              <Button
                onClick={handleProcessFiles}
                disabled={isProcessing}
                className="bg-green-800 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Process & Insert Data'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}