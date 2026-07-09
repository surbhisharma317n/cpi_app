// import { fetchApi } from '../../http/axiosClient';
// import type { User } from '../../types/user';

// export const userLogin = {
//   /**
//    * Login a user and return User + token
//    */
//   login_user: async (
//     credentials: { email: string; password: string,captcha:string },
//     controller: AbortController
//   ): Promise<{ token: string; id: number; email: string; role: string; firstName?: string; lastName?: string }> => {
//     try {
//       const response = await fetchApi<{
//         token: string;
//         id: number;
//         email: string;
//         role: string;
//         firstName?: string;
//         lastName?: string;
//       }>({
//         url: '/api/login/',
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-Requested-With': 'XMLHttpRequest',
//         },
//         data: credentials,
//         signal: controller.signal,
//       });

//       if (!response || !response.token) {
//         throw new Error('Invalid server response');
//       }

//       return response;
//     } catch (err: any) {
//       console.error('Login failed:', err);
//       throw err;
//     }
//   },

//   /**
//    * Optional helper: batch fetch user data
//    */
//   userLoginData: async (
//     credentials: { email: string; password: string,captcha:string },
//     controller: AbortController
//   ): Promise<[User]> => {
//     const userResponse = await userLogin.login_user(credentials, controller);

//     // Map API response to User type
//     const user: User = {
//       id: userResponse.id,
//       email: userResponse.email,
//       role: userResponse.role,
//       username: userResponse.email, // or use your own field
//       first_name: userResponse.firstName || '',
//       last_name: userResponse.lastName || '',
//       full_name: `${userResponse.firstName || ''} ${userResponse.lastName || ''}`.trim(),
//       last_login: '',
//     };

//     return [user];
//   },
// };


import { fetchApi } from "../../http/axiosClient";

/* -------------------- Types -------------------- */

export interface LoginOtpResponse {
  message: string;
  login_token: string;
  otpstatus: "success" | "failed";
}

/* -------------------- API -------------------- */

export const userLogin = {
  /**
   * STEP 1: Login with password + captcha
   * → Sends OTP, DOES NOT authenticate user
   */
  login_user: async (
    credentials: {
      email: string;
      password: string;
      captcha: string;
      captcha_id: string;
    },
    controller: AbortController
  ): Promise<LoginOtpResponse> => {
    try {
      const response = await fetchApi<LoginOtpResponse>({
        url: "/api/login/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        data: credentials,
        signal: controller.signal,
      });

      if (!response || response.otpstatus !== "success") {
        throw new Error(response?.message || "OTP sending failed");
      }

      return response;
    } catch (err: any) {
      console.error("Login (OTP) failed:", err);
      throw err;
    }
  },
};
