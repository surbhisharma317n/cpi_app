import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

/* -----------------------------
   Types
----------------------------- */

interface CompileFilters {
  month: string;
  year: number;
  compile_type: string;
}

interface CompileState {
  compilationId: number | null;
  status: "IDLE" | "LOADING" | "SUCCESS" | "FAILED";
  message: string | null;
  error: string | null;
}

/* -----------------------------
   Initial State
----------------------------- */

const initialState: CompileState = {
  compilationId: null,
  status: "IDLE",
  message: null,
  error: null,
};

/* -----------------------------
   Thunk: Trigger Compilation
----------------------------- */

export const compileIndexData = createAsyncThunk<
  { compilation_id: number; message?: string },
  CompileFilters,
  { rejectValue: string }
>("compile/index", async (filters, { rejectWithValue }) => {
  try {
    console.log("Compiling with filters:", filters);
    const response = await capiService.CompieIndexItem(filters);

    return response as { compilation_id: number; message?: string };
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || "Compilation failed"
    );
  }
});

/* -----------------------------
   Slice
----------------------------- */

const compileSlice = createSlice({
  name: "compile",
  initialState,
  reducers: {
    resetCompileState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(compileIndexData.pending, (state) => {
        state.status = "LOADING";
        state.error = null;
        state.message = null;
      })
      .addCase(
        compileIndexData.fulfilled,
        (
          state,
          action: PayloadAction<{
            compilation_id: number;
            message?: string;
          }>
        ) => {
          state.status = "SUCCESS";
          state.compilationId = action.payload.compilation_id;
          state.message = action.payload.message || "Compilation successful";
        }
      )
      .addCase(compileIndexData.rejected, (state, action) => {
        state.status = "FAILED";
        state.error = action.payload as string;
      });
  },
});

/* -----------------------------
   Exports
----------------------------- */

export const { resetCompileState } = compileSlice.actions;
export default compileSlice.reducer;
