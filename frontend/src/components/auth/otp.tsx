// components/auth/OtpForm.tsx
import { useState } from 'react';

interface OtpFormProps {
  onOtpSubmit: (otp: string) => void;
  onResendOtp: () => void;
  onBack: () => void;
}

export default function OtpForm({ onOtpSubmit, onResendOtp, onBack }: OtpFormProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    onOtpSubmit(otp);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Enter Verification Code</h2>
        <p className="text-gray-600 mt-2">
          We've sent a 6-digit code to your registered device
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              if (e.target.validity.valid) {
                setOtp(e.target.value);
                setError('');
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center text-xl tracking-widest"
            placeholder="000000"
            autoFocus
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Verify & Continue
          </button>
        </div>
      </form>

      <div className="flex justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onResendOtp}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Resend Code
        </button>
      </div>
    </div>
  );
}