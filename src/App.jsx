import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import NGOAdminDashboard from './pages/NGOAdmin/Dashboard';
import StoreDashboard from './pages/Store/Dashboard';
import AssociationDashboard from './pages/Association/Dashboard';
import HomelessDashboard from './pages/Homeless/Dashboard';
import QRScanResult from './pages/Scan/QRScanResult';
import { USER_ROLES } from './constants/userRoles';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user: currentUser, loading, login, logout } = useAuth();

  const handleLogin = async (userData) => {
    const result = await login(userData.username, userData.password, userData.role);
    return result;
  };

  const handleLogout = async () => {
    await logout();
  };

  // 載入中顯示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (currentUser?.role) {
      case USER_ROLES.NGO_ADMIN:
      case USER_ROLES.NGO_PARTNER:
        return <NGOAdminDashboard user={currentUser} onLogout={handleLogout} />;
      case USER_ROLES.STORE:
        return <StoreDashboard user={currentUser} onLogout={handleLogout} />;
      case USER_ROLES.ASSOCIATION_ADMIN:
      case USER_ROLES.ASSOCIATION_PARTNER:
        return <AssociationDashboard user={currentUser} onLogout={handleLogout} />;
      case USER_ROLES.HOMELESS:
        return <HomelessDashboard user={currentUser} onLogout={handleLogout} />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <Router>
      <Routes>
        {/* 公開路由 - QR 掃描結果頁面（商家掃描街友 QR Code） */}
        <Route path="/scan/:qrCode" element={<QRScanResult />} />

        {/* 登入頁面 */}
        <Route
          path="/login"
          element={
            currentUser ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          }
        />

        {/* 需要登入的路由 */}
        <Route
          path="/"
          element={
            currentUser ? renderDashboard() : <Navigate to="/login" replace />
          }
        />

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
