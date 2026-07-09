import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

/* ---------------- TYPES ---------------- */
interface MasterWeightsParams {
  tab: string;
  subTab: string;
  limit: number;
  offset: number;
}

interface MasterWeightsResponse {
  data: any[];
  columns: string[];
  total_pages: number;
  total_records: number;
}

interface BaseState {
  baseData: MasterWeightsResponse | null;
  loading: boolean;
  error: string | null;
}

/* ---------------- INITIAL STATE ---------------- */
const initialState: BaseState = {
  baseData: null,
  loading: false,
  error: null,
};

/* ---------------- THUNK ---------------- */
export const fetchMasterWeightedItem = createAsyncThunk<
  MasterWeightsResponse,
  MasterWeightsParams
>(
  "base/master_item_weights",
  async (params, { rejectWithValue }) => {
    try {
      return await capiService.getMasterItemsWeights({
        tab: params.tab,
        subtab: params.subTab, // ✅ API expects subtab
        limit: params.limit ?? 50,         // default 50
  offset: params.offset ?? 0,        // default 0
      });
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data || err.message || "Failed to fetch data"
      );
    }
  }
);

/* ---------------- SLICE ---------------- */
const baseSlice = createSlice({
  name: "base",
  initialState,
  reducers: {
    resetbaseState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMasterWeightedItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMasterWeightedItem.fulfilled, (state, action) => {
        state.loading = false;
        state.baseData = action.payload; // ✅ correct type
      })
      .addCase(fetchMasterWeightedItem.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          "Failed to fetch Weighted Item";
      });
  },
});

export const { resetbaseState } = baseSlice.actions;
export default baseSlice.reducer;