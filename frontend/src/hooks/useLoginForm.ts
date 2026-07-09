import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchCaptcha,
  selectCaptcha,
  selectCaptchaId,
} from "../features/auth/captchaSlice";
import type { LoginFormData } from "../components/auth/LoginForm/types";

export const useLoginForm = () => {
  const dispatch = useAppDispatch();
  const captcha = useAppSelector(selectCaptcha);
  const captchaId = useAppSelector(selectCaptchaId);

  const [errorMsg, setErrorMsg] = useState("");
  const [showError, setShowError] = useState(false);

  const {
    register,
    handleSubmit,
    formState,
    reset,
    getValues,
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    mode: "onBlur",
    defaultValues: { email: "", password: "", captcha: "", otp: "" },
  });

  /* ---------------- Fetch captcha on mount ---------------- */
  useEffect(() => {
    dispatch(fetchCaptcha());
  }, [dispatch]);

  /* ---------------- Refresh captcha ---------------- */
  const refreshCaptcha = () => {
    dispatch(fetchCaptcha());
    clearErrors("captcha");
  };

  /* ---------------- Handle errors ---------------- */
  const handleFormError = (message: string) => {
    setErrorMsg(message);
    setShowError(true);
  };

  return {
    // Form handlers
    register,
    handleSubmit,
    formState,
    reset,
    getValues,
    setError,
    clearErrors,

    // Captcha
    captcha,
    captchaId,
    refreshCaptcha,

    // Error state
    errorMsg,
    showError,
    setShowError,
    handleFormError,
  };
};
