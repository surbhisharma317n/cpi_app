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
// interface BaseItem {
//   id: number;
//   name: string;
//   code: string;
//   // add more fields if needed
// }


// Thunk to fetch CAPI data
export const fetchBaseData = createAsyncThunk(
  'base/jusridiction',
  async (
    {  tab }: {  tab: string;},
    { rejectWithValue }
  ) => {
    try {
      return await capiService.getBaseItem(tab);
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
      .addCase(fetchBaseData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBaseData.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.loading = false;
        state.baseData = action.payload;
      })
      .addCase(fetchBaseData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetbaseState } = baseSlice.actions;
export default baseSlice.reducer;
