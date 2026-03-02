import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import TabNavigation from '../../components/Layout/TabNavigation';
import HomelessForm from '../../components/Forms/HomelessForm';
import QRCodeModal from '../../components/QRCode/QRCodeModal';
import { homelessService, allocationService, transactionService, reportService, userService } from '../../services/auth';

const NGOAdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('homeless');

  // 判斷是否為 NGO 管理員（可管理帳號）
  const isAdmin = user?.role === 'ngo_admin';

  // 基本 tabs（分配點數已納入遊民管理）
  const baseTabs = [
    { id: 'homeless', name: '遊民管理', icon: '👥' },
    { id: 'reports', name: '兌換記錄', icon: '📊' },
    { id: 'allocation-report', name: '捐款分配報表', icon: '📋' }
  ];

  // 管理員才能看到帳號管理
  const tabs = isAdmin
    ? [...baseTabs, { id: 'accounts', name: '帳號管理', icon: '⚙️' }]
    : baseTabs;

  // 根據角色顯示不同標題
  const pageTitle = isAdmin ? 'NGO 管理員控制台' : 'NGO 夥伴控制台';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'homeless':
        return <HomelessManagement />;
      case 'reports':
        return <ReportsView />;
      case 'allocation-report':
        return <AllocationReportView />;
      case 'accounts':
        return <AccountManagement currentUser={user} />;
      default:
        return <HomelessManagement />;
    }
  };

  return (
    <MainLayout title={pageTitle} user={user} onLogout={onLogout}>
      <div className="bg-white shadow rounded-lg">
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="px-6"
        />
        <div className="p-4 sm:p-6">
          {renderTabContent()}
        </div>
      </div>
    </MainLayout>
  );
};

const HomelessManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [showQRCode, setShowQRCode] = useState(null);
  const [homelessList, setHomelessList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('active');  // 狀態篩選：啟用 | 停用 | 暫停 | 全部，預設啟用
  const [allocationMode, setAllocationMode] = useState(false);
  const [selectedForAllocation, setSelectedForAllocation] = useState([]);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  // 載入街友列表
  const fetchHomelessList = async () => {
    try {
      setIsLoading(true);
      const response = await homelessService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined
      });
      if (response.success) {
        // API 響應已由 api.js 攔截器自動轉換為 camelCase
        setHomelessList(response.data.map(h => ({
          id: h.id,
          name: h.name,
          idNumber: h.idNumber,
          phone: h.phone,
          address: h.address,
          balance: h.balance,
          qrCode: h.qrCode,
          status: h.status,
          emergencyContact: h.emergencyContact,
          emergencyPhone: h.emergencyPhone,
          notes: h.notes,
          createdAt: h.createdAt
        })));
        setPagination(prev => ({ ...prev, total: response.meta?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch homeless list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomelessList();
  }, [pagination.page]);

  const filteredList = homelessList.filter(person => {
    const matchSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.idNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || (person.status || '') === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (personData) => {
    try {
      if (editingPerson) {
        await homelessService.update(editingPerson.id, personData);
      } else {
        await homelessService.create(personData);
      }
      setShowAddForm(false);
      setEditingPerson(null);
      fetchHomelessList(); // 重新載入列表
    } catch (error) {
      console.error('Failed to save homeless:', error);
      alert('儲存失敗：' + (error.response?.data?.message || '請稍後再試'));
    }
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPerson(null);
  };

  const handleReissueQR = async (person) => {
    try {
      const response = await homelessService.reissueQrCode(person.id);
      if (response.success) {
        alert(`已為 ${person.name} 重新生成 QR Code: ${response.data.qrCode}`);
        fetchHomelessList(); // 重新載入列表
      }
    } catch (error) {
      console.error('Failed to reissue QR code:', error);
      alert('補發 QR Code 失敗：' + (error.response?.data?.message || '請稍後再試'));
    }
  };

  // 搜尋處理
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchHomelessList();
  };

  // 分配點數：勾選／取消勾選
  const toggleSelectForAllocation = (id) => {
    setSelectedForAllocation(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAllForAllocation = () => {
    if (selectedForAllocation.length === filteredList.length) {
      setSelectedForAllocation([]);
    } else {
      setSelectedForAllocation(filteredList.map(p => p.id));
    }
  };

  // 確認分配（多選）
  const handleBatchAllocation = async () => {
    if (selectedForAllocation.length === 0) {
      alert('請至少選擇一位街友');
      return;
    }
    const amount = parseInt(allocationAmount, 10);
    if (!amount || amount <= 0) {
      alert('請輸入有效的分配點數');
      return;
    }
    try {
      setIsAllocating(true);
      for (const homelessId of selectedForAllocation) {
        await allocationService.create({
          homelessId,
          amount,
          notes: allocationNotes || undefined
        });
      }
      alert(`已為 ${selectedForAllocation.length} 位街友各分配 ${amount} 點`);
      setAllocationMode(false);
      setSelectedForAllocation([]);
      setAllocationAmount('');
      setAllocationNotes('');
      fetchHomelessList();
    } catch (error) {
      console.error('Batch allocation failed:', error);
      alert('分配失敗：' + (error.response?.data?.message || '請稍後再試'));
    } finally {
      setIsAllocating(false);
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
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">遊民資料管理</h3>
            <p className="text-sm text-gray-600">目前管理 {homelessList.length} 位遊民</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAllocationMode(!allocationMode);
                if (allocationMode) {
                  setSelectedForAllocation([]);
                  setAllocationAmount('');
                  setAllocationNotes('');
                }
              }}
              className={`px-4 py-2 rounded-md flex items-center ${allocationMode ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              分配點數
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新增遊民資料
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="搜尋姓名或身分證字號..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={handleSearch}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            搜尋
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allocationMode && (
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={filteredList.length > 0 && selectedForAllocation.length === filteredList.length}
                      onChange={toggleSelectAllForAllocation}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  基本資料
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  聯絡方式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  餘額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="relative inline-flex items-center gap-1">
                    <span>狀態</span>
                    <span className="relative inline-flex w-6 h-6 items-center justify-center">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        title={statusFilter === 'all' ? '全部' : statusFilter === 'active' ? '啟用' : statusFilter === 'inactive' ? '停用' : '暫停'}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      >
                        <option value="active">啟用</option>
                        <option value="inactive">停用</option>
                        <option value="suspended">暫停</option>
                        <option value="all">全部</option>
                      </select>
                      <svg className="w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredList.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  {allocationMode && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedForAllocation.includes(person.id)}
                        onChange={() => toggleSelectForAllocation(person.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {person.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {person.idNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{person.phone || '未提供'}</div>
                    <div className="text-sm text-gray-500">{person.address || '未提供'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-green-600">
                      {person.balance} 點
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(person.status)}`}>
                      {getStatusText(person.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setShowQRCode(person)}
                      className="text-green-600 hover:text-green-900"
                      title="查看 QR Code"
                    >
                      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(person)}
                      className="text-blue-600 hover:text-blue-900"
                      title="編輯"
                    >
                      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReissueQR(person)}
                      className="text-orange-600 hover:text-orange-900"
                      title="補發 QR Code"
                    >
                      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {filteredList.map((person) => (
            <div key={person.id} className="bg-white rounded-lg shadow border p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  {allocationMode && (
                    <span className="flex-shrink-0 pt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedForAllocation.includes(person.id)}
                        onChange={() => toggleSelectForAllocation(person.id)}
                        className="rounded border-gray-300"
                      />
                    </span>
                  )}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{person.name}</h4>
                    <p className="text-sm text-gray-500">{person.idNumber}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(person.status)}`}>
                  {getStatusText(person.status)}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">手機：</span>
                  <span className="text-sm text-gray-900">{person.phone || '未提供'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">地址：</span>
                  <span className="text-sm text-gray-900 truncate ml-2">{person.address || '未提供'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">餘額：</span>
                  <span className="text-lg font-semibold text-green-600">{person.balance} 點</span>
                </div>
              </div>
              
              <div className="flex justify-between space-x-2">
                <button
                  onClick={() => setShowQRCode(person)}
                  className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-200 transition-colors"
                >
                  查看 QR
                </button>
                <button
                  onClick={() => handleEdit(person)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleReissueQR(person)}
                  className="flex-1 bg-orange-100 text-orange-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-orange-200 transition-colors"
                >
                  補發 QR
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredList.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? '找不到符合條件的資料' : '尚無遊民資料'}
          </div>
        )}

        {/* 分配點數操作列（勾選後顯示） */}
        {allocationMode && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-3">
              已選擇 {selectedForAllocation.length} 位街友，請輸入每人分配點數與備註後確認。
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">分配點數（每人）</label>
                <input
                  type="number"
                  min="1"
                  className="border border-gray-300 rounded-md px-3 py-2 w-32"
                  placeholder="點數"
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">備註（選填）</label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="輸入備註"
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBatchAllocation}
                  disabled={isAllocating || selectedForAllocation.length === 0 || !allocationAmount}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAllocating ? '分配中...' : '確認分配'}
                </button>
                <button
                  onClick={() => {
                    setAllocationMode(false);
                    setSelectedForAllocation([]);
                    setAllocationAmount('');
                    setAllocationNotes('');
                  }}
                  className="border border-gray-300 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <HomelessForm
        person={editingPerson}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={showAddForm}
      />
      
      <QRCodeModal
        person={showQRCode}
        isOpen={!!showQRCode}
        onClose={() => setShowQRCode(null)}
      />
    </>
  );
};

const DonationManagement = () => {
  const [summaryData, setSummaryData] = useState({
    totalBalance: 0,
    totalAllocated: 0,
    pendingAllocation: 0
  });
  const [homelessList, setHomelessList] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedHomeless, setSelectedHomeless] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchDebounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // 載入統計資料
  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const response = await reportService.getSummary();
      if (response.success) {
        const { allocations, homeless } = response.data;
        setSummaryData({
          totalBalance: homeless?.totalBalance || 0,
          totalAllocated: allocations?.totalAmount || 0,
          pendingAllocation: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 搜尋街友（依輸入關鍵字）
  const fetchHomelessList = async (search = '') => {
    try {
      setIsSearching(true);
      const response = await homelessService.getAll({
        limit: 100,
        search: search?.trim() || undefined
      });
      if (response.success) {
        setHomelessList(response.data.map(h => ({
          id: h.id,
          name: h.name,
          idNumber: h.idNumber,
          balance: h.balance
        })));
      }
    } catch (error) {
      console.error('Failed to fetch homeless list:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 輸入時 debounce 搜尋
  const handleComboboxChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setSelectedHomeless('');
    setSelectedLabel('');
    setDropdownOpen(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchHomelessList(value);
    }, 300);
  };

  const handleSelectHomeless = (h) => {
    setSelectedHomeless(h.id);
    setSelectedLabel(`${h.name} (${h.idNumber}) - 餘額: ${h.balance} 點`);
    setSearchInput('');
    setDropdownOpen(false);
  };

  const handleComboboxFocus = () => {
    setDropdownOpen(true);
    if (!homelessList.length && !isSearching) fetchHomelessList(searchInput);
  };

  // 點擊外部關閉 dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchHomelessList('');
  }, []);

  // 處理分配
  const handleAllocation = async () => {
    if (!selectedHomeless || !allocationAmount) {
      alert('請選擇街友並輸入金額');
      return;
    }

    const amount = parseInt(allocationAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('請輸入有效的金額');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await allocationService.create({
        homelessId: selectedHomeless,
        amount: amount,
        notes: allocationNotes || undefined
      });

      if (response.success) {
        alert('點數分配成功！');
        setSelectedHomeless('');
        setSelectedLabel('');
        setSearchInput('');
        setAllocationAmount('');
        setAllocationNotes('');
        fetchSummary(); // 重新載入統計
        fetchHomelessList(''); // 重新載入街友列表（更新餘額）
      } else {
        alert('分配失敗：' + (response.message || '請稍後再試'));
      }
    } catch (error) {
      console.error('Failed to allocate:', error);
      alert('分配失敗：' + (error.response?.data?.message || '請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-blue-900">街友總餘額</h4>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {isLoading ? '...' : `${summaryData.totalBalance.toLocaleString()} 點`}
          </p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-green-900">已分配總額</h4>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {isLoading ? '...' : `${summaryData.totalAllocated.toLocaleString()} 點`}
          </p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-yellow-900">街友人數</h4>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {isLoading ? '...' : homelessList.length}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">分配點數</h4>
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇街友
          </label>
          <input
            type="text"
            placeholder="搜尋姓名或身分證字號後選擇街友..."
            className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedHomeless ? selectedLabel : searchInput}
            onChange={handleComboboxChange}
            onFocus={handleComboboxFocus}
            onKeyDown={(e) => {
              if (selectedHomeless && (e.key === 'Backspace' || e.key === 'Delete')) {
                setSelectedHomeless('');
                setSelectedLabel('');
              }
            }}
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 pt-6 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
          {dropdownOpen && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 shadow-lg">
              {isSearching ? (
                <li className="px-3 py-2 text-sm text-gray-500">搜尋中...</li>
              ) : homelessList.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">無符合的街友，請輸入姓名或身分證字號</li>
              ) : (
                homelessList.map(h => (
                  <li
                    key={h.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectHomeless(h); }}
                  >
                    {h.name} ({h.idNumber}) - 餘額: {h.balance} 點
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            分配點數
          </label>
          <input
            type="number"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="輸入點數"
            value={allocationAmount}
            onChange={(e) => setAllocationAmount(e.target.value)}
            min="1"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            備註（選填）
          </label>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="輸入備註"
            value={allocationNotes}
            onChange={(e) => setAllocationNotes(e.target.value)}
          />
        </div>
        <button
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          onClick={handleAllocation}
          disabled={isSubmitting || !selectedHomeless || !allocationAmount}
        >
          {isSubmitting ? '處理中...' : '確認分配'}
        </button>
      </div>
    </div>
  );
};

const ReportsView = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 載入交易記錄
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await transactionService.getAll({
        limit: 50,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });
      if (response.success) {
        setTransactions(response.data.map(tx => ({
          id: tx.id,
          date: tx.createdAt?.replace('T', ' ').substring(0, 16) || '',
          product: tx.productName,
          points: tx.amount,
          store: tx.storeName || '商店',
          user: tx.homelessName || '街友'
        })));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleQuery = () => {
    fetchTransactions();
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

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 items-end flex-wrap gap-2">
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
        <button
          onClick={handleQuery}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          查詢
        </button>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          匯出 Excel
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
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
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  載入中...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.points}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.store}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.user}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  尚無交易記錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 取得過去一年的日期範圍（預設顯示用）
const getPastYearRange = () => {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
};

// 依西元年、月份計算查詢範圍（月份為 '' 表示整年）
const getRangeFromYearMonth = (year, month) => {
  if (!year) return null;
  const y = Number(year);
  if (!month || month === '') {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  const m = Number(month);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, '0')}-01`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  };
};

// 捐款分配報表：過去所有捐款分配紀錄
const AllocationReportView = () => {
  const [dateRange, setDateRange] = useState(getPastYearRange);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [homelessMap, setHomelessMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  const monthOptions = [
    { value: '', label: '全部' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` }))
  ];

  const fetchHomelessMap = async () => {
    try {
      const response = await homelessService.getAll({ limit: 500 });
      if (response.success) {
        const map = {};
        response.data.forEach(h => { map[h.id] = h.name || h.idNumber || '-' ; });
        setHomelessMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch homeless list:', error);
    }
  };

  const fetchAllocations = async (override = {}) => {
    const page = override.page ?? pagination.page;
    const startDate = override.startDate ?? dateRange.start;
    const endDate = override.endDate ?? dateRange.end;
    try {
      setIsLoading(true);
      const response = await allocationService.getAll({
        page,
        limit: pagination.limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (response.success) {
        setAllocations(response.data.map(a => ({
          id: a.id,
          homelessId: a.homelessId,
          homelessName: a.homelessName ?? a.homeless_name ?? null,
          amount: a.amount,
          balanceBefore: a.balanceBefore,
          balanceAfter: a.balanceAfter,
          notes: a.notes,
          createdAt: a.createdAt?.replace('T', ' ').substring(0, 19) || ''
        })));
        const meta = response.meta || {};
        setPagination(prev => ({
          ...prev,
          page,
          total: meta.total ?? 0,
          totalPages: meta.totalPages ?? 1
        }));
      }
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomelessMap();
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [pagination.page]);

  const handleQuery = () => {
    const range = filterYear
      ? getRangeFromYearMonth(filterYear, filterMonth)
      : getPastYearRange();
    if (range) {
      setDateRange(range);
      fetchAllocations({ page: 1, startDate: range.start, endDate: range.end });
    }
  };

  const handleExport = async () => {
    try {
      await reportService.exportCsv('allocations', {
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });
    } catch (error) {
      console.error('Failed to export:', error);
      alert('匯出失敗');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">西元年分</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 min-w-[100px]"
          >
            <option value="">過去一年（預設）</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 min-w-[90px]"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleQuery}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          查詢
        </button>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          匯出 Excel
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                街友
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分配點數
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分配前餘額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分配後餘額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                備註
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  載入中...
                </td>
              </tr>
            ) : allocations.length > 0 ? (
              allocations.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.homelessName || homelessMap[row.homelessId] || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {row.amount} 點
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.balanceBefore} 點
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.balanceAfter} 點
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={row.notes}>
                    {row.notes || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  尚無捐款分配紀錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page <= 1}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            上一頁
          </button>
          <span className="text-sm text-gray-600">
            第 {pagination.page} / {pagination.totalPages} 頁，共 {pagination.total} 筆
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            下一頁
          </button>
        </div>
      )}
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
    role: 'ngo_partner'
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

  // 新增／更新帳號
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

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'ngo_partner'
    });
  };

  const handleCancelForm = () => {
    setEditingUser(null);
    setShowAddForm(false);
    setFormData({ username: '', password: '', name: '', email: '', phone: '', role: 'ngo_partner' });
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
          <h3 className="text-lg font-medium text-gray-900">NGO 夥伴帳號管理</h3>
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
            {editingUser ? '編輯 NGO 夥伴帳號' : '新增 NGO 夥伴帳號'}
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
                <input
                  type="password"
                  required={!editingUser}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '不修改請留空' : '輸入密碼（至少6個字元）'}
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
                  <option value="ngo_admin">管理員權限（可新增夥伴）</option>
                  <option value="ngo_partner">夥伴權限（不可新增夥伴）</option>
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
                    {user.role === 'ngo_admin' ? '管理員權限' : '夥伴權限'}
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

export default NGOAdminDashboard;