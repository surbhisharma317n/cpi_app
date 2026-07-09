import { fetchApi } from "../../http/axiosClient";
import type { User, AddUserPayload, UserProfile } from "../../types/user";

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

interface MasterWeightsParams {
  tab: string;
  subtab: string;
  limit: number;
  offset: number;
}

interface MasterWeightsResponse {
  data: any[];
  columns: string[];
  total_pages: number;
  total_records: number;
}

export const capiService = {
  /**
   * Fetch CAPI data by month_year, table name, and iterationation
   * @returns Promise<User[]> List of users
   */
  getCapiData: async (
    month_year: string,
    tab: string,
    iteration: number,
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      month_year,
      tab,
      iteration: iteration.toString(),
    }).toString();

    return fetchApi({
      url: `/api/get_capi?${query}`,
      method: "GET",
    });
  },

  getBaseItem: async (tab: string): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
    }).toString();

    return fetchApi({
      url: `/api/base_item?${query}`,
      method: "GET",
    });
  },

  getJurisdictionItem: async (tab: string): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
    }).toString();

    return fetchApi({
      url: `/api/jurisdiction?${query}`,
      method: "GET",
    });
  },

  getInputPriceItem: async (
    tab: string,
    filters: any,
    page: number,
    pageSize: number,
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
      month: filters.month ?? "",
      year: filters.year ?? "",
      compile_type: filters.compile_type ?? "",
      page: page.toString(),
      page_size: pageSize.toString(),
    }).toString();

    console.log("Query string for getInputPriceItem:", query); // ✅ Debug log

    return fetchApi({
      url: `/api/input_price_item?${query}`,
      method: "GET",
    });
  },

getCoicopItemDetails: (params?: {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
}): Promise<any> => {
  return fetchApi({
    url: `/api/coicop_details/`,
    method: "GET",
    params, // ✅ VERY IMPORTANT
  });
},



// -----------------------------
// API CALL
// -----------------------------
getMarketItemDetails: (
  params?: MarketParams
): Promise<MarketResponse> => {
  return fetchApi({
    url: `/api/market_details/`,
    method: "GET",
    params, // ✅ correct
  });
},
  getFinalInputPriceItem: async (
    tab: string,
    filters: any,
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
      month: filters.month ?? "",
      year: filters.year ?? "",
      compile_type: filters.compile_type ?? "",
    }).toString();

    return fetchApi({
      url: `/api/final_input_price_item?${query}`,
      method: "GET",
    });
  },

  // All India Index Item
  getAllIndiaIndexItem: async (
    tab: string,
    subtab: string,
    filters: any,
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
      subtab,
      month: filters.month ?? "",
      year: filters.year ?? "",
      compile_type: filters.compile_type ?? "",
    }).toString();
    return fetchApi({
      url: `/api/all_india_index_item?${query}`,
      method: "GET",
    });
  },

  // All India Index Item
  getAllIndiaLevelIndexItem: async (
    tab: string,
    subtab: string,
    filters: any,
    page: number,
    pagesize: number,
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
      subtab,
      month: filters.month ?? "",
      year: filters.year ?? "",
      compile_type: filters.compile_type ?? "",
      page: page.toString(),
      page_size: pagesize.toString(),
    }).toString();
    return fetchApi({
      url: `/api/all_india_level_index_item?${query}`,
      method: "GET",
    });
  },

  ExportAllIndiaLevelIndexItem: async (
    tab: string,
    subtab: string,
    filters: any,
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      tab,
      subtab,
      month: filters.month ?? "",
      year: filters.year ?? "",
      compile_type: filters.compile_type ?? "",
    }).toString();
    return fetchApi({
      url: `/api/download_all_india_excel_respective_tabs?${query}`,
      method: "GET",
    });
  },

  ExportAllIndiaLevelIndexItemData: async (
    tab: string,
    subTab: string,
    filters: any,
  ): Promise<any> => {
    return fetchApi({
      url: "/api/export_all_india_index/",
      method: "POST",
      data: {
        tab,
        subTab,
        month: filters.month,
        year: filters.year,
        compile_type: filters.compile_type,
      },
    });
  },

  CompieIndexItem: async (filters: any) => {
    return fetchApi({
      url: "/api/compilation-index/",
      method: "POST",
      data: {
        month: filters.month,
        year: filters.year,
        compile_type: filters.compile_type,
      },
    });
  },


  getCompilationFilters: async () => {
  return fetchApi({
    url: "/api/compilation_filter/",
    method: "GET",
  });
},

getFilters: async () => {
  return fetchApi({
    url: "/api/filter/",
    method: "GET",
  });
},

  // getApprovalDetails: async (filters: any) => {
  //   return fetchApi({
  //     url: "/api/approval-requests/",
  //     method: "GET",
  //     params: {
  //       month: filters?.month || undefined,
  //       year: filters?.year || undefined,
  //       iteration: filters?.iteration || undefined,
  //       compile_type: filters?.compile_type || undefined,
  //       search: filters?.search || undefined,
  //     },
  //   });
  // },

  //; Fetch approval list
  //=============================== */
  getApprovalDetails: async (params: ApprovalFilters) => {
    return fetchApi({
      url: "/api/approval-requests/",
      method: "GET",
      params,
    });
  },

  /* ===============================
     Fetch approval request by ID
  =============================== */
  getApprovalRequestById: async (id: number) => {
    return fetchApi({
      url: `/api/approval-requests/${id}/`,
      method: "GET",
    });
  },

  /* ===============================
     Approve / Reject request
  =============================== */
  approveRejectRequest: async (
    id: number,
    payload: { action: "APPROVED" | "REJECTED"; comment?: string },
  ) => {
    return fetchApi({
      url: `/api/approval-requests/${id}/action/`,
      method: "POST",
      data: payload,
    });
  },

  /* ---------- GET INDEX LIST ---------- */
  // getAllIndiaLevelIndexItem: async (
  //     tab: string,
  //     subtab: string,
  //     filters: any
  //   ): Promise<any[]> => {
  //     const query = new URLSearchParams({
  //       tab,
  //       subtab,
  //       month: filters?.month ?? "",
  //       year: filters?.year ?? "",
  //       compile_type: filters?.compile_type ?? "",
  //     }).toString();

  //     return fetchApi({
  //       url: `/api/all_india_level_index_item?${query}`,
  //       method: "GET",
  //     });
  //   },

  /* ---------- APPROVE / REJECT ---------- */
  approveAllIndiaLevelIndexItem: async (
    id: number,
    action: "APPROVE" | "REJECT",
    remarks?: string,
  ): Promise<any> => {
    return fetchApi({
      url: "/api/approve_all_india_level_index_item/",
      method: "POST",
      data: {
        id,
        action,
        remarks,
      },
    });
  },

  // getAllIndiaLevelIndexItem: async (
  //   tab: string,
  //   subtab: string,
  //   filters: any
  // ) => {
  //   const query = new URLSearchParams({
  //     tab,
  //     subtab,
  //     month: filters.month ?? "",
  //     year: filters.year ?? "",
  //     compile_type: filters.compile_type ?? "",
  //   }).toString();

  //   return fetchApi({
  //     url: `/api/all_india_level_index_item?${query}`,
  //     method: "GET",
  //   });
  // },

  // approveAllIndiaLevelIndexItem: async (
  //   id: number,
  //   action: "APPROVE" | "REJECT",
  //   remarks: string
  // ) => {
  //   return fetchApi({
  //     url: `/api/all_india_level_index_item/approve/`,
  //     method: "POST",
  //     data: {
  //       id,
  //       action,
  //       remarks,
  //     },
  //   });
  // },



// -----------------------------
// API FUNCTION
// -----------------------------
getMasterItemsWeights: async (
  params: MasterWeightsParams
): Promise<MasterWeightsResponse> => {
  const query = new URLSearchParams({
    tab: params.tab,
    subtab: params.subtab,
    limit: String(params.limit),
    offset: String(params.offset),
  }).toString();

  return fetchApi({
    url: `/api/master_item_weights?${query}`,
    method: "GET",
  });
},

  getSidebarItem: async (): Promise<any[]> => {
    return fetchApi({
      url: `/api/sidebar`,
      method: "GET",
    });
  },

  sidebar: async (data?: any): Promise<any> => {
    console.log("API called with data:", data);
    return fetchApi({
      url: `/api/sidebar/`, // ✅ Correct: include ID for PUT
      method: data ? "PUT" : "GET",
      data: data ? { items: data } : undefined, // ✅ Correct: use "data" for PUT
    });
  },

  uploadStart: (formData: FormData) =>
    fetchApi({
      url: "/api/cpi/upload/start",
      method: "POST",
      data: formData,
    }),

  uploadStatus: (sessionId: string) =>
    fetchApi({
      url: `/api/cpi/upload/status/${sessionId}`,
      method: "GET",
    }),

  compileStart: (payload: any) =>
    fetchApi({
      url: "/api/cpi/compile/start",
      method: "POST",
      data: payload,
    }),

  compileStatus: (taskId: string) =>
    fetchApi({
      url: `/api/cpi/compile/status/${taskId}`,
      method: "GET",
    }),

  dbImportStart: (taskId: string, payload: any) =>
    fetchApi({
      url: `/api/cpi/compilation/import/${taskId}`,
      method: "POST",
      data: payload,
    }),

  dbImportStatus: (taskId: string) =>
    fetchApi({
      url: `/api/cpi/database/import/status/${taskId}`,
      method: "GET",
    }),

  getCompileReports: async (month_year: string): Promise<any[]> => {
    const query = new URLSearchParams({
      month_year,
    }).toString();

    return fetchApi({
      url: `/api/weight_reports?${query}`,
      method: "GET",
    });
  },

  /**
   * Get user by ID
   * @param userId string User ID
   * @returns Promise<User> User details
   */
  getUserById: async (userId: string): Promise<User> => {
    return fetchApi({
      url: `/api/user/${userId}`,
      method: "GET",
    });
  },

  /**
   * Add new user
   * @param payload AddUserPayload User details
   * @returns Promise<User> Created user
   */
  addUser: async (payload: AddUserPayload): Promise<User> => {
    return fetchApi({
      url: "/api/user/",
      method: "POST",
      data: payload,
    });
  },

  /**
   * Batch fetch essential user data
   * @returns Promise<[User[], UserProfile]> Tuple with users list and current profile
   */
  getUserDashboardData: async (
    month_year: string,
    tab: string,
    iteration: number,
  ): Promise<[User[], UserProfile]> => {
    return Promise.all([
      capiService.getCapiData(month_year, tab, iteration),
      capiService.getUserProfile(),
    ]);
  },

  /**
   * Get current user profile
   * @returns Promise<UserProfile>
   */
  getUserProfile: async (): Promise<UserProfile> => {
    return fetchApi({
      url: "/api/user/profile",
      method: "GET",
    });
  },
};
