import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { isFulfilled } from "@reduxjs/toolkit";
import { Link } from "react-router-dom";

import { useLoginForm } from "../../../hooks/useLoginForm";
import {
  login,

  selectAuth,
} from "../../../features/auth/authSlice";
import type { AppDispatch } from "../../../app/store";
import type { User } from "../../../api/types/user";

import NSSLogo from "../../../assets/img/mospi_new_lgo.png";
import type { LoginFormData, LoginFormProps } from "./types";


const LoginForm = ({ onLoginSuccess, onLoginError }: LoginFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { status, error: authError } = useSelector(selectAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    captcha,
    captchaId,
    refreshCaptcha,
  } = useLoginForm();

  // Debug logging
  React.useEffect(() => {
    console.log("Captcha state:", { captcha, captchaId });
  }, [captcha, captchaId]);

  /* ---------------- LOGIN ---------------- */
  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await dispatch(
        login({
          email: data.email.trim(),
          password: data.password,
          captcha: data.captcha,
          captcha_id: captchaId!,
        })
      );

      if (isFulfilled(result)) {
        // Navigate to OTP verification page
        navigate("/verify-otp", {
          state: { email: data.email },
          replace: true
        });
      } else {
        onLoginError?.(authError || "Login failed");
        refreshCaptcha();
      }
    } catch {
      onLoginError?.("Unexpected error");
      refreshCaptcha();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <img
          src={NSSLogo}
          alt="Logo"
          className="h-20 w-auto mx-auto mb-4 drop-shadow-lg"
        />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
          Sign in
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Use your MoSPI official credentials to continue.
        </p>
      </div>

      {/* Error */}
      {authError && (
        <div
          className="p-4 border rounded-lg flex items-start"
          style={{
            backgroundColor: 'var(--red-soft)',
            borderColor: 'var(--red)',
          }}
        >
          <svg className="w-5 h-5 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--red)' }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--red)' }}>{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label
            className="block text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text)' }}
          >
            Official Email / User ID
          </label>
          <input
            {...register("email", { required: "Email required" })}
            placeholder="example@domain.com"
            className="w-full px-4 py-3 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              '--tw-ring-color': 'var(--primary)' as any,
            }}
          />
          {errors.email && (
            <p className="text-sm mt-1" style={{ color: 'var(--red)' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text)' }}
          >
            Password
          </label>
          <div className="relative">
            <input
              type="password"
              {...register("password", { required: "Password required" })}
              placeholder="••••••••"
              className="w-full px-4 py-3 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                '--tw-ring-color': 'var(--primary)' as any,
              }}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75"
              style={{ color: 'var(--muted)' }}
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                input.type = input.type === "password" ? "text" : "password";
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          {errors.password && (
            <p className="text-sm mt-1" style={{ color: 'var(--red)' }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Captcha */}
        <div>
          <label
            className="block text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--text)' }}
          >
            Security Verification
          </label>
          <div
            className="border rounded-lg p-4 mb-3 flex justify-between items-center min-h-12"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            {captcha ? (
              <code
                className="text-lg font-mono font-bold tracking-widest select-none"
                style={{ color: 'var(--ink)' }}
              >
                {captcha}
              </code>
            ) : (
              <span className="text-sm animate-pulse" style={{ color: 'var(--faint)' }}>
                Loading captcha...
              </span>
            )}
            <button
              type="button"
              onClick={refreshCaptcha}
              className="ml-3 p-2 rounded-md transition"
              style={{
                color: 'var(--muted)',
                hovr: { backgroundColor: 'var(--border)' },
              }}
              title="Refresh captcha"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1119.414 4.414.999.999 0 11-1.414 1.414A5.002 5.002 0 105.121 7.499V7a1 1 0 11-2 0V3a1 1 0 011-1zm11 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <input
            {...register("captcha", { required: "Security verification required" })}
            placeholder="Enter the code above"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              '--tw-ring-color': 'var(--primary)' as any,
            }}
          />
          {errors.captcha && (
            <p className="text-sm mt-1" style={{ color: 'var(--red)' }}>
              {errors.captcha.message}
            </p>
          )}
        </div>

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--primary)',
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
              }}
            />
            <span className="ml-2 text-sm" style={{ color: 'var(--text)' }}>
              Keep me signed in
            </span>
          </label>
          <Link
            to="/reset-password"
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 text-white"
          style={{
            backgroundColor: status === "loading" ? 'var(--primary-600)' : 'var(--primary)',
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTopColor: 'var(--border)', borderTopWidth: '1px' }}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span
              className="px-2"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
              }}
            >
              or
            </span>
          </div>
        </div>

        {/* SSO Button */}
        <button
          type="button"
          className="w-full font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
            borderWidth: '1px',
            color: 'var(--text)',
          }}
        >
          <span className="w-5 h-5 text-lg">🟩</span>
          <span>Sign in with MeriPehchaan (National SSO)</span>
        </button>
      </form>

      {/* Guest Demo Link */}
      <div className="text-center pt-2">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Exploring the portal?{' '}
          <a
            href="#"
            className="font-medium"
            style={{ color: 'var(--primary)' }}
          >
            Continue as guest (demo)
          </a>
        </p>
      </div>

      {/* Demo Info */}
      <div
        className="border rounded-lg p-4 break-words"
        style={{
          backgroundColor: 'var(--saffron-soft)',
          borderColor: 'var(--saffron)',
          color: 'var(--saffron)',
        }}
      >
        <p className="text-xs sm:text-sm">
          <strong>Demo mode:</strong> credentials are pre-filled — click <strong>Continue</strong> to receive a one-time passcode. Any 6 digits are accepted (e.g., <strong>123456</strong>).
        </p>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--faint)' }}>
        © 2026 Ministry of Statistics & Programme Implementation, Government of India.
      </p>
    </div>
  );
};


export default LoginForm;