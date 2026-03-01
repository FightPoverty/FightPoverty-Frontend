import axios from 'axios';

// 創建 axios 實例
const api = axios.create({
  // 生產環境 (Zeabur)：VITE_API_URL 會讀取到我們設定的 https://backend.zeabur.app/api
  // 本地開發 (Local/Docker)：VITE_API_URL 為空，自動 Fallback 使用相對路徑 '/api'，
  // 接著交由 vite.config.js 裡的 proxy 去接手並轉發給 localhost:3001 或 backend:3001
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // 允許發送 cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器 - 自動處理 token 刷新
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 錯誤且 token 過期，嘗試刷新
    if (
      error.response?.status === 401 &&
      error.response?.data?.expired &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // 呼叫刷新 token API
        await axios.post('/api/auth/refresh', {}, {
          withCredentials: true
        });

        // 重新發送原始請求
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新失敗，跳轉到登入頁
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
