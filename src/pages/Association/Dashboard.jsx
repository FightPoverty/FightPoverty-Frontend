import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { reportService, storeService, transactionService, userService } from '../../services/auth';

const AssociationDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('reports');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // 判斷是否為商圈管理員（可管理帳號）
  const isAdmin = user?.role === 'association_admin';

  // 基本 tabs
  const baseTabs = [
    { id: 'reports', name: '商圈報表', icon: '📊' },
    { id: 'stores', name: '合作店家', icon: '🏪' }
  ];

  // 管理員才能看到帳號管理
  const tabs = isAdmin
    ? [...baseTabs, { id: 'accounts', name: '帳號管理', icon: '👥' }]
    : baseTabs;

  // 根據角色顯示不同標題
  const pageTitle = isAdmin ? '商圈管理員控制台' : '商圈夥伴控制台';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reports':
        return <DistrictReports dateRange={dateRange} setDateRange={setDateRange} user={user} />;
      case 'stores':
        return <PartnerStores user={user} />;
      case 'accounts':
        return <AccountManagement currentUser={user} />;
      default:
        return <DistrictReports dateRange={dateRange} setDateRange={setDateRange} user={user} />;
    }
  };

  return (
    <MainLayout title={pageTitle} user={user} onLogout={onLogout}>
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </MainLayout>
  );
};

const DistrictReports = ({ dateRange, setDateRange, user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    storeCount: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [stores, setStores] = useState([]);
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 10, total: 0, hasMore: false });

  // 載入資料
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 取得報表摘要
      const summaryResponse = await reportService.getSummary({
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });

      if (summaryResponse.success) {
        setSummaryData({
          totalTransactions: summaryResponse.data.transactions?.totalCount || 0,
          totalAmount: summaryResponse.data.transactions?.totalAmount || 0,
          storeCount: summaryResponse.data.stores?.activeCount || 0
        });
      }

      // 取得最近交易（重置分頁）
      const txResponse = await transactionService.getAll({
        page: 1,
        limit: 10,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });

      if (txResponse.success) {
        const total = txResponse.meta?.total || 0;
        setRecentTransactions(txResponse.data.map(tx => ({
          id: tx.id,
          date: tx.createdAt?.replace('T', ' ').substring(0, 16) || '',
          item: tx.productName,
          points: tx.amount,
          store: tx.storeName || '商店',
          user: tx.homelessName || '街友'
        })));
        setTxPagination({
          page: 1,
          limit: 10,
          total,
          hasMore: txResponse.data.length < total
        });
      }

      // 取得店家列表
      const storeResponse = await storeService.getAll({ limit: 50 });
      if (storeResponse.success) {
        setStores(storeResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 載入更多交易
  const loadMoreTransactions = async () => {
    if (isLoadingMore || !txPagination.hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = txPagination.page + 1;
      const txResponse = await transactionService.getAll({
        page: nextPage,
        limit: txPagination.limit,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });

      if (txResponse.success) {
        const newTransactions = txResponse.data.map(tx => ({
          id: tx.id,
          date: tx.createdAt?.replace('T', ' ').substring(0, 16) || '',
          item: tx.productName,
          points: tx.amount,
          store: tx.storeName || '商店',
          user: tx.homelessName || '街友'
        }));
        setRecentTransactions(prev => [...prev, ...newTransactions]);
        setTxPagination(prev => ({
          ...prev,
          page: nextPage,
          hasMore: recentTransactions.length + newTransactions.length < prev.total
        }));
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuery = () => {
    fetchData();
  };

  const handleExport = async () => {
    try {
      await reportService.exportCsv('transactions', {
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });
    } catch (error) {
      console.error('Failed to export:', error);
      alert('匯出失敗');
    }
  };

  // 計算熱門店家
  const topStores = stores
    .sort((a, b) => (b.totalIncome || 0) - (a.totalIncome || 0))
    .slice(0, 4)
    .map(s => ({
      name: s.name,
      transactions: s.transactionCount || 0,
      amount: s.totalIncome || 0
    }));

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">總交易數</p>
              <p className="text-2xl font-semibold text-blue-600">{summaryData.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-600 rounded-md flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">總消費點數</p>
              <p className="text-2xl font-semibold text-green-600">{summaryData.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-600 rounded-md flex items-center justify-center">
                <span className="text-white text-sm">🏪</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">合作店家</p>
              <p className="text-2xl font-semibold text-purple-600">{summaryData.storeCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-orange-600 rounded-md flex items-center justify-center">
                <span className="text-white text-sm">📈</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-900">平均每筆</p>
              <p className="text-2xl font-semibold text-orange-600">
                {summaryData.totalTransactions > 0 ? Math.round(summaryData.totalAmount / summaryData.totalTransactions) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 日期篩選 */}
      <div className="flex space-x-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <button onClick={handleQuery} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          查詢
        </button>
        <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
          匯出 Excel
        </button>
      </div>

      <div className="mb-6">
        {/* 熱門店家 */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">熱門店家排行</h4>
          <div className="space-y-4">
            {topStores.length > 0 ? topStores.map((store, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <p className="text-sm text-gray-500">{store.transactions} 筆交易</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{store.amount.toLocaleString()} 點</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">尚無店家資料</div>
            )}
          </div>
        </div>
      </div>

      {/* 詳細交易記錄表格 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">商圈捐款花費明細</h4>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                兌換商品
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                兌換點數
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                兌換店家
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                兌換者
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.item}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {transaction.points}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.store}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.user}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  尚無交易紀錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* 載入更多按鈕 */}
        {txPagination.hasMore && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button
              onClick={loadMoreTransactions}
              disabled={isLoadingMore}
              className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
            >
              {isLoadingMore ? '載入中...' : `載入更多（已顯示 ${recentTransactions.length} / ${txPagination.total} 筆）`}
            </button>
          </div>
        )}
        {!txPagination.hasMore && recentTransactions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 text-center text-gray-500 text-sm">
            已顯示全部 {recentTransactions.length} 筆交易紀錄
          </div>
        )}
      </div>
    </div>
  );
};

const PartnerStores = ({ user }) => {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    address: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const response = await storeService.getAll({ limit: 50 });
      if (response.success) {
        setStores(response.data.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category || '未分類',
          address: s.address || '',
          phone: s.phone || '',
          status: s.status
        })));
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleAddStore = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('請填寫店家名稱');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await storeService.create({
        name: formData.name.trim(),
        category: formData.category?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        associationId: user?.associationId || user?.association_id
      });
      if (response.success) {
        alert('店家新增成功！');
        setShowAddForm(false);
        setFormData({ name: '', category: '', address: '', phone: '' });
        fetchStores();
      } else {
        alert('新增失敗：' + (response.message || '請稍後再試'));
      }
    } catch (error) {
      console.error('Failed to create store:', error);
      alert('新增失敗：' + (error.response?.data?.message || '請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getStatusText = (status) => {
    return status === 'active' ? '營業中' : '暫停合作';
  };

  const categoryOptions = ['餐飲', '零售', '服飾', '生活服務', '其他'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">合作店家管理</h3>
          <p className="text-sm text-gray-600">目前有 {stores.filter(s => s.status === 'active').length} 家店家合作中</p>
        </div>
        {(user?.role === 'association_admin' || user?.role === 'association_partner') && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增店家
          </button>
        )}
      </div>

      {/* 新增店家表單 */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">新增合作店家</h4>
          <form onSubmit={handleAddStore} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">店家名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="輸入店家名稱"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">類別</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">請選擇類別</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">地址</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="輸入地址"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">電話</label>
                <input
                  type="tel"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="輸入電話（僅限數字）"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', category: '', address: '', phone: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? '建立中...' : '建立店家'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-lg shadow-md border">
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-lg font-medium text-gray-900">{store.name}</h4>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(store.status)}`}>
                  {getStatusText(store.status)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {store.category}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {store.address}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {store.phone}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AccountManagement = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'association_partner'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 載入夥伴帳號列表
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await userService.getAll();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 新增／更新帳號（與 NGO 管理員相同）
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.name) {
      alert('請填寫必填欄位');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('新增時請填寫密碼');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUser) {
        const response = await userService.update(editingUser.id, {
          username: formData.username,
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          role: formData.role,
          password: formData.password || undefined
        });
        if (response.success) {
          alert('帳號更新成功！');
          setEditingUser(null);
        handleCancelForm();
        fetchUsers();
        } else {
          alert('更新失敗：' + (response.message || '請稍後再試'));
        }
      } else {
        const response = await userService.create({
          ...formData,
          role: formData.role
        });
        if (response.success) {
          alert('帳號建立成功！');
          handleCancelForm();
          fetchUsers();
        } else {
          alert('建立失敗：' + (response.message || '請稍後再試'));
        }
      }
    } catch (error) {
      console.error(editingUser ? 'Failed to update user:' : 'Failed to create user:', error);
      alert((editingUser ? '更新失敗：' : '建立失敗：') + (error.response?.data?.message || '請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 開啟編輯（與 NGO 管理員相同：顯示表單並帶入該筆資料）
  const handleEdit = (user) => {
    setEditingUser(user);
    setShowAddForm(true);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'association_partner'
    });
  };

  // 關閉新增／編輯表單
  const handleCancelForm = () => {
    setEditingUser(null);
    setShowAddForm(false);
    setFormData({ username: '', password: '', name: '', email: '', phone: '', role: 'association_partner' });
  };

  // 刪除帳號
  const handleDelete = async (userId, userName) => {
    if (!confirm(`確定要刪除帳號「${userName}」嗎？此操作無法復原。`)) {
      return;
    }

    try {
      const response = await userService.delete(userId);
      if (response.success) {
        alert('帳號已刪除');
        fetchUsers();
      } else {
        alert('刪除失敗：' + (response.message || '請稍後再試'));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('刪除失敗：' + (error.response?.data?.message || '請稍後再試'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '啟用';
      case 'inactive': return '停用';
      case 'suspended': return '暫停';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">商圈夥伴帳號管理</h3>
          <p className="text-sm text-gray-600">目前共 {users.length} 個夥伴帳號</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingUser(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新增夥伴帳號
        </button>
      </div>

      {/* 新增／編輯帳號表單 */}
      {(showAddForm || editingUser) && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? '編輯商圈夥伴帳號' : '新增商圈夥伴帳號'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  帳號 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="輸入帳號"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  密碼 {!editingUser && <span className="text-red-500">*</span>}
                </label>
                {editingUser && (
                  <p className="text-xs text-gray-500 mb-1">已設定密碼（不修改請留空）</p>
                )}
                <input
                  type="password"
                  required={!editingUser}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '•••••••• 已設定，輸入新密碼則覆蓋' : '輸入密碼（至少6個字元）'}
                  minLength={formData.password ? 6 : undefined}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="輸入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">電子郵件</label>
                <input
                  type="email"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="輸入電子郵件"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">電話</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="輸入電話（僅限數字）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">管理權限</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="association_admin">管理員權限（可新增夥伴）</option>
                  <option value="association_partner">夥伴權限（不可新增夥伴）</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? (editingUser ? '更新中...' : '建立中...') : (editingUser ? '更新帳號' : '建立帳號')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 帳號列表 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">帳號</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">聯絡方式</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">建立時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">載入中...</td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => {
                const isCurrentUser = currentUser && (user.id === currentUser.id || user.username === currentUser.username);
                return (
                <tr key={user.id} className={isCurrentUser ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span>{user.username}</span>
                    {isCurrentUser && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                        目前登入帳號
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {user.role === 'association_admin' ? '管理員權限' : '夥伴權限'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{user.email || '-'}</div>
                    <div>{user.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt?.split('T')[0] || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                      title="編輯"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-red-600 hover:text-red-900"
                      title="刪除"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ); })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">尚無夥伴帳號</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssociationDashboard;