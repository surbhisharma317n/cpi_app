import type { User } from "../../../api/types/user";

export type LoginFormInputs = {
  username: string;
  password: string;
 
  captchaCode: string;
};

// export interface LoginFormProps {
//   onLoginSuccess?: () => void;
//   onLoginError?: (error: string) => void;
// }

export interface LoginFormProps {
  // onLoginSuccess?: (data: { user: any; token: string }) => void; // Replace 'any' with your User type if available
  // onLoginError?: (error: string) => void;

  onLoginSuccess?: (data: { user: User; token: string }) => void;
  onLoginError?: (error: string) => void;
}


// components/auth/LoginForm/types.ts
export interface LoginFormData {
  email: string;
  password: string;
  captcha: string;
  otp:string;
}

export interface LoginFormResponse {
  token?: string;
  error?: string;
}