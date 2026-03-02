import React, { useState, useEffect } from 'react';

const HomelessForm = ({ person, onSave, onCancel, isOpen }) => {
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        idNumber: person.idNumber || '',
        phone: person.phone || '',
        address: person.address || '',
        emergencyContact: person.emergencyContact || '',
        emergencyPhone: person.emergencyPhone || '',
        notes: person.notes || '',
        status: person.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        idNumber: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        notes: '',
        status: 'active'
      });
    }
  }, [person]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '請輸入姓名';
    }

    if (!formData.idNumber.trim()) {
      newErrors.idNumber = '請輸入身分證字號';
    } else if (!/^[A-Z][12][0-9]{8}$/.test(formData.idNumber)) {
      newErrors.idNumber = '身分證字號格式不正確';
    }

    if (formData.phone && !/^09\d{8}$/.test(formData.phone)) {
      newErrors.phone = '手機號碼格式不正確（例：0912345678）';
    }

    if (formData.emergencyPhone && !/^\d{8,10}$/.test(formData.emergencyPhone)) {
      newErrors.emergencyPhone = '請輸入 8-10 位數字的電話號碼';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const saveData = {
      ...formData,
      id: person?.id || Date.now(),
      qrCode: person?.qrCode || `QR_${Date.now()}`,
      balance: person?.balance || 0,
      createdAt: person?.createdAt || new Date().toISOString()
    };
    
    onSave(saveData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // 只允許輸入數字的處理函式
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    // 過濾掉非數字字元
    const digitsOnly = value.replace(/\D/g, '');
    setFormData({
      ...formData,
      [name]: digitsOnly
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {person ? '編輯遊民資料' : '新增遊民資料'}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">關閉</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`block w-full border rounded-md px-3 py-2 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="輸入姓名"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  身分證字號 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  className={`block w-full border rounded-md px-3 py-2 ${
                    errors.idNumber ? 'border-red-300' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="A123456789"
                />
                {errors.idNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.idNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手機號碼
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  className={`block w-full border rounded-md px-3 py-2 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="0912345678"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  狀態
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">啟用</option>
                  <option value="inactive">停用</option>
                  <option value="suspended">暫停</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                居住地址
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入居住地址或常出現地點"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  緊急聯絡人
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="緊急聯絡人姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  緊急聯絡電話
                </label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  className={`block w-full border rounded-md px-3 py-2 ${
                    errors.emergencyPhone ? 'border-red-300' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="緊急聯絡電話（8-10 位數字）"
                />
                {errors.emergencyPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergencyPhone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入備註訊息..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {person ? '更新' : '新增'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomelessForm;