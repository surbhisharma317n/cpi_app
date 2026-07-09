import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayouts";
import CompileLayout from "../components/layouts/CompileLayout";
import ProtectedRoute from "../components/protectedRoute";
import ErrorFallback from "../components/ui/error/error_fallback";

import Login from "../pages/Login";
import ResetPassword from "../pages/ResetPassword";
import VerifyOTP from "../pages/VerifyOTP";
import Unauthorized from "../pages/Unauthorized";
import Home from "../pages/Home";

// Admin
import UserManagementPage from "../pages/authentication/UserManagementPage";

// Upload / CAPI
import UploadPage from "../pages/upload/UploadPage";
import Input_capi_report from "../pages/upload/input_report";
import Input_capi_report_New from "../pages/upload/input_report -New";
import Finalized_Capi_Input from "../pages/upload/finalized_capi_input";

// Compilation
import Compile_Data from "../pages/compilation/compile_data";
import CompilePriceData from "../pages/compilation/compile_price_data";
import Compile_Index from "../pages/upload/compile_index";
import ApproveIndex from "../pages/compilation/approve_index";
import Comp_indices from "../pages/upload/Comp_indices";
import FileUploadCompilation from "../pages/compilation2/FileUploadCompilation";

// Reference Data
import RefData from "../components/layouts/RefData";
import RefPrices from "../pages/reference_data/RefPrices";
import RefWeights from "../pages/reference_data/RefWeights";
import Jurisdiction from "../pages/reference_data/jurisdiction";
import Specification from "../pages/reference_data/ItemSpecification";
import Items from "../pages/reference_data/Items";
import MasterWeights from "../pages/reference_data/master_weights";
import Coicop from "../pages/reference_data/coicop";
import MarketDetails from "../pages/reference_data/market_details";

// Compile Workflow

import GenerateIndex from "../pages/compilation/generateindex";
import AnnexureReport from "../pages/compilation/annexture";
import Approval from "../pages/Approval";
import ViewReports from "../pages/view_reports";
import ViewCharts from "../pages/compilation/views_charts";

import { ROLES } from "../constants/roles";
import CapiData from "../pages/capi_data";

const routes = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/verify-otp",
    element: <VerifyOTP />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  {
     element: <ProtectedRoute />, // 🔐 Protect all main routes
     errorElement: <ErrorFallback />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        children: [
          { index: true, element: <Home /> },

          // ===== ADMIN ONLY =====
          {
             element: <ProtectedRoute roles={[ROLES.ADMIN]} />,
            children: [{ path: "users", element: <UserManagementPage /> }],
          },

          // ===== UPLOAD DATA =====
          {
            element: (
              <ProtectedRoute
                roles={[ROLES.ADMIN, ROLES.COMPILER, ROLES.APPROVER]}
              />
            ),
            children: [
              { path: "upload_data/upload_data", element: <UploadPage /> },
              {
                path: "upload_data/uploaded_data",
                element: <Input_capi_report />,
              },
              {
                path: "upload_data/uploaded_data_New",
                element: <Input_capi_report_New />,
              },
              {
                path: "upload_data/finalized_data",
                element: <Finalized_Capi_Input />,
              },
            ],
          },

          // ===== COMPILATION =====
          {
            element: (
              <ProtectedRoute
                roles={[ROLES.ADMIN, ROLES.APPROVER, ROLES.COMPILER]}
              />
            ),
            children: [
              {
                path: "compilation/compile_results",
                element: <Compile_Data />,
              },
              {
                path: "compilation/compile_price_data",
                element: <CompilePriceData />,
              },
              {
                path: "compilation/compilation_index",
                element: <Compile_Index />,
              },
              { path: "compilation/approve_index", element: <ApproveIndex /> },
              {
                path: "compilation/compilation_reports",
                element: <Comp_indices />,
              },
              {
                path: "compilation2/FileUploadCompilation",
                element: <FileUploadCompilation />,
              },
            ],
          },

          // ===== REFERENCE DATA =====
          {
            path: "reference_data",
            element: <RefData />,
            children: [
              { path: "explore", element: <RefPrices /> },
              { path: "weights", element: <RefWeights /> },
              { path: "jurisdiction", element: <Jurisdiction /> },
              { path: "specification", element: <Specification /> },
              { path: "items", element: <Items /> },
              { path: "weight", element: <MasterWeights /> },
              { path: "coicop_mapping", element: <Coicop /> },
              { path: "market_details", element: <MarketDetails /> },
            ],
          },

          // ===== COMPILE WORKFLOW =====
          {
            element: (
              <ProtectedRoute
                roles={[ROLES.ADMIN, ROLES.APPROVER, ROLES.COMPILER]}
              />
            ),
            children: [
              {
                path: "compile",
                element: <CompileLayout />,
                children: [
                  { path: "capi_data", element: <CapiData /> },
                  { path: "generateindex", element: <GenerateIndex /> },
                  { path: "annexture", element: <AnnexureReport /> },
                  { path: "approval", element: <Approval /> },
                  { path: "view_reports", element: <ViewReports /> },
                  { path: "view_charts", element: <ViewCharts /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// inject errorElement everywhere recursively
function withErrorBoundary(routes: any[]): any[] {
  console.log("Injecting error boundaries into routes:", routes);
  return routes.map((route) => ({
    ...route,
    errorElement: <ErrorFallback />,
    children: route.children ? withErrorBoundary(route.children) : undefined,
  }));
}

const router = createBrowserRouter(withErrorBoundary(routes));
console.log("Router configuration:", router);
export default router;
