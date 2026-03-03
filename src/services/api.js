import axios from 'axios';

// ─────────────────────────────────────────────────────────
// 資料轉換工具函數
// ─────────────────────────────────────────────────────────

/**
 * 將 snake_case 字串轉換為 camelCase
 */
const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * 將物件的 key 從 snake_case 轉換為 camelCase（遞迴處理）
 */
const convertKeysToCamel = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamel);
  }

  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = convertKeysToCamel(obj[key]);
      return result;
    }, {});
  }

  return obj;
};

// ─────────────────────────────────────────────────────────
// Token 管理工具（localStorage）
// ─────────────────────────────────────────────────────────
export const tokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),

  setTokens: (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  },

  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// ─────────────────────────────────────────────────────────
// 創建 axios 實例
// ─────────────────────────────────────────────────────────
const api = axios.create({
  // 生產環境 (Zeabur)：VITE_API_URL 會讀取到我們設定的 https://backend.zeabur.app/api
  // 本地開發 (Local/Docker)：VITE_API_URL 為空，自動 Fallback 使用相對路徑 '/api'，
  // 接著交由 vite.config.js 裡的 proxy 去接手並轉發給 localhost:3001 或 backend:3001
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // 保留 cookie 向後相容
  headers: {
    'Content-Type': 'application/json'
  }
});

// 請求攔截器 — 自動附加 Authorization header
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器 — 自動處理 token 刷新和資料轉換
api.interceptors.response.use(
  (response) => {
    // 跳過 Blob 類型的回應（檔案下載）
    if (response.data instanceof Blob) {
      return response;
    }
    // 將 response.data 中的 snake_case 轉換為 camelCase
    if (response.data && typeof response.data === 'object') {
      response.data = convertKeysToCamel(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 錯誤且尚未重試，嘗試用 refresh token 刷新
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        // 沒有 refresh token，直接跳轉登入頁
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // 呼叫刷新 token API（用 Authorization header 傳送 refresh token）
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
            withCredentials: true,
          }
        );

        const newAccessToken = refreshResponse.data?.accessToken
          || refreshResponse.data?.access_token;

        if (newAccessToken) {
          tokenManager.setTokens(newAccessToken, null);
          // 更新原始請求的 Authorization header
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // 重新發送原始請求
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新失敗，清除 token 並跳轉到登入頁
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 將錯誤回應的 data 也轉換為 camelCase
    if (error.response?.data && typeof error.response.data === 'object') {
      error.response.data = convertKeysToCamel(error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;
