// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import type { RootState } from "../../app/store";
// import type { User } from "../../api/types/user";
// import { userLogin } from "../../api/endpoints/userotp/login";
// import { verifyOtpApi } from "../../api/endpoints/userotp/verifyOtp";
// import { decodeToken } from "../../utils/jwt";

// // -------------------- Types --------------------
// interface AuthState {
//   user: User | null;
//   token: string | null;
//   status: "idle" | "loading" | "succeeded" | "failed";
//   error: string | null;
//   isAuthenticated: boolean;
//   loginToken: string | null; // For OTP verification
// }

// // -------------------- Initial State --------------------
// const initialState: AuthState = {
//   user: null,
//   token: null,
//   status: "idle",
//   error: null,
//   isAuthenticated: false,
//   loginToken: null,
// };

// // -------------------- Thunks --------------------

// // Login with password + captcha
// export const login = createAsyncThunk<
//   { login_token: string,otpstatus:string },
//   { email: string; password: string; captcha: string; captcha_id: string },
//   { rejectValue: string }
// >("auth/login", async (credentials, { rejectWithValue, signal }) => {
//   try {
//     const controller = new AbortController();
//     signal.addEventListener("abort", () => controller.abort());

//     const response = await userLogin.login_user(credentials, controller);

//     return {  login_token: response.login_token,otpstatus: response.otpstatus };
//   } catch (err: any) {
//     return rejectWithValue(err?.message || "Login failed");
//   }
// });

// // Verify OTP
// export const verifyOtp = createAsyncThunk<
//   { user: User; token: string },
//   { otp: string; login_token: string },
//   { rejectValue: string }
// >("auth/verifyOtp", async (payload, { rejectWithValue, signal }) => {
//   try {
//     const controller = new AbortController();
//     signal.addEventListener("abort", () => controller.abort());

//     const response = await verifyOtpApi.verify(
//       { otp: payload.otp, login_token: payload.login_token },
//       controller
//     );
//     const decoded = decodeToken(response.token);
    

//     const user: User = {
//       id:decoded?.user?.id || response.id,
//       email: decoded?.user?.email || response.email,
//       role: decoded?.user?.role || response.role || 'user',
//       username: decoded?.user?.role || response.role || 'user',
//       first_name: decoded?.user?.first_name || response.firstName || '',
//       last_name: decoded?.user?.last_name || response.lastName || '',
//       full_name: decoded?.user?.full_name || response.firstName || '',
//       last_login: "",
//     };

//     localStorage.setItem("authToken", response.token);

//     return { user, token: response.token };
//   } catch (err: any) {
//     return rejectWithValue(err?.message || "OTP verification failed");
//   }
// });

// // -------------------- Slice --------------------
// const authSlice = createSlice({
//   name: "auth",
//   initialState,
//   reducers: {
//     logout: (state) => {
//       state.user = null;
//       state.token = null;
//       state.isAuthenticated = false;
//       state.loginToken = null;
//       state.status = "idle";
//       localStorage.removeItem("authToken");
//     },
//     clearError: (state) => {
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     // Login
//     builder.addCase(login.pending, (state) => {
//       state.status = "loading";
//       state.error = null;
//     });
//     builder.addCase(login.fulfilled, (state, action) => {
//       state.status = "succeeded";
//       state.loginToken = action.payload.login_token;
//     });
//     builder.addCase(login.rejected, (state, action) => {
//       state.status = "failed";
//       state.error = action.payload || "Login failed";
//     });

//     // OTP
//     builder.addCase(verifyOtp.pending, (state) => {
//       state.status = "loading";
//       state.error = null;
//     });
//     builder.addCase(verifyOtp.fulfilled, (state, action) => {
//       state.status = "succeeded";
//       state.user = action.payload.user;
//       state.token = action.payload.token;
//       state.isAuthenticated = true;
//       state.loginToken = null;
//     });
//     builder.addCase(verifyOtp.rejected, (state, action) => {
//       state.status = "failed";
//       state.error = action.payload || "OTP verification failed";
//     });
//   },
// });

// // -------------------- Selectors --------------------
// export const selectAuth = (state: RootState) => state.auth;
// export const selectCurrentUser = (state: RootState) => state.auth.user;
// export const selectCurrentToken = (state: RootState) => state.auth.token;
// export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
// export const selectAuthStatus = (state: RootState) => state.auth.status;
// export const selectAuthError = (state: RootState) => state.auth.error;
// export const selectLoginToken = (state: RootState) => state.auth.loginToken;

// export const { logout, clearError } = authSlice.actions;
// export default authSlice.reducer;
