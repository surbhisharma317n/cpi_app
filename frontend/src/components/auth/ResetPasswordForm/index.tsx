import React from "react";
import { useNavigate } from "react-router-dom";

const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/login")}
        className="flex items-center gap-2 text-sm font-medium mb-8"
        style={{ color: 'var(--muted)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to sign in
      </button>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Reset your password
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Enter your registered official email. We'll send a secure reset link and verification OTP.
        </p>
      </div>

      {/* Success Message */}
      {submitted && (
        <div
          className="p-4 border rounded-lg flex items-start gap-3"
          style={{
            backgroundColor: 'var(--green-soft)',
            borderColor: 'var(--green)',
          }}
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: 'var(--green)' }}
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--green)' }}>
            If an account exists for that email, a reset link and OTP have been sent.
          </p>
        </div>
      )}

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              className="block text-sm font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--text)' }}
            >
              Official Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@mospi.gov.in"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                '--tw-ring-color': 'var(--primary)' as any,
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-3 rounded-lg transition duration-200 text-white"
            style={{
              backgroundColor: loading ? 'var(--primary-600)' : 'var(--primary)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      ) : (
        <button
          onClick={() => navigate("/login")}
          className="w-full font-semibold py-3 rounded-lg text-white"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Back to sign in
        </button>
      )}

      {/* Remember Password Link */}
      <div className="text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Remembered it?{" "}
          <button
            onClick={() => navigate("/login")}
            className="font-medium"
            style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
