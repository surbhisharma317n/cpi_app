// components/ui/Alert.tsx
import  { type ReactNode } from 'react';

type AlertProps = {
  variant: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
};

const variantClasses = {
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700'
};

export const Alert = ({ variant, children, className = '' }: AlertProps) => {
  return (
    <div className={`p-3 rounded-md ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};