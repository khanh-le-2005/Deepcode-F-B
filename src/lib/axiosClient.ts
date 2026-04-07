import axios from 'axios';

const axiosClient = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  timeout: 30000,
  withCredentials: true, // Quan trọng: Cho phép gửi/nhận Cookie Http-Only (Refresh Token)
});

// Flag và hàng đợi để xử lý nhiều request lỗi 401 cùng lúc
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('qr_dine_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Tự động Refresh Token khi gặp lỗi 401
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    // Chỉ thử refresh nếu lỗi là 401 (Unauthorized) và không ở trang login
    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi API cấp lại Access Token mới (Backend đọc Refresh Token từ Cookie)
        const response = await axios.post(
          `${axiosClient.defaults.baseURL}/api/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        localStorage.setItem('qr_dine_access_token', accessToken);
        
        axiosClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Refresh thất bại -> Xoá sạch session và đá về Login
        localStorage.removeItem('qr_dine_access_token');
        localStorage.removeItem('qr_dine_user');
        
        if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/staff') || window.location.pathname.startsWith('/kitchen')) {
          window.location.href = '/auth/login?expired=true';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
