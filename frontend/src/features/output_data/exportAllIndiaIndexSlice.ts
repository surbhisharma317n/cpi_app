// download_all_india_excel_respective_tabs.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

interface ExportState {
  loading: boolean;
  error: string | null;
}

const initialState: ExportState = {
  loading: false,
  error: null,
};

/**
 * Export API (NO data stored in redux)
 */
export const exportAllIndiaLevelIndex = createAsyncThunk(
  "export/AllIndiaIndex",
  async (
    {
      tab,
      subTab,
      dataType,
    }: {
      tab: string;
      subTab: string;
      dataType: any;
    },
    { rejectWithValue }
  ) => {
    try {
      return await capiService.ExportAllIndiaLevelIndexItemData(
        tab,
        subTab,
        dataType
      );
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data || err.message || "Export failed"
      );
    }
  }
);

const exportSlice = createSlice({
  name: "exportAllIndia",
  initialState,
  reducers: {
    resetExportState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(exportAllIndiaLevelIndex.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportAllIndiaLevelIndex.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(exportAllIndiaLevelIndex.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to export data";
      });
  },
});

export const { resetExportState } = exportSlice.actions;
export default exportSlice.reducer;
