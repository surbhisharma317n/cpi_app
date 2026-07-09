// components/auth/ErrorModal/index.tsx
import { useEffect } from 'react';
import { type ErrorModalProps } from './types';



export default function ErrorModal({ message, show, onClose }: ErrorModalProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onClose(), 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-[90%] w-[350px] animate-fade-in-right">
      <div className="bg-[#fff0f0] text-[#a94442] p-4 rounded-lg shadow-lg">
        <div className="font-bold text-base mb-2">⚠ Login Error</div>
        <div className="text-sm">{message}</div>
      </div>
    </div>
  );
}