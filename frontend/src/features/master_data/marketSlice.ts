import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

// -----------------------------
// TYPES
// -----------------------------
interface MarketParams {
  limit?: number;
  offset?: number;
}

interface MarketResponse {
  data: any[];
  columns: string[];
  total_pages: number;
  total_records: number;
}

interface BaseState {
  baseData: MarketResponse | null;
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
// THUNK
// -----------------------------
export const fetchMarketItemDetails = createAsyncThunk<
  MarketResponse,
  MarketParams
>(
  "base/market_details",
  async (params, { rejectWithValue }) => {
    try {
      const response = await capiService.getMarketItemDetails(params);
      return response;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data || err.message || "Failed to fetch data"
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
      .addCase(fetchMarketItemDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMarketItemDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.baseData = action.payload; // ✅ correct type
      })
      .addCase(fetchMarketItemDetails.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to fetch market data";
      });
  },
});

export const { resetbaseState } = baseSlice.actions;
export default baseSlice.reducer;