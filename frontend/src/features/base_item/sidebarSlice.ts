import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { capiService } from '../../api/endpoints/capi_data';



// interface sidebarState {
//   baseData: any[];           // Replace `any` with proper type if available
//   loading: boolean;
//   error: string | null;
// }

// const initialState: sidebarState = {
//   baseData: [],
//   loading: false,
//   error: null,
// };
// // interface BaseItem {
// //   id: number;
// //   name: string;
// //   code: string;
// //   // add more fields if needed
// // }


// // Thunk to fetch CAPI data
// // export const fetchSidebar = createAsyncThunk<any[], { tab: string }, { rejectValue: string }>(
// //   'base/sidebar',
// //   async (
// //     { tab }: { tab: string },
// //     { rejectWithValue }
// //   ) => {
// //     try {
// //       return await capiService.getSidebarItem() as any[];
// //     } catch (err: any) {
// //       return rejectWithValue(err?.response?.data || err.message);
// //     }
// //   }
// // );



// // ✅ Fetch sidebar menu
// export const fetchSidebar = createAsyncThunk('sidebar/fetch', async (_, { rejectWithValue }) => {
//   try {
//     return await capiService.sidebar(); // GET request automatically sends token
//   } catch (err: any) {
//     return rejectWithValue(err);
//   }
// });

// // ✅ Update sidebar roles
// export const updateSidebarRoles = createAsyncThunk(
//   'sidebar/updateRoles',
//   async (data: any, { rejectWithValue }) => {
//     try {
//       return await capiService.sidebar(data); // PUT request automatically sends token
//     } catch (err: any) {
//       return rejectWithValue(err);
//     }
//   }
// );

// const sidebarSlice = createSlice({
//   name: 'sidebar',
//   initialState,
//   reducers: {
//     resetSidebar: () => initialState,
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchSidebar.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchSidebar.fulfilled, (state, action: PayloadAction<any[]>) => {
//         state.loading = false;
//         state.baseData = action.payload;
//       })
//       .addCase(fetchSidebar.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string;
//       })
//       .addCase(updateSidebarRoles.fulfilled, (state, action) => {
//         state.baseData = action.payload; // refresh sidebar after update
//       })
//       .addCase(updateSidebarRoles.rejected, (state, action) => {
//         state.error = action.payload as string;
//       });
//   },
// });

// export const { resetSidebar } = sidebarSlice.actions;
// export default sidebarSlice.reducer;






interface SidebarState {
  baseData: any[];
  loading: boolean;
  error: string | null;
}

const initialState: SidebarState = {
  baseData: [],
  loading: false,
  error: null,
};

export const fetchSidebar = createAsyncThunk('sidebar/fetch', async (_, { rejectWithValue }) => {
  try {
    return await capiService.sidebar();
  } catch (err: any) {
    return rejectWithValue(err);
  }
});

export const updateSidebarRoles = createAsyncThunk(
  'sidebar/updateRoles',
  async (data: any, { rejectWithValue }) => {
    try {
      return await capiService.sidebar(data);
    } catch (err: any) {
      return rejectWithValue(err);
    }
  }
);

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: { resetSidebar: () => initialState },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSidebar.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSidebar.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.loading = false; state.baseData = action.payload;
      })
      .addCase(fetchSidebar.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(updateSidebarRoles.fulfilled, (state, action) => {
        state.baseData = action.payload;
      })
      .addCase(updateSidebarRoles.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { resetSidebar } = sidebarSlice.actions;
export default sidebarSlice.reducer;

