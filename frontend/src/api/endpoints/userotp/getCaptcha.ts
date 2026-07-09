// services/authService.ts
import { fetchApi } from "../../http/axiosClient";

export const getCaptchaApi = async () => {
  const res = await fetchApi({
    url: "/api/get-captcha/",
    method: "GET",
  });

  return res; // { captcha_id, captcha }
};