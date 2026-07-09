import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { capiService } from "../../api/endpoints/capi_data";

/* =====================================================
   Types
===================================================== */

export interface ApprovalRequest {
  id: number;
  compilation_id: number;
  compiler_name: string;
  compiled_at: string;
  month: string;
  year: number;
  compile_type: string;
  iteration: number;
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  approver_id: number | null;
  approver_comment: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface ApprovalFilters {
  page?: number;
  page_size?: number;
  month?: string;
  year?: number;
  iteration?: number;
  compile_type?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  search?: string;
}

interface ApprovalState {
  list: ApprovalRequest[];
  total: number;
  page: number;
  pageSize: number;
  status: "IDLE" | "LOADING" | "SUCCESS" | "FAILED";
  error: string | null;
}

/* =====================================================
   Initial State
===================================================== */

const initialState: ApprovalState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  status: "IDLE",
  error: null,
};

/* =====================================================
   Thunks
===================================================== */

export const fetchApprovalRequests = createAsyncThunk<
  { results: ApprovalRequest[]; count: number },
  ApprovalFilters,
  { rejectValue: string }
>(
  "approval/fetchAll",
  async (filters, { rejectWithValue }) => {
    try {
      const response = await capiService.getApprovalDetails(filters);
      return {
        results: (response as any).results,
        count: (response as any).count,
      };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to fetch approval requests"
      );
    }
  }
);

export const approveRejectApprovalRequest = createAsyncThunk<
  { message: string },
  { id: number; action: "APPROVED" | "REJECTED"; comment?: string },
  { rejectValue: string }
>(
  "approval/action",
  async ({ id, action, comment }, { rejectWithValue }) => {
    try {
      const response = await capiService.approveRejectRequest(id, {
        action,
        comment,
      });

      return response as { message: string };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error || "Approval action failed"
      );
    }
  }
);
/* =====================================================
   Slice
===================================================== */

const approvalRequestSlice = createSlice({
  name: "approval",
  initialState,
  reducers: {
    resetApprovalState: () => initialState,
  },
  extraReducers: (builder) => {
    builder

      /* ---------- Fetch List ---------- */
      .addCase(fetchApprovalRequests.pending, (state) => {
        state.status = "LOADING";
        state.error = null;
      })
      .addCase(
        fetchApprovalRequests.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: ApprovalRequest[];
            count: number;
          }>
        ) => {
          state.status = "SUCCESS";
          state.list = action.payload.results;
          state.total = action.payload.count;
        }
      )
      .addCase(fetchApprovalRequests.rejected, (state, action) => {
        state.status = "FAILED";
        state.error = action.payload as string;
      })

      /* ---------- Approve / Reject ---------- */
      .addCase(approveRejectApprovalRequest.pending, (state) => {
        state.status = "LOADING";
      })
      .addCase(approveRejectApprovalRequest.fulfilled, (state) => {
        state.status = "SUCCESS";
      })
      .addCase(approveRejectApprovalRequest.rejected, (state, action) => {
        state.status = "FAILED";
        state.error = action.payload as string;
      });
  },
});

/* =====================================================
   Exports
===================================================== */

export const { resetApprovalState } = approvalRequestSlice.actions;
export default approvalRequestSlice.reducer;
