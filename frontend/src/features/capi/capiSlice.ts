import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { capiService } from '../../api/endpoints/capi_data';

interface CapiState {
  capiData: any[];           // Replace `any` with proper type if available
  loading: boolean;
  error: string | null;
}

const initialState: CapiState = {
  capiData: [],
  loading: false,
  error: null,
};

// Thunk to fetch CAPI data
export const fetchCapiData = createAsyncThunk(
  'capi/fetchCapiData',
  async (
    { month_year, tab, iter }: { month_year: string; tab: string; iter: number },
    { rejectWithValue }
  ) => {
    try {
      return await capiService.getCapiData(month_year, tab, iter);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data || err.message);
    }
  }
);

// Slice
const capiSlice = createSlice({
  name: 'capi',
  initialState,
  reducers: {
    resetCapiState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCapiData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCapiData.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.loading = false;
        state.capiData = action.payload;
      })
      .addCase(fetchCapiData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetCapiState } = capiSlice.actions;
export default capiSlice.reducer;
