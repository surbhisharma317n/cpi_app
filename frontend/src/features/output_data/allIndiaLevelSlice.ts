import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { capiService } from '../../api/endpoints/capi_data';

interface baseState {
  baseData: any[];           // Replace `any` with proper type if available
  loading: boolean;
  error: string | null;
}

const initialState: baseState = {
  baseData: [],
  loading: false,
  error: null,
};
// Thunk to fetch CAPI data




export const fetchAllIndiaLevlIndexItem = createAsyncThunk(
  "base/all_india_level_index_item",
  async (
    { tab,subTab, dataType,page,pageSize}: { tab: string;subTab:string; dataType: any,page: number,pageSize: number },      // <-- add here
    { rejectWithValue }
  ) => {
    try {
     
      return await capiService.getAllIndiaLevelIndexItem(tab,subTab, dataType,page,pageSize); // <-- pass here
    } catch (err: any) {
      return rejectWithValue(err?.response?.data || err.message);
    }
  }
);


// Slice
const baseSlice = createSlice({
  name: 'base',
  initialState,
  reducers: {
    resetbaseState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
    .addCase(fetchAllIndiaLevlIndexItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllIndiaLevlIndexItem.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.loading = false;
        state.baseData = action.payload;
      })
      .addCase(fetchAllIndiaLevlIndexItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? 'Failed to fetch jurisdiction data';
      });
  },
});

export const { resetbaseState } = baseSlice.actions;
export default baseSlice.reducer;
