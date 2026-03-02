import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import ProductForm from '../../components/Forms/ProductForm';
import { productService, transactionService, reportService } from '../../services/auth';

const StoreDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('products');

  const tabs = [
    { id: 'products', name: '商品管理', icon: '🛍️' },
    { id: 'reports', name: '收入報表', icon: '💰' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductManagement user={user} />;
      case 'reports':
        return <IncomeReports user={user} />;
      default:
        return <ProductManagement user={user} />;
    }
  };

  return (
    <MainLayout title="店家控制台" user={user} onLogout={onLogout}>
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

const ProductManagement = ({ user }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 載入商店產品
  const fetchProducts = async () => {
    if (!user?.storeId) return;
    try {
      setIsLoading(true);
      const response = await productService.getByStore(user.storeId);
      if (response.success) {
        setProducts(response.data.map(p => ({
          id: p.id,
          name: p.name,
          points: p.points,
          category: p.category,
          status: p.status,
          description: p.description,
          createdAt: p.createdAt
        })));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.storeId]);

  const handleSave = async (productData) => {
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
      } else {
        await productService.create(user.storeId, productData);
      }
      setShowAddForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('儲存失敗：' + (error.response?.data?.message || '請稍後再試'));
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleDelete = async (productId) => {
    if (confirm('確定要刪除這個商品嗎？')) {
      try {
        await productService.delete(productId);
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
        alert('刪除失敗：' + (error.response?.data?.message || '請稍後再試'));
      }
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getStatusText = (status) => {
    return status === 'active' ? '上架' : '下架';
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">商品與服務管理</h3>
            <p className="text-sm text-gray-600">目前有 {products.length} 項商品/服務</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增商品
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                    {getStatusText(product.status)}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">所需點數：</span>
                    <span className="text-lg font-semibold text-blue-600">{product.points} 點</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">分類：</span>
                    <span className="text-sm font-medium">{product.category}</span>
                  </div>
                </div>
                
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">尚無商品</h3>
            <p className="mt-1 text-sm text-gray-500">開始建立您的第一個商品或服務</p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新增商品
              </button>
            </div>
          </div>
        )}
      </div>

      <ProductForm
        product={editingProduct}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={showAddForm}
      />
    </>
  );
};

const IncomeReports = ({ user }) => {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  // 載入交易記錄和報表
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 取得交易記錄
      const txResponse = await transactionService.getAll({
        storeId: user?.storeId,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        limit: 50
      });

      if (txResponse.success) {
        setTransactions(txResponse.data.map(tx => ({
          id: tx.id,
          date: tx.createdAt?.replace('T', ' ').substring(0, 16) || '',
          product: tx.productName,
          amount: tx.amount
        })));
      }

      // 取得商店報表
      if (user?.storeId) {
        const reportResponse = await reportService.getStoreReport(user.storeId, {
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined
        });
        if (reportResponse.success) {
          setReportData(reportResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.storeId]);

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

  const totalIncome = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="text-lg font-medium text-blue-900">今日收入統計</h4>
        <p className="text-3xl font-bold text-blue-600 mt-2">{totalIncome} 點</p>
        <p className="text-sm text-blue-700">共 {transactions.length} 筆交易</p>
      </div>

      <div className="flex space-x-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700">開始日期</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="mt-1 border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">結束日期</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="mt-1 border border-gray-300 rounded-md px-3 py-2"
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
          匯出報表
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
                購買商品
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                售價 (點數)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length > 0 ? transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.product}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.amount}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
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

export default StoreDashboard;