import { useState, useEffect } from "react";
import { X, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

export interface Field {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  validation?: (value: any) => string;
}

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields?: Field[];
  columns?: number;
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: (data: Record<string, any>) => void;
  children?: React.ReactNode;
  defaultValues?: Record<string, any>;
  isLoading?: boolean;
  maxWidth?: string;
  icon?: React.ReactNode;
}

export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  fields = [],
  columns = 2,
  submitLabel,
  cancelLabel = "Cancel",
  onSubmit,
  children,
  defaultValues,
  isLoading = false,
  maxWidth = "max-w-2xl",
  icon,
}: ModalWrapperProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form data
  useEffect(() => {
    if (!isOpen) return;

    const initialData: Record<string, any> = {};
    const initialTouched: Record<string, boolean> = {};
    
    fields.forEach((f) => {
      initialData[f.name] =
        defaultValues?.[f.name] ??
        f.defaultValue ??
        (f.type === "checkbox" ? false : "");
      initialTouched[f.name] = false;
    });

    setFormData(initialData);
    setErrors({});
    setTouched(initialTouched);
    setShowPassword({});
  }, [fields, isOpen, defaultValues]);

  if (!isOpen) return null;

  // Field validation
  const validateField = (name: string, value: any): string => {
    const field = fields.find((f) => f.name === name);
    if (!field) return "";

    // Custom validation
    if (field.validation) {
      const customError = field.validation(value);
      if (customError) return customError;
    }

    // Required validation
    if (field.required && !value && value !== false && value !== 0) {
      return `${field.label} is required`;
    }

    if (!value && value !== false && value !== 0) return "";

    // Type-specific validation
    switch (field.type) {
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Please enter a valid email address";
        }
        break;
      
      case "tel":
        if (!/^\+?[\d\s\-\(\)]{10,}$/.test(value.replace(/\s+/g, ""))) {
          return "Please enter a valid phone number";
        }
        break;
      
      case "password":
        if (value.length < 8) {
          return "Password must be at least 8 characters";
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) {
          return "Password must contain uppercase and lowercase letters";
        }
        if (!/\d/.test(value)) {
          return "Password must contain at least one number";
        }
        break;
      
      case "url":
        try {
          new URL(value);
        } catch {
          return "Please enter a valid URL";
        }
        break;
      
      default:
        break;
    }

    return "";
  };

  // Handle field change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name, value, type } = target;
    
    let val: any = value;
    if (type === "checkbox") {
      val = (target as HTMLInputElement).checked;
    } else if (type === "number") {
      val = value === "" ? "" : Number(value);
    }

    setFormData((prev) => ({ ...prev, [name]: val }));
    
    if (touched[name]) {
      const error = validateField(name, val);
      setErrors((prev) => ({
        ...prev,
        [name]: error
      }));
    }
  };

  // Handle field blur
  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Toggle password visibility
  const togglePasswordVisibility = (fieldName: string) => {
    setShowPassword((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    const newErrors: Record<string, string> = {};
    
    fields.forEach((f) => {
      allTouched[f.name] = true;
      const error = validateField(f.name, formData[f.name]);
      if (error) newErrors[f.name] = error;
    });
    
    setTouched(allTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  // Get field status
  const getFieldStatus = (name: string) => {
    if (!touched[name]) return "untouched";
    if (errors[name]) return "error";
    if (formData[name] || formData[name] === false || formData[name] === 0) return "success";
    return "untouched";
  };

  // Get grid columns class
  const getGridColsClass = () => {
    switch (columns) {
      case 1: return "grid grid-cols-1 gap-6";
      case 2: return "grid grid-cols-1 md:grid-cols-2 gap-6";
      case 3: return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
      case 4: return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";
      default: return "grid grid-cols-1 md:grid-cols-2 gap-6";
    }
  };

  // Render input field
  const renderField = (field: Field) => {
    const status = getFieldStatus(field.name);
    const error = errors[field.name];
    const value = formData[field.name] ?? "";
    const isPassword = field.type === "password";
    const showPwd = showPassword[field.name];

    const baseClasses = "w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200";
    const statusClasses = {
      untouched: "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20",
      success: "border-green-500 focus:border-green-600 focus:ring-green-500/20",
      error: "border-red-500 focus:border-red-600 focus:ring-red-500/20"
    };

    const inputClasses = `${baseClasses} ${statusClasses[status]} ${field.disabled ? 'bg-gray-50 cursor-not-allowed opacity-75' : 'bg-white'}`;

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium text-gray-700"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {status === "success" && (
            <CheckCircle size={16} className="text-green-500" />
          )}
          {status === "error" && (
            <XCircle size={16} className="text-red-500" />
          )}
        </div>

        <div className="relative">
          {field.type === "select" ? (
            <select
              id={field.name}
              name={field.name}
              value={value}
              onChange={handleChange}
              onBlur={() => handleBlur(field.name)}
              disabled={field.disabled}
              className={inputClasses}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              value={value}
              onChange={handleChange}
              onBlur={() => handleBlur(field.name)}
              placeholder={field.placeholder || field.label}
              disabled={field.disabled}
              rows={4}
              className={inputClasses}
            />
          ) : field.type === "checkbox" ? (
            <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={!!value}
                onChange={handleChange}
                onBlur={() => handleBlur(field.name)}
                disabled={field.disabled}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={field.name} className="text-sm text-gray-700 cursor-pointer">
                {field.placeholder || field.label}
              </label>
            </div>
          ) : (
            <div className="relative">
              <input
                type={isPassword && !showPwd ? "password" : field.type}
                id={field.name}
                name={field.name}
                value={value}
                onChange={handleChange}
                onBlur={() => handleBlur(field.name)}
                placeholder={field.placeholder || field.label}
                disabled={field.disabled}
                className={inputClasses + (isPassword ? ' pr-10' : '')}
              />
              
              {isPassword && (
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(field.name)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          )}
        </div>

        {field.helpText && !error && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Info size={12} />
            {field.helpText}
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 bg-blue-50 rounded-lg">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Fields Grid */}
            {fields.length > 0 && (
              <div className={getGridColsClass()}>
                {fields.map(renderField)}
              </div>
            )}

            {/* Children */}
            {children && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                {children}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}