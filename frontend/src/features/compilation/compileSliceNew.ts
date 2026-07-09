// src/features/compilation/compileSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {type  RootState } from '../../app/store';

export interface CompilationParams {
  month: string;
  year: number;
  compile_type: 'PROVISIONAL' | 'FINAL';
  session_id?: string;
}

export interface CompilationState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  task_id: string | null;
  progress: number;
  current_stage: string;
  stages: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
}

const initialState: CompilationState = {
  status: 'idle',
  error: null,
  task_id: null,
  progress: 0,
  current_stage: '',
  stages: [],
};

// Async thunk for compilation
export const compileIndexData = createAsyncThunk(
  'compilation/compileIndexData',
  async (params: CompilationParams, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/compilation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.detail || 'Compilation failed');
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const compilationSlice = createSlice({
  name: 'compilation',
  initialState,
  reducers: {
    resetCompilation: (state) => {
      state.status = 'idle';
      state.error = null;
      state.task_id = null;
      state.progress = 0;
      state.current_stage = '';
      state.stages = [];
    },
    updateCompilationProgress: (state, action: PayloadAction<Partial<CompilationState>>) => {
      Object.assign(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(compileIndexData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(compileIndexData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.task_id = action.payload.task_id;
      })
      .addCase(compileIndexData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { resetCompilation, updateCompilationProgress } = compilationSlice.actions;

// Selectors
export const selectCompilationStatus = (state: RootState) => state.compilation.status;
export const selectCompilationError = (state: RootState) => state.compilation.error;
export const selectCompilationTaskId = (state: RootState) => state.compilation.task_id;
export const selectCompilationProgress = (state: RootState) => state.compilation.progress;
export const selectCompilationCurrentStage = (state: RootState) => state.compilation.current_stage;
export const selectCompilationStages = (state: RootState) => state.compilation.stages;
export const selectCompilationState = (state: RootState) => state.compilation;

export default compilationSlice.reducer;