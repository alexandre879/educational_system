import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/back/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});




api.interceptors.request.use((config) => {
  const token = Cookies.get("access");

  if (token && config.headers) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  if (config.headers) {
    const locale =
      typeof window !== "undefined"
        ? window.location.pathname.split("/")[1]
        : "ka";

    config.headers.set("Accept-Language", locale);
  }

  return config;
});



api.interceptors.response.use(
  (res) => res,
  async (error: any) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );

        Cookies.set('access', data.access, { sameSite: 'Strict' });
        originalRequest.headers.set('Authorization', `Bearer ${data.access}`);

        return api(originalRequest);
      } 
      catch (err) {
        Cookies.remove('access');
        Cookies.remove('refresh');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;