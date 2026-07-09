import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import type { RootState } from "../../app/store";
import type { User } from "../../api/types/user";
import { fetchApi } from "../../api/http/axiosClient";


// -------------------- Types --------------------
interface AuthState {
  user: User | null;
  token: string | null;
  refresh: string | null; // <-- refresh token
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  isAuthenticated: boolean;
}

// -------------------- Initial State --------------------
const initialState: AuthState = {
  user: null,
  token: null,
  refresh: null,
  status: "idle",
  error: null,
  isAuthenticated: false,
};

// -------------------- Thunks --------------------

// LOGIN
export const login = createAsyncThunk<
  { user: User; token: string; refresh: string },
  { email: string; password: string; captcha: string; captcha_id: string },
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await fetchApi<{ user: User; token: string; refresh: string }>({
      url: "/api/login/",
      method: "POST",
      data: credentials,
    });

    // Store tokens in localStorage
    localStorage.setItem("authToken", response.token);
    localStorage.setItem("refreshToken", response.refresh);
    localStorage.setItem("user", JSON.stringify(response.user));

    return response;
  } catch (err: any) {
    return rejectWithValue(err?.message || "Login failed");
  }
});

// REFRESH TOKEN
export const refreshToken = createAsyncThunk<
  { token: string },
  void,
  { state: RootState; rejectValue: string }
>("auth/refreshToken", async (_, { getState, rejectWithValue }) => {
  const refresh = getState().auth.refresh || localStorage.getItem("refreshToken");
  if (!refresh) return rejectWithValue("No refresh token");

  try {
    const response = await fetchApi<{ token: string }>({
      url: "/api/token/refresh/",
      method: "POST",
      data: { refresh },
    });

    localStorage.setItem("authToken", response.token);
    return response;
  } catch (err: any) {
    // Clear storage if refresh fails
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    return rejectWithValue("Refresh failed");
  }
});

// -------------------- Slice --------------------
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refresh = null;
      state.isAuthenticated = false;
      state.status = "idle";
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    },
    clearError: (state) => {
      state.error = null;
    },
    switchRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    loadUserFromStorage: (state) => {
      const token = localStorage.getItem("authToken");
      const refresh = localStorage.getItem("refreshToken");
      const user = localStorage.getItem("user");
      if (!token || !refresh || !user) return;

      try {
         const decoded: any = jwtDecode(token);
         const isExpired = decoded.exp * 1000 < Date.now();

       if (isExpired) {
      // clear everything if token expired
        state.user = null;
        state.token = null;
        state.refresh = null;
        state.isAuthenticated = false;
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        } else {
        //if (token && refresh && user) {
        state.token = token;
        state.refresh = refresh;
        state.user = JSON.parse(user);
        state.isAuthenticated = true;
      }
    } catch {
     // invalid/malformed token
     state.isAuthenticated = false;
     state.token = null;
    }
    },
  },
  extraReducers: (builder) => {
    // LOGIN
    builder.addCase(login.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refresh = action.payload.refresh;
      state.isAuthenticated = true;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload || "Login failed";
    });

    // REFRESH TOKEN
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
    });
    builder.addCase(refreshToken.rejected, (state) => {
      state.user = null;
      state.token = null;
      state.refresh = null;
      state.isAuthenticated = false;
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    });
  },
});

// -------------------- Selectors --------------------
export const selectAuth = (state: RootState) => state.auth;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

// -------------------- Exports --------------------
export const { logout, clearError, loadUserFromStorage, switchRole } = authSlice.actions;
export default authSlice.reducer;