import api from './api';

// ─────────────────────────────────────────────────────────
// 認證服務
// ─────────────────────────────────────────────────────────
export const authService = {
  // 登入
  login: async (username, password, role) => {
    const response = await api.post('/auth/login', {
      username,
      password,
      role
    });
    return response.data;
  },

  // 登出
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // 取得當前用戶資訊
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // 驗證 token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  // 刷新 token
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 街友服務
// ─────────────────────────────────────────────────────────
export const homelessService = {
  // 根據 QR code 取得街友資訊（公開 API，用於交易掃描）
  getByQrCode: async (qrCode) => {
    const response = await api.get(`/homeless/qr/${qrCode}`);
    return response.data;
  },

  // 取得所有街友列表（需認證）
  getAll: async (params = {}) => {
    const response = await api.get('/homeless', { params });
    return response.data;
  },

  // 取得單一街友詳細資料
  getById: async (id) => {
    const response = await api.get(`/homeless/${id}`);
    return response.data;
  },

  // 新增街友
  create: async (data) => {
    const response = await api.post('/homeless', {
      name: data.name,
      id_number: data.idNumber,
      phone: data.phone,
      address: data.address,
      emergency_contact: data.emergencyContact,
      emergency_phone: data.emergencyPhone,
      notes: data.notes
    });
    return response.data;
  },

  // 更新街友
  update: async (id, data) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.idNumber !== undefined) updateData.id_number = data.idNumber;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.emergencyContact !== undefined) updateData.emergency_contact = data.emergencyContact;
    if (data.emergencyPhone !== undefined) updateData.emergency_phone = data.emergencyPhone;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    const response = await api.patch(`/homeless/${id}`, updateData);
    return response.data;
  },

  // 刪除街友（軟刪除）
  delete: async (id) => {
    const response = await api.delete(`/homeless/${id}`);
    return response.data;
  },

  // 重新發放 QR Code
  reissueQrCode: async (id) => {
    const response = await api.post(`/homeless/${id}/reissue-qr`);
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 商店服務
// ─────────────────────────────────────────────────────────
export const storeService = {
  // 取得所有商店列表（需認證）
  getAll: async (params = {}) => {
    const response = await api.get('/stores', { params });
    return response.data;
  },

  // 取得單一商店詳細資料
  getById: async (id) => {
    const response = await api.get(`/stores/${id}`);
    return response.data;
  },

  // 新增商店
  create: async (data) => {
    const response = await api.post('/stores', {
      name: data.name,
      category: data.category,
      address: data.address,
      phone: data.phone,
      association_id: data.associationId
    });
    return response.data;
  },

  // 更新商店
  update: async (id, data) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.associationId !== undefined) updateData.association_id = data.associationId;

    const response = await api.patch(`/stores/${id}`, updateData);
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 產品服務
// ─────────────────────────────────────────────────────────
export const productService = {
  // 取得商店的產品列表
  getByStore: async (storeId, params = {}) => {
    const response = await api.get(`/stores/${storeId}/products`, { params });
    return response.data;
  },

  // 取得單一產品詳細資料
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // 新增產品
  create: async (storeId, data) => {
    const response = await api.post(`/stores/${storeId}/products`, {
      name: data.name,
      points: data.points,
      category: data.category,
      description: data.description
    });
    return response.data;
  },

  // 更新產品
  update: async (id, data) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const response = await api.patch(`/products/${id}`, updateData);
    return response.data;
  },

  // 刪除產品（軟刪除）
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 交易服務
// ─────────────────────────────────────────────────────────
export const transactionService = {
  // 建立交易（扣點）
  create: async (data) => {
    const response = await api.post('/transactions', {
      homeless_qr_code: data.homelessQrCode,
      store_qr_code: data.storeQrCode,
      product_id: data.productId,
      product_name: data.productName,
      amount: data.amount
    });
    return response.data;
  },

  // 取得交易記錄列表
  getAll: async (params = {}) => {
    const queryParams = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.homelessId) queryParams.homeless_id = params.homelessId;
    if (params.storeId) queryParams.store_id = params.storeId;
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    const response = await api.get('/transactions', { params: queryParams });
    return response.data;
  },

  // 取得單筆交易詳細資料
  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 配額服務（點數發放）
// ─────────────────────────────────────────────────────────
export const allocationService = {
  // 發放點數給街友
  create: async (data) => {
    const response = await api.post('/allocations', {
      homeless_id: data.homelessId,
      amount: data.amount,
      notes: data.notes
    });
    return response.data;
  },

  // 取得配額記錄列表
  getAll: async (params = {}) => {
    const queryParams = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.homelessId) queryParams.homeless_id = params.homelessId;
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    const response = await api.get('/allocations', { params: queryParams });
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 使用者帳號管理服務
// ─────────────────────────────────────────────────────────
export const userService = {
  // 取得夥伴帳號列表
  getAll: async (params = {}) => {
    const queryParams = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;

    const response = await api.get('/users', { params: queryParams });
    return response.data;
  },

  // 取得單一使用者
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // 新增夥伴帳號
  create: async (data) => {
    const response = await api.post('/users', {
      username: data.username,
      password: data.password,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone
    });
    return response.data;
  },

  // 更新夥伴帳號
  update: async (id, data) => {
    const body = {};
    if (data.username !== undefined) body.username = data.username;
    if (data.name !== undefined) body.name = data.name;
    if (data.role !== undefined) body.role = data.role;
    if (data.email !== undefined) body.email = data.email;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.password !== undefined && data.password !== '') body.password = data.password;
    const response = await api.patch(`/users/${id}`, body);
    return response.data;
  },

  // 刪除夥伴帳號
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 系統設定服務
// ─────────────────────────────────────────────────────────
export const configService = {
  // 取得所有設定
  getAll: async () => {
    const response = await api.get('/config');
    return response.data;
  },

  // 取得單一設定
  get: async (key) => {
    const response = await api.get(`/config/${key}`);
    return response.data;
  },

  // 更新設定
  update: async (key, data) => {
    const response = await api.patch(`/config/${key}`, {
      value: data.value,
      description: data.description
    });
    return response.data;
  }
};

// ─────────────────────────────────────────────────────────
// 報表服務
// ─────────────────────────────────────────────────────────
export const reportService = {
  // 取得統計摘要
  getSummary: async (params = {}) => {
    const queryParams = {};
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    const response = await api.get('/reports/summary', { params: queryParams });
    return response.data;
  },

  // 取得商店報表
  getStoreReport: async (storeId, params = {}) => {
    const queryParams = {};
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    const response = await api.get(`/reports/store/${storeId}`, { params: queryParams });
    return response.data;
  },

  // 匯出報表 CSV
  exportCsv: async (type, params = {}) => {
    const queryParams = { type };
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    const response = await api.get('/reports/export', {
      params: queryParams,
      responseType: 'blob'
    });

    // 建立下載連結
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  }
};
