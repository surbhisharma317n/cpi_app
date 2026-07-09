import { fetchApi } from "../../http/axiosClient";

interface VerifyOtpPayload {
  
  login_token: string;
  otp: string;
}

interface VerifyOtpResponse {
  token: string;
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export const verifyOtpApi = {
  /**
   * Verify OTP and return auth token + user info
   */
  verify: async (
    data: VerifyOtpPayload,
    controller: AbortController
  ): Promise<VerifyOtpResponse> => {
    try {
      const response = await fetchApi<VerifyOtpResponse>({
        url: "api/verify-otp/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data,
        signal: controller.signal,
      });

      if (!response || !response.token) {
        throw new Error("Invalid OTP response");
      }

      return response;
    } catch (err: any) {
      console.error("OTP verification failed:", err);
      throw err;
    }
  },
};
