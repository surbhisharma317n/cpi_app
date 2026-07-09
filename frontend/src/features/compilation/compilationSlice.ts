import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

/* ---------------- TYPES ---------------- */

interface UploadCompileState {
  upload: any;
  uploadStatus: any;
  compilation: any;
  dbImport: any;

  uploadLoading: boolean;
  compileLoading: boolean;
  dbLoading: boolean;

  error: string | null;
}

const initialState: UploadCompileState = {
  upload: null,
  uploadStatus: null,
  compilation: null,
  dbImport: null,

  uploadLoading: false,
  compileLoading: false,
  dbLoading: false,

  error: null,
};

/* ---------------- UPLOAD ---------------- */

export const uploadStart = createAsyncThunk(
  "upload/start",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      return await capiService.uploadStart(formData);
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.message || "Upload failed");
    }
  },
);

export const fetchUploadStatus = createAsyncThunk(
  "upload/status",
  async (sessionId: string, { rejectWithValue }) => {
    try {
      return await capiService.uploadStatus(sessionId);
    } catch (e: any) {
      return rejectWithValue(
        e?.response?.data?.message || "Upload status failed",
      );
    }
  },
);

/* ---------------- COMPILATION ---------------- */

export const startCompilationThunk = createAsyncThunk(
  "compile/start",
  async (payload: any, { rejectWithValue }) => {
    try {
      return await capiService.compileStart(payload);
    } catch (e: any) {
      return rejectWithValue(
        e?.response?.data?.message || "Compilation start failed",
      );
    }
  },
);

export const fetchCompilationStatus = createAsyncThunk(
  "compile/status",
  async (taskId: string, { rejectWithValue }) => {
    try {
      return await capiService.compileStatus(taskId);
    } catch (e: any) {
      return rejectWithValue(
        e?.response?.data?.message || "Compilation status failed",
      );
    }
  },
);

/* ---------------- DB IMPORT ---------------- */

export const startDbImportThunk = createAsyncThunk(
  "db/start",
  async ({ taskId, payload }: any, { rejectWithValue }) => {
    try {
      return await capiService.dbImportStart(taskId, payload);
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.message || "DB import failed");
    }
  },
);

export const fetchDbImportStatus = createAsyncThunk(
  "db/status",
  async (taskId: string, { rejectWithValue }) => {
    try {
      return await capiService.dbImportStatus(taskId);
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.message || "DB status failed");
    }
  },
);

/* ---------------- SLICE ---------------- */

const uploadCompileSlice = createSlice({
  name: "uploadCompile",
  initialState,
  reducers: {
    resetUploadState: (state) => {
      state.upload = null;
      state.uploadStatus = null;
      state.uploadLoading = false;
    },
    resetCompileState: (state) => {
      state.compilation = null;
      state.compileLoading = false;
    },
    resetDbState: (state) => {
      state.dbImport = null;
      state.dbLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ---------------- UPLOAD ---------------- */

      .addCase(uploadStart.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadStart.fulfilled, (state, action: PayloadAction<any>) => {
        state.uploadLoading = false;
        state.upload = action.payload;
      })
      .addCase(uploadStart.rejected, (state, action: any) => {
        state.uploadLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchUploadStatus.pending, (state) => {
        state.uploadLoading = true;
      })
      .addCase(
        fetchUploadStatus.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.uploadLoading = false;
          state.uploadStatus = action.payload;
        },
      )
      .addCase(fetchUploadStatus.rejected, (state, action: any) => {
        state.uploadLoading = false;
        state.error = action.payload;
      })

      /* ---------------- COMPILATION ---------------- */

      .addCase(startCompilationThunk.pending, (state) => {
        state.compileLoading = true;
        state.error = null;
      })
      .addCase(
        startCompilationThunk.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.compileLoading = false;
          state.compilation = action.payload;
        },
      )
      .addCase(startCompilationThunk.rejected, (state, action: any) => {
        state.compileLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchCompilationStatus.pending, (state) => {
        state.compileLoading = true;
      })
      .addCase(
        fetchCompilationStatus.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.compileLoading = false;
          state.compilation = action.payload;
        },
      )
      .addCase(fetchCompilationStatus.rejected, (state, action: any) => {
        state.compileLoading = false;
        state.error = action.payload;
      })

      /* ---------------- DB IMPORT ---------------- */

      .addCase(startDbImportThunk.pending, (state) => {
        state.dbLoading = true;
        state.error = null;
      })
      .addCase(
        startDbImportThunk.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.dbLoading = false;
          state.dbImport = action.payload;
        },
      )
      .addCase(startDbImportThunk.rejected, (state, action: any) => {
        state.dbLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchDbImportStatus.pending, (state) => {
        state.dbLoading = true;
      })
      .addCase(
        fetchDbImportStatus.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.dbLoading = false;
          state.dbImport = action.payload;
        },
      )
      .addCase(fetchDbImportStatus.rejected, (state, action: any) => {
        state.dbLoading = false;
        state.error = action.payload;
      });
  },
});

/* ---------------- EXPORTS ---------------- */

export const { resetUploadState, resetCompileState, resetDbState, clearError } =
  uploadCompileSlice.actions;

export default uploadCompileSlice.reducer;
