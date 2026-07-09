import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { UserAuth } from "../../api/endpoints/user/auth_user";

interface CaptchaState {
  captcha: string;
  captchaId: string;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: CaptchaState = {
  captcha: "",
  captchaId: "",
  status: "idle",
  error: null,
};

// ------------------ Async Thunk ------------------
export const fetchCaptcha = createAsyncThunk(
  "captcha/fetchCaptcha",
  async (_, { rejectWithValue }) => {
    try {
      const res = await UserAuth.getCaptchaApi();
      return res; // { captcha, captcha_id }
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to load captcha"
      );
    }
  }
);

// ------------------ Slice ------------------
const captchaSlice = createSlice({
  name: "captcha",
  initialState,
  reducers: {
    clearCaptcha: (state) => {
      state.captcha = "";
      state.captchaId = "";
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCaptcha.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCaptcha.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.captcha = action.payload.captcha;
        state.captchaId = action.payload.captcha_id;
      })
      .addCase(fetchCaptcha.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

// ------------------ Selectors ------------------
export const selectCaptcha = (state: RootState) => state.fetchCaptcha.captcha;
export const selectCaptchaId = (state: RootState) => state.fetchCaptcha.captchaId;
export const selectCaptchaStatus = (state: RootState) => state.fetchCaptcha.status;
export const selectCaptchaError = (state: RootState) => state.fetchCaptcha.error;

export const { clearCaptcha } = captchaSlice.actions;
export default captchaSlice.reducer;
