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


// export const fetchInputPriceItem = createAsyncThunk(
//   "base/input_price_item",
//   async (
//     { tab, dataType }: { tab: string; dataType: any },      // <-- add here
//     { rejectWithValue }
//   ) => {
//     try {
//       console.log("Fetching Input Price Item with tab:", tab, "and dataType:", dataType); // Debug log
//       return await capiService.getInputPriceItem(tab, dataType); // <-- pass here
//     } catch (err: any) {
//       return rejectWithValue(err?.response?.data || err.message);
//     }
//   }
// );


// fetch All India index data Slice
export const fetchAllIndexItem = createAsyncThunk(
  "base/all_india_index_item",
  async (
    { tab,subTab, dataType}: { tab: string;subTab:string; dataType: any },      // <-- add here
    { rejectWithValue }
  ) => {
    try {
     
      return await capiService.getAllIndiaIndexItem(tab,subTab, dataType); // <-- pass here
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
    .addCase(fetchAllIndexItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllIndexItem.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.loading = false;
        state.baseData = action.payload;
      })
      .addCase(fetchAllIndexItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? 'Failed to fetch jurisdiction data';
      })


  },
});

export const { resetbaseState } = baseSlice.actions;
export default baseSlice.reducer;
