import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";


/* ================= FETCH ================= */
export const fetchAllIndiaLevlIndexItem = createAsyncThunk(
  "base/all_india_level_index_item",
  async (
    { tab, subTab, dataType,page,pageSize }: { tab: string; subTab: string; dataType: any; page: number; pageSize: number },
    { rejectWithValue }
  ) => {
    try {
      return await capiService.getAllIndiaLevelIndexItem(
        tab,
        subTab,
        dataType,
        page,
        pageSize
      );
    } catch (err: any) {
      return rejectWithValue(err?.response?.data || err.message);
    }
  }
);

/* ================= APPROVE ================= */
export const approveAllIndiaLevelIndexItem = createAsyncThunk(
  "base/approve_all_india_level_index_item",
  async (
    {
      id,
      action,
      remarks,
    }: { id: number; action: "APPROVE" | "REJECT"; remarks?: string },
    { rejectWithValue }
  ) => {
    try {
      return await capiService.approveAllIndiaLevelIndexItem(
        id,
        action,
        remarks
      );
    } catch (err: any) {
      return rejectWithValue(err?.response?.data || err.message);
    }
  }
);

/* ================= SLICE ================= */
const allIndiaLevelSlice = createSlice({
  name: "allIndiaLevelIndex",
  initialState: {
    baseData: null as any,
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      /* ---------- FETCH ---------- */
      .addCase(fetchAllIndiaLevlIndexItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllIndiaLevlIndexItem.fulfilled, (state, action) => {
        state.loading = false;
        state.baseData = action.payload;
      })
      .addCase(fetchAllIndiaLevlIndexItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      /* ---------- APPROVAL ---------- */
      .addCase(approveAllIndiaLevelIndexItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(approveAllIndiaLevelIndexItem.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(approveAllIndiaLevelIndexItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default allIndiaLevelSlice.reducer;
