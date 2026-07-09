import  { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';


import type { RootState } from '../app/store';
import { compilationAPI } from '../api/compilationAPI';

interface CompilationState {
  stages: any;
  current_stage: any;
  progress: any;
  task_id: any;
  params: {
    month: string;
    year: string;
  };
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: CompilationState = {
  params: {
    month: "",
    year: "",
  },
  status: "idle",
  error: null,

  // ✅ REQUIRED FIELDS
  stages: [],
  current_stage: 0,
  progress: 0,
  task_id: null,
};

export const compileData = createAsyncThunk(
  'compilation/compileData',
  async (params: { month: string; year: string }, { rejectWithValue }) => {
    try {
      // Validate params before API call
      if (!params.month || !params.year) {
        throw new Error('Month and Year are required');
      }
      
      const response = await compilationAPI.compile(params);
      return response.data;
    } catch (error:any) {
      return rejectWithValue(error.message || 'Failed to compile data'  );
    }
  }
);

const compilationSlice = createSlice({
  name: 'compilation',
  initialState,
  reducers: {
    setCompilationParams: (state, action: PayloadAction<{ month: string; year: string }>) => {
      state.params = action.payload;
    },
    resetCompilation: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(compileData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(compileData.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(compileData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

export const { setCompilationParams, resetCompilation } = compilationSlice.actions;

export const selectCompilationParams = (state: RootState): CompilationState['params'] => state.compilation.params;
export const selectCompilationStatus = (state: RootState): CompilationState['status'] => state.compilation.status;
export const selectCompilationError = (state: RootState): CompilationState['error'] => state.compilation.error;
export const selectCompilationStages = (state: RootState): CompilationState['stages'] => state.compilation.stages;
export const selectCompilationCurrentStage = (state: RootState): CompilationState['current_stage'] => state.compilation.current_stage;
export const selectCompilationProgress = (state: RootState): CompilationState['progress'] => state.compilation.progress;
export const selectCompilationTaskId = (state: RootState): CompilationState['task_id'] => state.compilation.task_id;

export default compilationSlice.reducer;