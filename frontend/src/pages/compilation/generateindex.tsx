"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle, ChevronRight, AlertCircle, CheckIcon } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  compilationType: string;
  year: string;
  month: string;
  files: File[];
}

const STEPS = [
  { number: 1, title: "Upload data", description: "Price ZIP & parameters" },
  { number: 2, title: "Validate", description: "Schema & integrity checks" },
  { number: 3, title: "Compile index", description: "Build index & aggregate" },
  { number: 4, title: "Save to database", description: "Submit for approval" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function GenerateIndex() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    compilationType: "Provisional",
    year: "2026",
    month: "June",
    files: [],
  });
  const [dragActive, setDragActive] = useState(false);

  // Validation state
  const [validationProgress, setValidationProgress] = useState(0);
  const [showValidationResults, setShowValidationResults] = useState(false);

  // Compilation state
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [showCompilationDone, setShowCompilationDone] = useState(false);

  // Database save state
  const [dbProgress, setDbProgress] = useState(0);
  const [showDbDone, setShowDbDone] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    setFormData(prev => ({ ...prev, files }));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, files: Array.from(e.target.files!) }));
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2);
      // Start validation simulation
      simulateValidation();
    } else if (currentStep === 2) {
      setCurrentStep(3);
      simulateCompilation();
    } else if (currentStep === 3) {
      setCurrentStep(4);
      simulateDatabaseSave();
    } else if (currentStep === 4 && showDbDone) {
      navigate("/");
    }
  };

  const simulateValidation = () => {
    setValidationProgress(0);
    setShowValidationResults(false);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setValidationProgress(100);
        setTimeout(() => setShowValidationResults(true), 500);
      } else {
        setValidationProgress(progress);
      }
    }, 800);
  };

  const simulateCompilation = () => {
    setCompilationProgress(0);
    setShowCompilationDone(false);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setCompilationProgress(100);
        setTimeout(() => setShowCompilationDone(true), 500);
      } else {
        setCompilationProgress(progress);
      }
    }, 600);
  };

  const simulateDatabaseSave = () => {
    setDbProgress(0);
    setShowDbDone(false);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDbProgress(100);
        setTimeout(() => setShowDbDone(true), 500);
      } else {
        setDbProgress(progress);
      }
    }, 700);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    } else {
      navigate(-1);
    }
  };

  const isStep1Valid = formData.files.length > 0 && formData.compilationType && formData.year && formData.month;

  return (
    <div className="min-h-screen bg-[#F3F4F0] dark:bg-[#0A1421]">
      {/* Header */}
      <div className="bg-white dark:bg-[#10202F] border-b border-[#DDE1D9] dark:border-[#20405B] px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[#F6F7F3] dark:hover:bg-[#152A3C] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 transform rotate-180 text-[#54636F] dark:text-[#9DB0C4]" />
          </button>
          <h1 className="text-2xl font-bold text-[#0B1E33] dark:text-[#EDF3F9]">Generate Index</h1>
        </div>
        <p className="text-sm text-[#54636F] dark:text-[#9DB0C4]">
          Upload price data, validate, compile, then import to the database for <strong>June 2026 · Provisional</strong>
        </p>
      </div>

      <div className="flex gap-8 p-8 max-w-7xl mx-auto">
        {/* Left Sidebar - Steps */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-[#10202F] rounded-xl p-6 border border-[#DDE1D9] dark:border-[#20405B]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#54636F] dark:text-[#9DB0C4] mb-6">Compilation steps</h3>
            {STEPS.map((step, index) => (
              <div key={step.number}>
                <button
                  onClick={() => setCurrentStep(step.number as Step)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    currentStep === step.number
                      ? 'bg-[#E7EDFB] dark:bg-[#182B4C]'
                      : 'hover:bg-[#F6F7F3] dark:hover:bg-[#152A3C]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      currentStep > step.number
                        ? 'bg-[#0F7A42] text-white'
                        : currentStep >= step.number
                        ? 'bg-[#1D52D6] text-white'
                        : 'bg-[#DDE1D9] dark:bg-[#20405B] text-[#54636F] dark:text-[#9DB0C4]'
                    }`}>
                      {currentStep > step.number ? <CheckIcon className="w-4 h-4" /> : step.number}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${currentStep === step.number ? 'text-[#1D52D6] dark:text-[#6E9BFF]' : 'text-[#0B1E33] dark:text-[#EDF3F9]'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-[#727F8B] dark:text-[#7388A0] mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <div className="h-8 flex items-center justify-center">
                    <div className={`w-0.5 h-6 ${currentStep > step.number ? 'bg-[#0F7A42]' : 'bg-[#DDE1D9] dark:bg-[#20405B]'}`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-[#10202F] rounded-xl border border-[#DDE1D9] dark:border-[#20405B] overflow-hidden">
            {/* Step 1: Upload Data */}
            {currentStep === 1 && (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0B1E33] dark:text-[#EDF3F9] mb-2">Upload price data files</h2>
                  <p className="text-sm text-[#54636F] dark:text-[#9DB0C4]">
                    Upload the 19 input files for this cycle. Once selected, each file is listed below with the number of rows detected. The reporting period is taken from the parameters below.
                  </p>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    dragActive
                      ? 'border-[#1D52D6] bg-[#E7EDFB] dark:bg-[#182B4C]'
                      : 'border-[#DDE1D9] dark:border-[#20405B] bg-[#F6F7F3] dark:bg-[#152A3C]'
                  }`}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[#1D52D6]" />
                  <p className="text-base font-medium text-[#0B1E33] dark:text-[#EDF3F9] mb-1">
                    Drop the 19 input files here, or <button className="text-[#1D52D6] dark:text-[#6E9BFF] font-semibold hover:underline">click to browse</button>
                  </p>
                  <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">
                    Accepts CSV files per CPI schema v3 · rural, urban & administrative datasets
                  </p>
                </div>

                {formData.files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Selected Files ({formData.files.length})</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {formData.files.map((file, index) => (
                        <div key={index} className="p-3 bg-[#F6F7F3] dark:bg-[#152A3C] rounded-lg flex items-center justify-between">
                          <span className="text-sm text-[#0B1E33] dark:text-[#EDF3F9]">{file.name}</span>
                          <span className="text-xs text-[#727F8B] dark:text-[#7388A0]">{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="w-full py-3 px-4 bg-[#1D52D6] dark:bg-[#2D5FD8] text-white font-semibold rounded-lg hover:bg-[#1747C0] dark:hover:bg-[#2452BC] transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload files
                </button>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#54636F] dark:text-[#9DB0C4] mb-2">
                      Compilation type
                    </label>
                    <select
                      value={formData.compilationType}
                      onChange={(e) => setFormData(prev => ({ ...prev, compilationType: e.target.value }))}
                      className="w-full px-4 py-2 border border-[#DDE1D9] dark:border-[#20405B] rounded-lg bg-white dark:bg-[#152A3C] text-[#0B1E33] dark:text-[#EDF3F9]"
                    >
                      <option>Provisional</option>
                      <option>Final</option>
                      <option>Revised</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#54636F] dark:text-[#9DB0C4] mb-2">
                      Year
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-4 py-2 border border-[#DDE1D9] dark:border-[#20405B] rounded-lg bg-white dark:bg-[#152A3C] text-[#0B1E33] dark:text-[#EDF3F9]"
                    >
                      {YEARS.map(year => <option key={year}>{year}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#54636F] dark:text-[#9DB0C4] mb-2">
                      Month
                    </label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                      className="w-full px-4 py-2 border border-[#DDE1D9] dark:border-[#20405B] rounded-lg bg-white dark:bg-[#152A3C] text-[#0B1E33] dark:text-[#EDF3F9]"
                    >
                      {MONTHS.map((month, i) => (
                        <option key={i} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-[#E7EDFB] dark:bg-[#182B4C] border border-[#B8D4F8] dark:border-[#2C5AA8] rounded-lg flex gap-3">
                  <div className="text-[#1D52D6] dark:text-[#6E9BFF] flex-shrink-0">ℹ️</div>
                  <p className="text-sm text-[#1D52D6] dark:text-[#6E9BFF]">
                    <strong>Tip:</strong> parameters pre-fill from the global period. All 19 files must be present before validation can run.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Validate */}
            {currentStep === 2 && (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0B1E33] dark:text-[#EDF3F9] mb-2">Validation results</h2>
                  <p className="text-sm text-[#54636F] dark:text-[#9DB0C4]">
                    Schema, range and referential checks run against the uploaded price quotes. Review any warnings before compiling.
                  </p>
                </div>

                {!showValidationResults ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-[#F6F7F3] dark:bg-[#152A3C] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Validating files...</span>
                        <span className="text-sm font-bold text-[#1D52D6]">{Math.round(validationProgress)}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#DDE1D9] dark:bg-[#20405B] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#1D52D6] to-[#2D5FD8] transition-all duration-300"
                          style={{ width: `${validationProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-[#F6F7F3] dark:bg-[#152A3C] rounded-lg border border-[#DDE1D9] dark:border-[#20405B]">
                        <div className="text-lg font-bold text-[#0B1E33] dark:text-[#EDF3F9]">42,897</div>
                        <div className="text-xs text-[#727F8B] dark:text-[#7388A0] mt-1">Rows parsed</div>
                      </div>
                      <div className="p-4 bg-[#F0F7F0] dark:bg-[#1A3A1A] rounded-lg border border-[#0F7A42]">
                        <div className="text-lg font-bold text-[#0F7A42]">42,883</div>
                        <div className="text-xs text-[#0F7A42] mt-1">Valid</div>
                      </div>
                      <div className="p-4 bg-[#FFF3E0] dark:bg-[#3A2F1A] rounded-lg border border-[#B85C00]">
                        <div className="text-lg font-bold text-[#B85C00]">14</div>
                        <div className="text-xs text-[#B85C00] mt-1">Warnings</div>
                      </div>
                      <div className="p-4 bg-[#FBE2DF] dark:bg-[#33181A] rounded-lg border border-[#C0362C]">
                        <div className="text-lg font-bold text-[#C0362C]">0</div>
                        <div className="text-xs text-[#C0362C] mt-1">Errors</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-4 bg-[#F0F7F0] dark:bg-[#1A3A1A] rounded-lg border border-[#0F7A42] flex gap-3 items-start">
                        <CheckIcon className="w-5 h-5 text-[#0F7A42] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">File structure & encoding</p>
                          <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">19 / 19 files</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[#F0F7F0] dark:bg-[#1A3A1A] rounded-lg border border-[#0F7A42] flex gap-3 items-start">
                        <CheckIcon className="w-5 h-5 text-[#0F7A42] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Pitem codes resolve to COICOP mapping</p>
                          <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">1,129 / 1,129</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[#F0F7F0] dark:bg-[#1A3A1A] rounded-lg border border-[#0F7A42] flex gap-3 items-start">
                        <CheckIcon className="w-5 h-5 text-[#0F7A42] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Market & village codes match master</p>
                          <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">matched</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[#FFF3E0] dark:bg-[#3A2F1A] rounded-lg border border-[#B85C00] flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-[#B85C00] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Price outliers ({">"}3σ from item median)</p>
                          <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">14 flagged</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[#F0F7F0] dark:bg-[#1A3A1A] rounded-lg border border-[#0F7A42] flex gap-3 items-start">
                        <CheckIcon className="w-5 h-5 text-[#0F7A42] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Weight coverage for priced items</p>
                          <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">98.7%</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#E7EDFB] dark:bg-[#182B4C] border border-[#B8D4F8] dark:border-[#2C5AA8] rounded-lg flex gap-3">
                      <CheckIcon className="w-5 h-5 text-[#1D52D6] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#1D52D6] dark:text-[#6E9BFF]">
                        <strong>Ready to compile.</strong> Press <strong>Compile index</strong> to build elementary aggregates and roll up the COICOP hierarchy.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Compile Index */}
            {currentStep === 3 && (
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0B1E33] dark:text-[#EDF3F9] mb-2">Compiling index</h2>
                  <p className="text-sm text-[#54636F] dark:text-[#9DB0C4]">
                    Building elementary aggregates, then rolling up COICOP levels using expenditure-share weights.
                  </p>
                </div>

                {!showCompilationDone ? (
                  <div className="p-4 bg-[#F6F7F3] dark:bg-[#152A3C] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Compiling...</span>
                      <span className="text-sm font-bold text-[#1D52D6]">{Math.round(compilationProgress)}%</span>
                    </div>
                    <div className="w-full h-3 bg-[#DDE1D9] dark:bg-[#20405B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1D52D6] to-[#2D5FD8] transition-all duration-300"
                        style={{ width: `${compilationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F0F7F0] dark:bg-[#1A3A1A] rounded-lg border border-[#0F7A42] flex gap-3 items-start">
                    <CheckIcon className="w-5 h-5 text-[#0F7A42] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#0F7A42]">Index compiled.</p>
                      <p className="text-sm text-[#0B1E33] dark:text-[#EDF3F9] mt-1">Compilation <strong>#v6</strong> for June 2026 (Provisional) is built. Press <strong>Save to database</strong> to submit for approval.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Save to Database */}
            {currentStep === 4 && (
              <div className="p-8 space-y-6 flex flex-col">
                <div>
                  <h2 className="text-xl font-bold text-[#0B1E33] dark:text-[#EDF3F9] mb-2">Submitting for approval</h2>
                  <p className="text-sm text-[#54636F] dark:text-[#9DB0C4]">
                    Writing the compiled index to the database and queuing it for approval.
                  </p>
                </div>

                {!showDbDone ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#FBEAD3] dark:bg-[#33240F] border border-[#B85C00] rounded-lg flex gap-3">
                      <AlertCircle className="w-5 h-5 text-[#B85C00] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#B85C00]">
                        <strong>Do not close this window</strong> while the database is being saved.
                      </p>
                    </div>

                    <div className="p-4 bg-[#F6F7F3] dark:bg-[#152A3C] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#0B1E33] dark:text-[#EDF3F9]">Saving to database...</span>
                        <span className="text-sm font-bold text-[#1D52D6]">{Math.round(dbProgress)}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#DDE1D9] dark:bg-[#20405B] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#1D52D6] to-[#2D5FD8] transition-all duration-300"
                          style={{ width: `${dbProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-[#F0F7F0] dark:bg-[#1A3A1A] flex items-center justify-center mb-4 border-2 border-[#0F7A42]">
                      <CheckIcon className="w-10 h-10 text-[#0F7A42]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0B1E33] dark:text-[#EDF3F9] mb-2">Saved to database</h2>
                    <p className="text-sm text-[#54636F] dark:text-[#9DB0C4] max-w-sm">
                      Compilation <strong>#v6</strong> for June 2026 (Provisional) is now stored and submitted for approval.
                    </p>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 bg-white dark:bg-[#152A3C] border border-[#DDE1D9] dark:border-[#20405B] text-[#0B1E33] dark:text-[#EDF3F9] rounded-lg hover:bg-[#F6F7F3] dark:hover:bg-[#10202F] transition-colors text-sm font-medium"
                      >
                        View dashboard
                      </button>
                      <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-[#1D52D6] text-white rounded-lg hover:bg-[#1747C0] transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        New compilation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="border-t border-[#DDE1D9] dark:border-[#20405B] px-8 py-4 flex justify-between items-center bg-[#F6F7F3] dark:bg-[#152A3C]">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-[#54636F] dark:text-[#9DB0C4] font-medium hover:bg-white dark:hover:bg-[#10202F] rounded-lg transition-colors disabled:opacity-50"
                disabled={currentStep === 1}
              >
                ← Back
              </button>
              <p className="text-xs text-[#727F8B] dark:text-[#7388A0]">
                Step {currentStep} of {STEPS.length}
              </p>
              <button
                onClick={handleNext}
                disabled={(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !showValidationResults) || (currentStep === 3 && !showCompilationDone)}
                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  (currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !showValidationResults) || (currentStep === 3 && !showCompilationDone)
                    ? 'bg-[#DDE1D9] dark:bg-[#20405B] text-[#727F8B] dark:text-[#7388A0] cursor-not-allowed'
                    : currentStep === STEPS.length
                    ? 'bg-[#0F7A42] text-white hover:bg-[#0C5D32]'
                    : 'bg-[#1D52D6] text-white hover:bg-[#1747C0]'
                }`}
              >
                {currentStep === STEPS.length ? (showDbDone ? 'Complete' : 'Submitting...') : 'Continue'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
