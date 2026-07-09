// import { configureStore } from '@reduxjs/toolkit'

// import compilationReducer from '../features/compilationSlice';
// import type { ThunkAction, Action } from '@reduxjs/toolkit';
// import authReducer from '../features/auth/authSlice';

// export const store = configureStore({
//   reducer: {
//     auth: authReducer,
//     compilation: compilationReducer,
//   },
// })

// export type AppDispatch = typeof store.dispatch;
// export type RootState = ReturnType<typeof store.getState>;
// export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import type { ThunkAction, Action } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import compilationReducer from "../features/compilationSlice";
import capiReducer from "../features/capi/capiSlice";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import baseReducer from "../features/base_item/baseSlice";
import sidebarReducer from "../features/base_item/sidebarSlice";
import compileReducer from "../features/base_item/compileSlice";
import inputReportReducer from "../features/input_data/inputReportSlice";
import finalInputReportReducer from "../features/input_data/finalInputReportSlice";
import allIndiaIndexReducer from "../features/output_data/allIndiaSlice";
import allIndiaLevelIndexReducer from "../features/output_data/allIndiaLevelSlice";
import coicopDatailsReducer from "../features/master_data/coicopSlice";
import marketDetailsReducer from "../features/master_data/marketSlice";
import itemWeightsDetails from "../features/master_data/weightsSlice";
import ExportAllIndiaData from "../features/output_data/exportAllIndiaIndexSlice";
import CompileReducer from "../features/compilation/compileSlice";
import approveRejectApprovalRequest from "../features/compilation/approvalRequestSlice";
import fetchApprovalRequests from "../features/compilation/approvalRequestSlice";
import fetchCaptcha from "../features/auth/captchaSlice";
import compilationSlice from "../features/compilation/compilationSlice";

// Persist configuration
const persistConfig = {
  key: "root",
  version: 1,
  storage,
  whitelist: ["auth"], // Only persist the auth reducer
};

const rootReducer = combineReducers({
  auth: authReducer, // ✅ include auth reducer
  compilation: compilationReducer,
  capi: capiReducer,
  base: baseReducer,
  sidebar: sidebarReducer,
  compile: compileReducer,
  inputReport: inputReportReducer,
  finalInputReport: finalInputReportReducer,
  allIndiaIndex: allIndiaIndexReducer,
  allIndiaLevelIndex: allIndiaLevelIndexReducer,
  coicopDetails: coicopDatailsReducer,
  marketDeatils: marketDetailsReducer,
  itemsWeightsDetails: itemWeightsDetails,
  ExportAllIndiaLevelData: ExportAllIndiaData,
  compileIndexData: CompileReducer,
  fetchApprovalRequests: fetchApprovalRequests,
  approveRejectApprovalRequest: approveRejectApprovalRequest,
  fetchCaptcha: fetchCaptcha,
  compilationSlice: compilationSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], // ✅ added REGISTER too
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
