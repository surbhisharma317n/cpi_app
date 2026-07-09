import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

// -----------------------------
// TYPES
// -----------------------------
interface FetchParams {
  limit: number;
  offset: number;
  sort?: string;
  // search?: string;
}

interface BaseResponse {
  data: any[];
  columns: string[];
  total_pages: number;
  total_records: number;
}

interface BaseState {
  baseData: BaseResponse | null;
  loading: boolean;
  error: string | null;
}

// -----------------------------
// INITIAL STATE
// -----------------------------
const initialState: BaseState = {
  baseData: null,
  loading: false,
  error: null,
};

// -----------------------------
// THUNK (FIXED)
// -----------------------------
export const fetchCoicopItem = createAsyncThunk<
  BaseResponse,
  FetchParams
>(
  "base/coicop_details",
  async (params, { rejectWithValue }) => {
    try {
      const response = await capiService.getCoicopItemDetails(params);
      return response;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data || err.message || "Something went wrong"
      );
    }
  }
);

// -----------------------------
// SLICE
// -----------------------------
const baseSlice = createSlice({
  name: "base",
  initialState,
  reducers: {
    resetbaseState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoicopItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCoicopItem.fulfilled,
        (state, action: PayloadAction<BaseResponse>) => {
          state.loading = false;
          state.baseData = action.payload;
        }
      )
      .addCase(fetchCoicopItem.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to fetch data";
      });
  },
});

export const { resetbaseState } = baseSlice.actions;
export default baseSlice.reducer;