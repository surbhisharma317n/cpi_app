import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

interface CompileState {
  baseData: any[]; // Replace `any` with proper type
  loading: boolean;
  error: string | null;
}

const initialState: CompileState = {
  baseData: [],
  loading: false,
  error: null,
};

// ✅ Accept both month_year & reportType
export const fetchCompileReports = createAsyncThunk(
  "base/compile_report",
  async (
    { month_year }: { month_year: string; reportType?: string },
    { rejectWithValue }
  ) => {
    try {
      // Pass both params to API service if needed
      return await capiService.getCompileReports(month_year);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data || err.message);
    }
  }
);

const compileSlice = createSlice({
  name: "compile_report",
  initialState,
  reducers: {
    resetBaseState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompileReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCompileReports.fulfilled,
        (state, action: PayloadAction<any[]>) => {
          state.loading = false;
          state.baseData = action.payload;
        }
      )
      .addCase(fetchCompileReports.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Failed to fetch compile reports";
      });
  },
});

export const { resetBaseState } = compileSlice.actions;
export default compileSlice.reducer;
