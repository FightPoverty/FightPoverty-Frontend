import React, { useState } from 'react';
import { USER_ROLES, ROLE_NAMES } from '../constants/userRoles';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = '請輸入使用者名稱';
    }
    
    if (!formData.password) {
      newErrors.password = '請輸入密碼';
    } else if (formData.password.length < 6) {
      newErrors.password = '密碼至少需要 6 個字元';
    }
    
    if (!formData.role) {
      newErrors.role = '請選擇角色';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await onLogin(formData);

      if (!result.success) {
        setErrors({
          ...errors,
          submit: result.message || '登入失敗，請檢查您的帳號密碼'
        });
      }
    } catch (error) {
      setErrors({
        ...errors,
        submit: '登入失敗，請稍後再試'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // 清除對應的錯誤訊息
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const quickLogin = (role) => {
    // 根據角色設定對應的測試帳號和密碼
    const credentials = {
      [USER_ROLES.NGO_ADMIN]: { username: 'admin', password: 'admin123' },
      [USER_ROLES.STORE]: { username: 'store1', password: 'store123' },
      [USER_ROLES.HOMELESS]: { username: 'homeless1', password: 'homeless123' },
      [USER_ROLES.NGO_PARTNER]: { username: 'ngo_partner', password: 'partner123' },
      [USER_ROLES.ASSOCIATION_ADMIN]: { username: 'association', password: 'assoc123' },
      [USER_ROLES.ASSOCIATION_PARTNER]: { username: 'association', password: 'assoc123' }
    };

    const cred = credentials[role];
    if (cred) {
      setFormData({
        username: cred.username,
        password: cred.password,
        role
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo 區域 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl text-white">🏠</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            街友捐款管理平台
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            連結愛心，共築希望
          </p>
        </div>

        {/* 登入表單 */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                使用者名稱
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                  errors.username ? 'border-red-300 text-red-900' : 'border-gray-300'
                }`}
                placeholder="輸入您的使用者名稱"
                value={formData.username}
                onChange={handleChange}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                  errors.password ? 'border-red-300 text-red-900' : 'border-gray-300'
                }`}
                placeholder="輸入您的密碼"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                登入角色
              </label>
              <select
                id="role"
                name="role"
                required
                className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                  errors.role ? 'border-red-300 text-red-900' : 'border-gray-300'
                }`}
                value={formData.role}
                onChange={handleChange}
              >
                <option value="">請選擇您的角色</option>
                {Object.entries(USER_ROLES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {ROLE_NAMES[value]}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600 text-center">{errors.submit}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  登入中...
                </div>
              ) : (
                '登入系統'
              )}
            </button>
          </div>
        </form>

        {/* 快速登入 */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">快速登入測試</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => quickLogin(USER_ROLES.NGO_ADMIN)}
              className="px-3 py-2 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
            >
              NGO 管理員
            </button>
            <button
              onClick={() => quickLogin(USER_ROLES.STORE)}
              className="px-3 py-2 text-xs bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 transition-colors"
            >
              店家
            </button>
            <button
              onClick={() => quickLogin(USER_ROLES.NGO_PARTNER)}
              className="px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              NGO 夥伴
            </button>
            <button
              onClick={() => quickLogin(USER_ROLES.ASSOCIATION_ADMIN)}
              className="px-3 py-2 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
            >
              協會管理員
            </button>
            <button
              onClick={() => quickLogin(USER_ROLES.ASSOCIATION_PARTNER)}
              className="px-3 py-2 text-xs bg-teal-100 text-teal-800 rounded-md hover:bg-teal-200 transition-colors"
            >
              協會夥伴
            </button>
            <button
              onClick={() => quickLogin(USER_ROLES.HOMELESS)}
              className="px-3 py-2 text-xs bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 transition-colors"
            >
              無家者 (街友)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;