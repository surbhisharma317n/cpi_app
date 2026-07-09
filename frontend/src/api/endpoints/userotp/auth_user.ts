// services/authService.ts
import { fetchApi } from "../../http/axiosClient";
// import type { User } from "../../types/user";

export const UserAuth = {
  /**
   * Fetch CAPI data
   */


  /**
   * Get Captcha
   */
  getCaptchaApi: async (): Promise<{
    captcha_id: string;
    captcha: string;
  }> => {
    return await fetchApi({
      url: "/api/captcha/",
      method: "GET",
    });

    
  },

};
