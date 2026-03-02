import React, { useState } from 'react';

const MainLayout = ({ children, title, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center mr-3">
                  <span className="text-white text-lg">🏠</span>
                </div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  <span className="hidden sm:inline">街友捐款管理平台</span>
                  <span className="sm:hidden">捐款平台</span>
                </h1>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {(user.name || user.username)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 max-w-24 truncate">
                    {user.name || user.username}
                  </span>
                </div>
              )}
              <button 
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                登出
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              {user && (
                <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {(user.name || user.username)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name || user.username}</p>
                    <p className="text-xs text-gray-500">已登入</p>
                  </div>
                </div>
              )}
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        )}
      </header>
      
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {title && (
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
          </div>
        )}
        <div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;