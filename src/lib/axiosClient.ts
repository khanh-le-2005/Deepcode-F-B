import axios from 'axios';

const axiosClient = axios.create({
  // baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  baseURL:'http://localhost:3000',

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

// Response interceptor: Đơn giản hóa để khớp với Backend (không có Refresh Token)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Nếu gặp lỗi 401 (Unauthorized) ở các trang bảo mật -> Yêu cầu đăng nhập lại
    if (status === 401) {
      const isAuthPage = window.location.pathname.startsWith('/auth/login');
      if (!isAuthPage && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/staff') || window.location.pathname.startsWith('/kitchen'))) {
        localStorage.removeItem('qr_dine_access_token');
        localStorage.removeItem('qr_dine_user');
        window.location.href = '/auth/login?expired=true';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
