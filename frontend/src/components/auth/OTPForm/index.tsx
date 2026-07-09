import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const OTPForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const email = location.state?.email || "user@mospi.gov.in";

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@");
    const masked = localPart.charAt(0) + "***" + localPart.slice(-1);
    return `${masked}@${domain}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (otpValue === "123456") {
        // Demo: OTP is 123456
        navigate("/", { replace: true });
      } else {
        setError("Incorrect or incomplete code. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
      setLoading(false);
    }, 1000);
  };

  const handleResendCode = async () => {
    setResending(true);
    // Simulate API call
    setTimeout(() => {
      setResending(false);
      setError("");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }, 1000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/login")}
        className="text-sm font-medium"
        style={{ color: 'var(--muted)' }}
      >
        Back
      </button>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
          Verify it's you
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Enter the 6-digit one-time passcode sent to {maskEmail(email)}.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-3 border rounded-lg flex items-start gap-3"
          style={{
            backgroundColor: 'var(--red-soft)',
            borderColor: 'var(--red)',
          }}
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: 'var(--red)' }}
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Label */}
        <div>
          <label
            className="block text-sm font-semibold uppercase tracking-wide mb-4"
            style={{ color: 'var(--text)' }}
          >
            One-time passcode
          </label>

          {/* OTP Input Fields */}
          <div className="flex gap-3 justify-between">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-16 h-16 border rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  '--tw-ring-color': 'var(--primary)' as any,
                }}
              />
            ))}
          </div>
        </div>

        {/* Helper Links */}
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="hover:opacity-75"
            style={{ color: 'var(--muted)' }}
          >
            Didn't receive it?
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="font-medium"
            style={{ color: 'var(--primary)' }}
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || otp.join("").length !== 6}
          className="w-full font-semibold py-3 rounded-lg transition duration-200 text-white"
          style={{
            backgroundColor: loading ? 'var(--primary-600)' : 'var(--primary)',
            opacity: loading || otp.join("").length !== 6 ? 0.7 : 1,
            cursor: loading || otp.join("").length !== 6 ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? "Verifying..." : "Verify & sign in"}
        </button>
      </form>
    </div>
  );
};

export default OTPForm;
