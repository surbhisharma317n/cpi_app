import * as React from "react"
import { cn } from "../../../lib/utils"
import { Eye, EyeOff, Search, X, Calendar, Clock } from "lucide-react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  clearable?: boolean
  onClear?: () => void
  type?: "text" | "password" | "email" | "number" | "search" | "tel" | "url" | "date" | "time"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = "text",
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    clearable,
    onClear,
    disabled,
    value,
    onChange,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    
    const inputType = type === "password" && showPassword ? "text" : type
    
    const handleClear = () => {
      if (onClear) {
        onClear()
      } else if (onChange) {
        onChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)
      }
    }
    
    const getLeftIcon = () => {
      if (leftIcon) return leftIcon
      if (type === "search") return <Search className="h-4 w-4 text-gray-400" />
      if (type === "date") return <Calendar className="h-4 w-4 text-gray-400" />
      if (type === "time") return <Clock className="h-4 w-4 text-gray-400" />
      return null
    }
    
    const getRightIcon = () => {
      if (rightIcon) return rightIcon
      if (type === "password") {
        return (
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )
      }
      if (clearable && value) {
        return (
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={handleClear}
            aria-label="Clear input"
          >
            <X className="h-4 w-4" />
          </button>
        )
      }
      return null
    }
    
    const hasLeftIcon = !!getLeftIcon()
    const hasRightIcon = !!getRightIcon()

    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {hasLeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {getLeftIcon()}
            </div>
          )}
          
          <input
            type={inputType}
            className={cn(
              "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
              "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-gray-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors duration-200",
              error && "border-red-500 focus-visible:ring-red-500",
              hasLeftIcon && "pl-10",
              hasRightIcon && "pr-10",
              isFocused && "border-blue-500",
              className
            )}
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />
          
          {hasRightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {getRightIcon()}
            </div>
          )}
        </div>
        
        {error && (
          <p id={`${props.id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={`${props.id}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Number Input Component
interface NumberInputProps extends Omit<InputProps, "type" | "onChange"> {
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ min, max, step = 1, onChange, value, ...props }, ref) => {
    const handleIncrement = () => {
      if (onChange && typeof value === "number") {
        const newValue = max !== undefined ? Math.min(value + step, max) : value + step
        onChange(newValue)
      } else if (onChange) {
        onChange(step)
      }
    }
    
    const handleDecrement = () => {
      if (onChange && typeof value === "number") {
        const newValue = min !== undefined ? Math.max(value - step, min) : value - step
        onChange(newValue)
      } else if (onChange) {
        onChange(-step)
      }
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        const numValue = parseFloat(e.target.value)
        if (!isNaN(numValue)) {
          onChange(numValue)
        }
      }
    }
    
    return (
      <div className="flex">
        <button
          type="button"
          className="px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100"
          onClick={handleDecrement}
          disabled={props.disabled}
          aria-label="Decrease value"
        >
          -
        </button>
        
        <Input
          ref={ref}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          {...props}
        />
        
        <button
          type="button"
          className="px-3 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100"
          onClick={handleIncrement}
          disabled={props.disabled}
          aria-label="Increase value"
        >
          +
        </button>
      </div>
    )
  }
)
NumberInput.displayName = "NumberInput"

export { Input, NumberInput }