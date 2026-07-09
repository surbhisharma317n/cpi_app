// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { isFulfilled } from "@reduxjs/toolkit";

// import { useLoginForm } from "../../../hooks/useLoginForm";
// import {
//   login,
//   verifyOtp,
//   selectAuth,
// } from "../../../features/auth/authSlice1";
// import type { AppDispatch } from "../../../app/store";
// import type { User } from "../../../api/types/user";

// import NSSLogo from "../../../assets/img/mospi_new_lgo.png";
// import type { LoginFormData, LoginFormProps } from "./types";

// const LoginForm = ({ onLoginSuccess, onLoginError }: LoginFormProps) => {
//   const dispatch = useDispatch<AppDispatch>();
//   const navigate = useNavigate();

//   const { status, error: authError } = useSelector(selectAuth);

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     captcha,
//     captchaId,
//     refreshCaptcha,
//     getValues,
//   } = useLoginForm();

//   const [otpStep, setOtpStep] = useState(false);
//   const [loginToken, setLoginToken] = useState<string | null>(null);

//   /* ---------------- LOGIN (STEP 1) ---------------- */
//   const onSubmit = async (data: LoginFormData) => {
//     try {
//       const result = await dispatch(
//         login({
//           email: data.email.trim(),
//           password: data.password,
//           captcha: data.captcha,
//           captcha_id: captchaId!,
//         })
//       );

//       if (isFulfilled(result)) {
//         const payload = result.payload as {
//           otpstatus: string;
//           login_token: string;
//         };

//         if (payload.otpstatus === "success") {
//           setLoginToken(payload.login_token);
//           setOtpStep(true);
//           refreshCaptcha();
//         } else {
//           onLoginError?.("Failed to send OTP");
//           refreshCaptcha();
//         }
//       } else {
//         onLoginError?.(authError || "Login failed");
//         refreshCaptcha();
//       }
//     } catch {
//       onLoginError?.("Unexpected error");
//       refreshCaptcha();
//     }
//   };

//   /* ---------------- OTP VERIFY (STEP 2) ---------------- */
//   const handleVerifyOtp = async () => {
//     const otp = getValues("otp");

//     if (!otp || !loginToken) {
//       onLoginError?.("OTP is required");
//       return;
//     }

//     try {
//       const result = await dispatch(
//         verifyOtp({ login_token: loginToken, otp })
//       );

//       if (isFulfilled(result)) {
//         const raw = result.payload as { token: string; user: User };
//         onLoginSuccess?.({ user: raw.user, token: raw.token });
//         navigate("/", { replace: true });
//       }
//     } catch {
//       onLoginError?.("OTP verification failed");
//     }
//   };

//   return (
//     //<div className="w-full max-w-md bg-white p-4 rounded-2xl mx-auto">
//     <div className="w-full">
//       {/* Logo */}
//       {/* <div className="text-center mb-6">
//         <img src={NSSLogo} alt="Logo" className="h-16 mx-auto mb-2" /> 
//         <h1 className="text-xl font-semibold text-blue-900">Login Portal</h1>
//       </div> */}


//         <div className="relative text-center mb-6">

//   {/* Floating Logo */}
//   <div className="absolute -top-12 left-1/2 -translate-x-1/2">
//     <img
//       src={NSSLogo}
//       alt="Logo"
//       className="h-[95px] w-28 mx-auto -mt-20 mb-2 drop-shadow-xl"
//     />
//   </div>

//   <h1 className="text-xl font-bold text-blue-900 mt-12">
//     INDEX COMPILATION <span>LOGIN PORTAL</span>
//   </h1>
//     {/* <h2 className="text-xl font-bold text-blue-900">
//     Portal Login
//   </h2> */}
// </div>

//       {/* Error */}
//       {authError && (
//         <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
//           {authError}
//         </div>
//       )}

//       <form onSubmit={handleSubmit(onSubmit)} noValidate>
//         {/* Email */}
//         <div className="mb-4">
//           <label className="text-sm font-medium">Email</label>
//           <input
//             {...register("email", { required: "Email required" })}
//             className="w-full px-3 py-2 mt-1 border rounded-md"
//           />
//           {errors.email && (
//             <p className="text-red-500 text-sm">{errors.email.message}</p>
//           )}
//         </div>

//         {/* Password */}
//         <div className="mb-4">
//           <label className="text-sm font-medium">Password</label>
//           <input
//             type="password"
//             {...register("password", { required: "Password required" })}
//             className="w-full px-3 py-2 mt-1 border rounded-md"
//           />
//           {errors.password && (
//             <p className="text-red-500 text-sm">{errors.password.message}</p>
//           )}
//         </div>

//         {/* Captcha */}
//         {!otpStep && (
//           <div className="mb-4">
//             <label className="text-sm font-medium">Captcha</label>
//             <div className="flex justify-between items-center mb-2">
//               <div className="bg-gray-200 px-4 py-2 font-mono tracking-widest">
//                 {captcha}
//               </div>
//               <button
//                 type="button"
//                 onClick={refreshCaptcha}
//                 className="text-blue-900 text-sm"
//               >
//                 Refresh
//               </button>
//             </div>
//             <input
//               {...register("captcha", { required: "Captcha required" })}
//               className="w-full px-3 py-2 border rounded-md"
//               placeholder="Enter captcha"
//             />
//           </div>
//         )}

//         {/* OTP */}
//         {otpStep && (
//           <div className="mb-4">
//             <label className="text-sm font-medium">OTP</label>
//             <input
//               {...register("otp", {
//                 required: "OTP required",
//                 pattern: { value: /^\d{6}$/, message: "6 digit OTP" },
//               })}
//               className="w-full px-3 py-2 mt-1 border rounded-md"
//               placeholder="Enter OTP"
//             />
//             <div className="flex gap-3 mt-4">
//               <button
//                 type="button"
//                 onClick={handleVerifyOtp}
//                 className="flex-1 bg-green-700 text-white py-2 rounded"
//               >
//                 Verify OTP
//               </button>
//               <button
//                 type="button"
//                 onClick={() => {
//                   const email = getValues("email");
//                   const password = getValues("password");
//                   const captchaValue = getValues("captcha");
//                   dispatch(
//                     login({
//                       email,
//                       password,
//                       captcha: captchaValue,
//                       captcha_id: captchaId!,
//                     })
//                   ).then((res) => {
//                     if (isFulfilled(res)) {
//                       setLoginToken((res.payload as any).login_token);
//                     }
//                   });
//                 }}
//                 className="flex-1 bg-blue-900 text-white py-2 rounded"
//               >
//                 Resend OTP
//               </button>
//             </div>
//           </div>
//         )}

//         {!otpStep && (
//           <button
//             type="submit"
//             disabled={status === "loading"}
//             className="w-full bg-blue-900 text-white py-2 rounded mt-4"
//           >
//             {status === "loading" ? "Logging in..." : "Login"}
//           </button>
//         )}
//       </form>

//       <p className="text-xs text-gray-500 text-center mt-6">
//         © 2024 Ministry of Statistics & Programme Implementation
//       </p>
//     </div>
//   );
// };

// export default LoginForm;
