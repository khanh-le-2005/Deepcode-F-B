import axios from 'axios';

const axiosClient = axios.create({
  baseURL: window.location.protocol + '//' + window.location.hostname + ':3001',
  timeout: 30000,
  // Quan trọng: Bắt buộc bật để gửi/nhận Refresh Token qua HttpOnly Cookie từ Backend
  withCredentials: true, 
});

// --- CÁC BIẾN DÙNG CHO HÀNG ĐỢI REFRESH TOKEN ---
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. INTERCEPTOR REQUEST: Đính kèm Access Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('qr_dine_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. INTERCEPTOR RESPONSE: Bắt lỗi 401 & Silent Refresh
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Bỏ qua nếu lỗi xuất phát từ các endpoint auth để tránh loop vô tận
      if (originalRequest.url.includes('/auth/refresh-token') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // NẾU ĐANG REFRESH: Đưa các request 401 tiếp theo vào hàng đợi
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      // Bắt đầu quá trình Refresh
      isRefreshing = true;

      try {
        // GỌI ĐÚNG API CỦA BẠN
        const rs = await axios.post(
            `${axiosClient.defaults.baseURL}/api/auth/refresh-token`, 
            {}, 
            { withCredentials: true }
        );

        // Lấy token từ cục data trả về. (Tuỳ backend trả về là 'token' hay 'accessToken')
        const newAccessToken = rs.data.token || rs.data.accessToken;

        if (!newAccessToken) {
            throw new Error("Không nhận được token mới từ server");
        }

        // Lưu mới vào LocalStorage
        localStorage.setItem('qr_dine_access_token', newAccessToken);

        // Cập nhật token cho request hiện tại
        axiosClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers.Authorization = 'Bearer ' + newAccessToken;

        // Giải phóng hàng đợi, cho phép các request đang chờ tiếp tục chạy
        processQueue(null, newAccessToken);

        // Chạy lại request đầu tiên bị lỗi
        return axiosClient(originalRequest);

      } catch (err) {
        // NẾU REFRESH TOKEN THẤT BẠI (Do hết hạn Refresh Token hoặc Cookie bị xóa)
        processQueue(err, null);
        
        // Dọn dẹp xác chết
        localStorage.removeItem('qr_dine_access_token');
        localStorage.removeItem('qr_dine_user');

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;