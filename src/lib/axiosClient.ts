import axios from 'axios';

const axiosClient = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  timeout: 30000,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('qr_dine_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: xử lý chung các lỗi mạng hoặc lỗi xác thực (401, 403)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      // Token hết hạn hoặc không có quyền truy cập
      localStorage.removeItem('qr_dine_token');
      localStorage.removeItem('qr_dine_user');
      
      // Nếu có thể, báo cho app reload hoặc văng về login (nếu không ở môi trường Public)
      if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/staff') || window.location.pathname.startsWith('/kitchen')) {
         window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
