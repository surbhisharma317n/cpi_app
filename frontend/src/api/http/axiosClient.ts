import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from "axios";
import type { InternalAxiosRequestConfig } from "axios";

/* ---------------- API INSTANCE ---------------- */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 0,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* ---------------- AUTH CLIENT ---------------- */
const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

/* ---------------- GLOBAL STATE ---------------- */
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}[] = [];

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/* ---------------- PROCESS QUEUE ---------------- */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
};

/* ---------------- TOKEN EXPIRY ---------------- */
const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch (e) {
    console.error("❌ Token parse error:", e);
    return null;
  }
};

/* ---------------- REFRESH TOKEN API ---------------- */
const refreshAccessToken = async (): Promise<string> => {
  const refresh = localStorage.getItem("refreshToken");

  if (!refresh) throw new Error("No refresh token");

  const res = await authClient.post("/api/token/refresh/", {
    refresh,
  });

  const { access, refresh: newRefresh } = res.data;

  // ✅ store new access token
  localStorage.setItem("authToken", access);

  // ✅ support refresh rotation (future-safe)
  if (newRefresh) {
    localStorage.setItem("refreshToken", newRefresh);
  }

  console.log("✅ Token refreshed");

  return access;
};

/* ---------------- AUTO REFRESH SCHEDULER ---------------- */
const scheduleTokenRefresh = () => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    const refresh = localStorage.getItem("refreshToken");

    if (refresh) {
      console.log("🔄 No access token, trying refresh...");
      triggerRefresh();
    }

    return;
  }

  const expiry = getTokenExpiry(token);
  if (!expiry) return;

  const now = Date.now();
  const refreshTime = expiry - now - 60000; // 1 min before expiry

  if (refreshTimer) clearTimeout(refreshTimer);

  if (refreshTime <= 0) {
    triggerRefresh();
    return;
  }

  console.log("⏳ Auto refresh in:", Math.round(refreshTime / 1000), "sec");

  refreshTimer = setTimeout(triggerRefresh, refreshTime);
};

/* ---------------- TRIGGER REFRESH ---------------- */
const triggerRefresh = async () => {
  if (isRefreshing) return;

  try {
    isRefreshing = true;
    console.log("🔄 Auto refreshing token...");

    const newToken = await refreshAccessToken();

    processQueue(null, newToken);
    scheduleTokenRefresh();
  } catch (err) {
    processQueue(err, null);

    console.error("❌ Auto refresh failed");

    localStorage.clear();
    window.location.href = "/login";
  } finally {
    isRefreshing = false;
  }
};

/* ---------------- REQUEST INTERCEPTOR ---------------- */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("authToken");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* ---------------- RESPONSE INTERCEPTOR ---------------- */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,

  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // 🔥 Don't attempt token refresh for the auth endpoints themselves —
    // a 401/403 here means bad credentials / bad refresh token, not an
    // expired access token, and there is no refresh token yet on login.
    const isAuthEndpoint =
      originalRequest?.url?.includes("/api/login/") ||
      originalRequest?.url?.includes("/api/token/refresh/");

    // 🔥 FIX: handle BOTH 401 and 403
    if (
      (error.response?.status === 401 ||
        error.response?.status === 403) &&
      !originalRequest?._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("🔄 Refresh on auth error...");

        const newToken = await refreshAccessToken();

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        scheduleTokenRefresh();

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);

        localStorage.clear();
        window.location.href = "/login";

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.error ||
          (error.response?.data as any)?.detail ||
          (typeof error.response?.data === "string"
            ? error.response.data
            : null) ||
          error.message ||
          "Something went wrong";

    return Promise.reject(new Error(message));
  },
);

/* ---------------- INIT AUTH ---------------- */
export const initAuth = async () => {
  const token = localStorage.getItem("authToken");
  const refresh = localStorage.getItem("refreshToken");

  console.log("🚀 initAuth called");

  // 🔥 ensure token exists on reload
  if (!token && refresh) {
    try {
      console.log("🔄 Initial refresh...");
      await refreshAccessToken();
    } catch (err) {
      console.error("❌ Initial refresh failed");

      localStorage.clear();
      window.location.href = "/login";
      return;
    }
  }

  scheduleTokenRefresh();
};

/* ---------------- GENERIC FETCH ---------------- */
export const fetchApi = async <T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> => apiClient(config);

export default apiClient;