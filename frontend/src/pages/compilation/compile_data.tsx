"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type JSX,
} from "react";
import {
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiLoader,
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

import ExportSampleButton from "../../components/ui/ExportSampleButton";
import dropDownField from "../../components/ui/Form/dropdownField";

// import { selectAuth } from "../../features/auth/authSlice";
import { useAppDispatch } from "../../app/hooks";
import { compileIndexData } from "../../features/compilation/compileSlice";

// import { useAppSelector } from "../app/hooks";
// import { selectAuth } from "../features/auth/authSlice";

const API_BASE = "http://localhost:8000/api"; // adjust if needed

const STAGES = {
  UPLOADING: 1,
  VALIDATING: 2,
  PROCESSING: 3,
};
interface ProgressSectionProps {
  isValidating: boolean;
  isValidationComplete: boolean;
  isCompiling: boolean;
  isCompilationComplete: boolean;
}

export function ProgressSection({
  isValidating,
  isValidationComplete,
  isCompiling,
  isCompilationComplete,
}: ProgressSectionProps): JSX.Element {
  const [value, setValue] = useState(0); // Validation progress
  const [progress, setProgress] = useState(0); // Compile progress

  // AUTO-LOOP PROGRESS BAR LOGIC
  useEffect(() => {
    let interval: any;

    if (isValidating) {
      interval = setInterval(() => {
        setValue((prev) => (prev >= 100 ? 0 : prev + 2));
      }, 300); // speed
    }

    if (isCompiling) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 2));
      }, 1200);
    }

    return () => clearInterval(interval);
  }, [isValidating, isCompiling]);

  return (
    <div>
      {/* VALIDATION PROGRESS */}
      {isValidating && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <p className="text-gray-500 text-sm">
            Validating files, please wait...
          </p>

          <style>{`
            @keyframes stripeMove {
              0%   { background-position: 0 0; }
              100% { background-position: 40px 0; }
            }
            .striped {
              background-image: linear-gradient(
                45deg,
                rgba(255,255,255,0.15) 25%,
                transparent 25%,
                transparent 50%,
                rgba(255,255,255,0.15) 50%,
                rgba(255,255,255,0.15) 75%,
                transparent 75%,
                transparent
              );
              background-size: 40px 40px;
              animation: stripeMove 0.8s linear infinite;
            }
          `}</style>

          <div className="w-full bg-gray-200 rounded-md h-4 overflow-hidden">
            <div
              className="h-full bg-green-500 striped transition-all duration-200"
              style={{ width: `${value}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* VALIDATION SUCCESS */}
      {isValidationComplete && !isValidating && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <p className="text-green-500 text-sm">
            Validation and uploading data completed successfully.
          </p>
          <span className="text-gray-500 text-sm">
            Now you can proceed to Compile.
          </span>
        </div>
      )}

      {/* COMPILING PROGRESS */}
      {isCompiling && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <p className="text-gray-500 text-sm">
            Compiling data, please wait...
          </p>

          <style>{`
            @keyframes stripeMove {
              from { background-position: 0 0; }
              to { background-position: 40px 0; }
            }
            .bg-stripe {
              background-image: linear-gradient(
                45deg,
                rgba(255,255,255,0.15) 25%,
                transparent 25%,
                transparent 50%,
                rgba(255,255,255,0.15) 50%,
                rgba(255,255,255,0.15) 75%,
                transparent 75%,
                transparent
              );
              background-size: 40px 40px;
              animation: stripeMove 0.7s linear infinite;
            }
          `}</style>

          <div className="w-full bg-gray-200 rounded-md h-3 overflow-hidden mt-4">
            <div
              className="h-full bg-green-500 bg-stripe transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* COMPILATION SUCCESS */}
      {isCompilationComplete && !isCompiling && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <p className="text-green-500 text-sm">
            Compilation completed successfully.
          </p>
          <span className="text-gray-500 text-sm">
            You can close this dialog.
          </span>
        </div>
      )}
    </div>
  );
}

export function ProgressBar3Stage({ stage }: { stage: number }) {
  const getProgress = () => {
    switch (stage) {
      case STAGES.UPLOADING:
        return 33;
      case STAGES.VALIDATING:
        return 66;
      case STAGES.PROCESSING:
        return 100;
      default:
        return 0;
    }
  };

  const getLabel = () => {
    switch (stage) {
      case STAGES.UPLOADING:
        return "Uploading files...";
      case STAGES.VALIDATING:
        return "Validating data...";
      case STAGES.PROCESSING:
        return "Processing data...";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-4 w-full">
      <p className="text-gray-600 text-sm font-medium">{getLabel()}</p>

      <div className="w-72 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-700"
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      <div className="flex justify-between w-72 text-xs text-gray-500">
        <span className={stage >= 1 ? "text-blue-600 font-medium" : ""}>
          Upload
        </span>
        <span className={stage >= 2 ? "text-blue-600 font-medium" : ""}>
          Validate
        </span>
        <span className={stage >= 3 ? "text-blue-600 font-medium" : ""}>
          Process
        </span>
      </div>
    </div>
  );
}

type ValidationRow = {
  file_name: string;
  status: "success" | "failed" | "error";
  message: string;
  missing: string[];
  extra: string[];
  expected: string[];
  file_progress?: number;
  field_name?: string; // optional alias
};

const fileFields = [
  "rural_market_data",
  "urban_market_data",
  "rural_housing_rent_data",
  "urban_housing_rent_data",
  "rural_elect_data",
  "urban_elect_data",
  "online_market_data",
  "airfare_data",
  "urban_pds_data",
];

const expectedHeaders: Record<string, string[]> = {
  rural_item_price: ["Item Code", "Item Name", "Price", "Month", "Year"],
  urban_item_price: ["Item Code", "Item Name", "Price", "Month", "Year"],
  rural_house_rent: ["City", "House ID", "Rent Amount", "Month", "Year"],
  urban_house_rent: ["City", "House ID", "Rent Amount", "Month", "Year"],
  rural_electricity: ["Meter No", "Units", "Rate", "Month", "Year"],
  urban_electricity: ["Meter No", "Units", "Rate", "Month", "Year"],
  online_shopping: ["Item Code", "Platform", "Price", "Month", "Year"],
  airfare: ["Flight No", "From", "To", "Fare", "Month"],
  PDS_price: ["Commodity", "Region", "Price", "Month", "Year"],
};

export default function UploadPage(): JSX.Element {
  const { toast } = useToast();

  // --- State ---
  const [formFiles, setFormFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<ValidationRow[]>(
    []
  );
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [isValidating, setIsValidating] = useState(false);
 
  const [isValidationComplete, setIsValidationComplete] = useState(true);
  const [isCompilationComplete, setIsCompilationComplete] = useState(false);
  const [isUploading] = useState(false);
  const [ ,setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
 
  const pollingRef = useRef<number | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const isLoadingRef = useRef(false);
  // const [userRole, setUserRole] = useState<string | null>(null);
  // const { user } = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const defaultMonth = now.toLocaleString("en-US", { month: "short" });
  const defaultYear = now.getFullYear();
  const [dataType, setDataType] = useState({
    month: defaultMonth,
    year: defaultYear,
    compile_type: "Provisional",
  });



  // --- helpers ---
  const setError = (field: string, message: string | null) =>
    setErrors((p) => ({ ...p, [field]: message || "" }));

  const isAllowedFile = (file: File) => {
    const allowedMimes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowedMimes.includes(file.type)) return true;
    const name = file.name.toLowerCase();
    return (
      name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")
    );
  };

  const [_value, setValue] = useState(0);
  const duration = 10000; // total duration in ms


  useEffect(() => {
    let current = 0;
    const interval = 20; // ms
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
      }
      setValue(current);
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, files } = e.target as HTMLInputElement & {
        name: string;
        files: FileList | null;
      };
      const file = files?.[0] ?? null;
      if (!file) {
        setFormFiles((p) => ({ ...p, [name]: null }));
        return;
      }

      if (!isAllowedFile(file)) {
        setError(name, "Only .csv or .xlsx files are allowed.");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError(name, "File must be smaller than 50 MB.");
        return;
      }

      setError(name, null);
      setFormFiles((p) => ({ ...p, [name]: file }));
    },
    []
  );

  const handleSelectChange = (fieldKey: string, value: string) =>
    setDataType((p) => ({ ...p, [fieldKey]: value }));

  // const handleDownloadTemplate = (fileName: string, headers?: string[]) => {
  //   const fileLabel = fileName.split(".")[0] || fileName;
  //   const h = headers ?? expectedHeaders[fileName] ?? [];
  //   if (!h.length) {
  //     toast({
  //       title: "Template Not Found",
  //       description: "No header format available for this file.",
  //       variant: "destructive",
  //       icon: <FiXCircle className="text-red-500" />,
  //     });
  //     return;
  //   }
  //   const csvContent = h.join(",") + "\n";
  //   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.setAttribute("download", `${fileLabel}_template.csv`);
  //   document.body.appendChild(a);
  //   a.click();
  //   document.body.removeChild(a);
  // };

  // --- VALIDATE (Step 1) ---
  const handleValidate = async () => {
    // require at least one file? your earlier flow required all; we'll allow require-all behavior:
    const missingFiles = fileFields.filter((f) => !formFiles[f]);
    if (missingFiles.length > 0) {
      missingFiles.forEach((f) => setError(f, "This file is required."));
      toast({
        title: "Missing Files",
        description: missingFiles.join(", "),
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
      return;
    }

    setIsValidating(true);
    setShowValidationModal(true);

    try {
      const fd = new FormData();
      fileFields.forEach((field) => {
        const file = formFiles[field];
        if (file) fd.append(field, file);
      });

      // append meta
      fd.append("month", String(dataType.month));
      fd.append("year", String(dataType.year));
      fd.append("compile_type", String(dataType.compile_type));

      // const token = .getAut // get from auth if needed
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${API_BASE}/validate-price-data/`, {
        method: "POST",
        body: fd,
        headers: {
          // 'Content-Type': 'multipart/form-data',  // DO NOT set when using FormData

          'Authorization': `Bearer ${token}`,  // if needed
        },
      });

      const data = await res.json();

      if (!res.ok) {
        // show backend message
        toast({
          title: "Validation Failed",
          description: data.message || "Validation API error",
          variant: "destructive",
          icon: <FiXCircle className="text-red-500" />,
        });
        setValidationResults([]);
        setSessionId(null);
        return;
      }

      // normalize results (backend returns results or summary)
      const rawResults: any[] = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.summary)
          ? data.summary
          : (data.validation ?? []);

      const normalized: ValidationRow[] = rawResults.map((r: any) => ({
        file_name:
          r.file_name ?? r.file ?? r.field ?? r.field_name ?? "unknown_file",
        status:
          (r.status as any) ??
          (r.result === true
            ? "success"
            : r.ok === true
              ? "success"
              : "failed"),
        message: r.message ?? r.msg ?? "",
        missing: Array.isArray(r.missing) ? r.missing : [],
        extra: Array.isArray(r.extra) ? r.extra : [],
        expected:
          Array.isArray(r.expected) && r.expected.length
            ? r.expected
            : (expectedHeaders[r.file_name ?? r.file ?? r.field] ?? []),
        file_progress: 0,
        field_name: r.field_name ?? r.file ?? undefined,
      }));

      setValidationResults(normalized);
      setSessionId(data.session_id ?? data.sessionId ?? null);

      const anyFailed = normalized.some((x) => x.status !== "success");
      setIsValidationComplete(true);
      setIsValidating;
      toast({
        title: anyFailed ? "Validation Completed" : "Validation Successful",
        description: anyFailed
          ? "Some files failed validation. Check the details."
          : "All files validated successfully.",
        variant: anyFailed ? "destructive" : "default",
        icon: anyFailed ? (
          <FiXCircle className="text-red-500" />
        ) : (
          <FiCheckCircle className="text-green-500" />
        ),
      });
    } catch (err: any) {
      toast({
        title: "Validation Error",
        description: err?.message ?? String(err),
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
    } finally {
      setIsValidating(false);
    }
  };

  // --- UPLOAD TO DB (Step 2) ---
  // const handleUploadToDB = async () => {
  //   if (!sessionId) {
  //     toast({
  //       title: "No Session",
  //       description: "Please validate files first.",
  //       variant: "destructive",
  //       icon: <FiXCircle className="text-red-500" />,
  //     });
  //     return;
  //   }

  //   // Option B: Upload only files that passed validation
  //   const passed = validationResults.filter((r) => r.status === "success");
  //   if (passed.length === 0) {
  //     toast({
  //       title: "No valid files",
  //       description: "There are no passed files to upload.",
  //       variant: "destructive",
  //       icon: <FiXCircle className="text-red-500" />,
  //     });
  //     return;
  //   }

  //   setIsUploading(true);
  //   setShowProgressModal(true);
  //   setProgress(0);

  //   const payloadFiles = passed.map((p) => ({
  //     file_name: p.file_name,
  //   }));

  //   try {
  //     const res = await fetch(`${API_BASE}/upload-price-data-db/`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ session_id: sessionId, files: payloadFiles }),
  //     });
  //     const data = await res.json();

  //     if (!res.ok) {
  //       throw new Error(data.message || "Failed to start DB upload");
  //     }

  //     toast({
  //       title: "Upload started",
  //       description: data.message || "Uploading validated files to DB",
  //       icon: <FiLoader className="animate-spin" />,
  //     });

  //     startPollingProgress(sessionId);
  //   } catch (err: any) {
  //     toast({
  //       title: "Upload Error",
  //       description: err?.message ?? String(err),
  //       variant: "destructive",
  //       icon: <FiXCircle className="text-red-500" />,
  //     });
  //     setIsUploading(false);
  //   }
  // };

  // --- Polling progress ---
  // const startPollingProgress = (sessionIdArg: string) => {
  //   stopPolling(); // ensure clean

  //   pollingRef.current = window.setInterval(async () => {
  //     try {
  //       const res = await fetch(
  //         `${API_BASE}/db-upload-progress/${encodeURIComponent(sessionIdArg)}/`
  //       );
  //       if (!res.ok) throw new Error("Progress fetch failed");
  //       const data = await res.json();

  //       // expected: { status, progress, current_file, file_progress: [{file_name, progress}], message }
  //       if (data.status === "running") {
  //         setProgress(typeof data.progress === "number" ? data.progress : 0);
  //         setCurrentFile(data.current_file ?? null);

  //         if (Array.isArray(data.file_progress)) {
  //           setValidationResults((prev) =>
  //             prev.map((row) => {
  //               const match = data.file_progress.find(
  //                 (fp: any) =>
  //                   fp.file_name === row.file_name ||
  //                   fp.field_name === row.field_name
  //               );
  //               return {
  //                 ...row,
  //                 file_progress: match
  //                   ? Math.min(100, Math.max(0, match.progress ?? 0))
  //                   : (row.file_progress ?? 0),
  //               };
  //             })
  //           );
  //         }
  //       } else if (data.status === "completed") {
  //         setProgress(100);
  //         setIsUploading(false);

  //         setValidationResults((prev) =>
  //           prev.map((r) => ({ ...r, file_progress: 100 }))
  //         );

  //         toast({
  //           title: "Upload Completed",
  //           description: "All files uploaded to DB successfully.",
  //           icon: <FiCheckCircle className="text-green-500" />,
  //         });

  //         stopPolling();
  //         setTimeout(() => setShowProgressModal(false), 1500);
  //       } else if (data.status === "error") {
  //         setIsUploading(false);
  //         toast({
  //           title: "Upload Failed",
  //           description: data.message || "Error during upload",
  //           variant: "destructive",
  //           icon: <FiXCircle className="text-red-500" />,
  //         });
  //         stopPolling();
  //       } else {
  //         if (typeof data.progress === "number") setProgress(data.progress);
  //       }
  //     } catch (err) {
  //       console.error("Polling error:", err);
  //       // show a one-time toast & stop polling to avoid spam
  //       toast({
  //         title: "Progress Error",
  //         description: "Unable to fetch upload progress. Stopping polling.",
  //         variant: "destructive",
  //         icon: <FiXCircle className="text-red-500" />,
  //       });
  //       stopPolling();
  //       setIsUploading(false);
  //     }
  //   }, 5000);
  // };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (isCompilationComplete) {
      const timer = setTimeout(() => {
        // Use absolute path
        navigate("/compilation/compilation_index");
      }, 3000);

      return () => clearTimeout(timer);
    }

    // stop polling when compilation is not complete
    return () => {
      stopPolling();
    };
  }, [isCompilationComplete, navigate]);

  useEffect(() => {
    if (isCompiling) {
      let value = 0;
      const interval = setInterval(() => {
        value += 1.2;
        if (value >= 95) value = 95;
        setProgress(value);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isCompiling]);

  // Fill to 100% when complete
  useEffect(() => {
    if (isCompilationComplete) {
      setProgress(100);
    }
  }, [isCompilationComplete]);

  const handleCompile = async () => {
    toast({
      title: "Compilation Started",
      description: "Compiling the uploaded data. This may take a while.",
      icon: <FiLoader className="animate-spin" />,
    });

    try {
      setIsCompiling(true);
      setIsValidationComplete(false);
      setIsCompilationComplete(false); // reset before start

      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      dispatch(
        compileIndexData({
          month: "Jan",
          year: 2025,
          compile_type: "FINAL",
        })
      );

      isLoadingRef.current = false;

      //       dispatch(
      //   compileIndexData({
      //     filters
      //   })
      // );

      const res = await fetch(`${API_BASE}/compilation-index/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // credentials: "include",   // ⭐ VERY IMPORTANT
        body: JSON.stringify({
          month: "JAN",
          year: 2025,
          compile_type: "FINAL",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Compilation failed");

      setIsCompiling(false);
      setIsCompilationComplete(true); // <--- redirect triggers here
      setIsValidationComplete(false);

      toast({
        title: "Compilation Completed",
        description: data.message || "Data compilation finished successfully.",
        icon: <FiCheckCircle className="text-green-500" />,
      });
    } catch (err: any) {
      setIsCompiling(false);

      toast({
        title: "Compilation Error",
        description: err?.message ?? String(err),
        variant: "destructive",
        icon: <FiXCircle className="text-red-500" />,
      });
    }
  };

  // --- UI ---
  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-unset gap-2">
          <FiUploadCloud className="text-blue-800 text-3xl" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Upload Data for Compilation
          </h1>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 border border-blue-800 text-blue-800 hover:bg-blue-100"
        >
          <FiDownload />
          Export Sample
        </Button>
      </div>

      {/* File grid */}
      <form className="mb-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(dropDownField).map(([key, field]: any) => (
            <div key={key} className="flex flex-col">
              <label className="font-semibold text-gray-700 mb-2">
                {field.label}
              </label>
              <select
                name={key}
                value={(dataType as any)[key] ?? ""}
                onChange={(e) => handleSelectChange(key, e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {field.options.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {fileFields.map((field) => (
            <div
              key={field}
              className="border-2 border-dashed p-3 rounded-xl hover:border-blue-500"
            >
              <label className="font-semibold text-gray-700 block">
                {field}
              </label>
              <AdvanceInputField
                name={field}
                label=""
                type="file"
                value={formFiles[field]?.name || ""}
                onChange={handleFileChange}
                error={errors[field]}
              />
              {formFiles[field]?.name && (
                <div className="text-sm mt-0 text-gray-500 truncate">
                  File: {formFiles[field]?.name}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleValidate}
            disabled={isValidating}
            className="bg-blue-800 hover:bg-blue-700 text-white"
          >
            {isValidating ? "Uploading..." : "Upload "}
          </Button>
        </div>
      </form>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent
          title="Upload Data for Compilation"
          description="Review file validation and header check results."
          className="max-w-6xl"
        >
          <ProgressSection
            isValidating={isValidating}
            isValidationComplete={isValidationComplete}
            isCompiling={isCompiling}
            isCompilationComplete={isCompilationComplete}
          />

          {/* {validationResults.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              No validation results available.
            </p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-2 text-left">File Name</th>
                    <th className="border p-2 text-left">Status</th>
                    <th className="border p-2 text-left">Message</th>
                    <th className="border p-2 text-left">Missing Headers</th>

                    <th className="border p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.map((res, i) => {
                    const hasIssues =
                      (res.missing && res.missing.length > 0) ||
                      (res.extra && res.extra.length > 0);
                    return (
                      <tr
                        key={i}
                        className={
                          res.status === "success" ? "bg-green-50" : "bg-red-50"
                        }
                      >
                        <td className="border p-2 font-medium">
                          {res.file_name}
                        </td>
                        <td className="border p-2">
                          {res.status === "success" ? (
                            <span className="text-green-600 flex items-center">
                              <FiCheckCircle className="mr-1" /> Passed
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center">
                              <FiXCircle className="mr-1" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="border p-2">{res.message || "—"}</td>
                        <td className="border p-2 text-red-600">
                          {res.missing?.length ? res.missing.join(", ") : "—"}
                        </td>

                        <td className="border p-2 text-center">
                          {hasIssues ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() =>
                                handleDownloadTemplate(
                                  res.file_name,
                                  res.expected
                                )
                              }
                            >
                              <FiDownload className="mr-1" /> Template
                            </Button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )} */}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowValidationModal(false)}
            >
              Close
            </Button>
            {/* <Button
              onClick={handleUploadToDB}
              disabled={
                validationResults.filter((r) => r.status === "success")
                  .length === 0 || isUploading
              }
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              {isUploading ? "Compilation Running..." : "Proceed to Compile"}
            </Button> */}

            <Button
              onClick={handleCompile}
              disabled={isValidationComplete === false || isCompiling}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              {isCompiling ? "Compilation Running..." : "Proceed to Compile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent
          title="Database Upload Progress"
          description="Track individual and overall progress for all validated files."
          className="max-w-3xl"
        >
          {validationResults.filter((f) => f.status === "success").length ===
          0 ? (
            <p className="text-center text-gray-500 py-8">
              No files to upload yet.
            </p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* {validationResults
                .filter((f) => f.status === "success")
                .map((file, i) => (
                  <div key={i} className="border p-3 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800">
                        {file.file_name}
                      </span>
                      <span className="text-sm text-gray-600 font-semibold">
                        {file.file_progress ?? 0}%
                      </span>
                    </div>

                    <Progress value={file.file_progress ?? 0} className="h-2" />
                  </div>
                ))} */}

              {validationResults.map((file, idx) => (
                <div key={idx} className="w-full mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">
                      {file.file_name}
                    </span>
                    <span className="text-sm">{file.file_progress ?? 0}%</span>
                  </div>

                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        file.file_progress === 100
                          ? "bg-green-600"
                          : "bg-blue-600 animate-pulse"
                      }`}
                      style={{ width: `${file.file_progress ?? 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-700">
                Overall Progress
              </span>
              <span className="text-sm font-medium text-gray-600">
                {progress ?? 0}%
              </span>
            </div>
            {/* <Progress value={progress ?? 0} className="h-3" /> */}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setShowProgressModal(false);
              }}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Sample Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent
          title="Export Sample Files"
          description="Download templates for all input files."
        >
          <ExportSampleButton
            data={expectedHeaders}
            fileName="sample_templates"
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowExportModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
