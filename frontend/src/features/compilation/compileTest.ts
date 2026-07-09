// import { createAsyncThunk } from "@reduxjs/toolkit";
// import type { AxiosError } from "axios";


// interface CompileResponse {
//   compilation_id: number;
//   message?: string;
// }

// export const compileIndexData = createAsyncThunk<
//   CompileResponse,            // ✅ success return type
//   CompileFilters,             // ✅ argument type
//   { rejectValue: string }     // ✅ rejectWithValue type
// >(
//   "compile/index",
//   async (filters, { rejectWithValue }) => {
//     try {
//       const response = await capiService.CompieIndexItem(filters);

//       // ✅ Defensive validation
//       if (!response || !response.compilation_id) {
//         throw new Error("Invalid compilation response");
//       }

//       return response;
//     } catch (err) {
//       const error = err as AxiosError<any>;

//       // ✅ Prefer backend error message if available
//       if (error.response?.data?.error) {
//         return rejectWithValue(error.response.data.error);
//       }

//       if (error.response?.data?.message) {
//         return rejectWithValue(error.response.data.message);
//       }

//       return rejectWithValue("Compilation failed");
//     }
//   }
// );
