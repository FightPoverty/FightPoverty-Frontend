import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { getScanUrl } from '../../utils/publicUrl';

const QRCodeModal = ({ person, isOpen, onClose }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && person && canvasRef.current) {
      // 生成掃描 URL（使用 VITE_PUBLIC_URL 以便 ngrok 測試時 QR 指向正確網址）
      const scanUrl = getScanUrl(person.qrCode);

      // 清空容器
      canvasRef.current.innerHTML = '';

      // 創建 canvas 元素
      const canvas = document.createElement('canvas');
      canvasRef.current.appendChild(canvas);

      // 生成 QR Code，包含 URL 而非 JSON
      QRCode.toCanvas(canvas, scanUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      }, (error) => {
        if (error) {
          console.error('QR Code generation failed:', error);
        }
      });
    }
  }, [isOpen, person]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const qrCanvas = canvasRef.current?.querySelector('canvas');
    
    if (qrCanvas) {
      const qrDataURL = qrCanvas.toDataURL();
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${person.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                margin: 20px;
              }
              .qr-container {
                border: 2px solid #000;
                padding: 20px;
                display: inline-block;
                margin: 20px;
              }
              .info {
                margin: 10px 0;
                font-size: 14px;
              }
              h1 { font-size: 18px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>街友捐款管理平台 - QR Code</h1>
            <div class="qr-container">
              <img src="${qrDataURL}" alt="QR Code" />
              <div class="info">姓名：${person.name}</div>
              <div class="info">編號：${person.qrCode}</div>
              <div class="info">生成時間：${new Date().toLocaleString()}</div>
            </div>
            <p style="font-size: 12px; color: #666;">
              請妥善保管此 QR Code，遺失時請聯繫 NGO 重新補發
            </p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const qrCanvas = canvasRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const link = document.createElement('a');
      link.download = `QR_${person.name}_${person.qrCode}.png`;
      link.href = qrCanvas.toDataURL();
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              QR Code - {person?.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">關閉</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-center">
            <div 
              ref={canvasRef}
              className="flex justify-center mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg"
            />
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">姓名：</div>
                <div className="font-medium">{person?.name}</div>
                <div className="text-gray-600">身分證：</div>
                <div className="font-medium">{person?.idNumber}</div>
                <div className="text-gray-600">QR 編號：</div>
                <div className="font-medium">{person?.qrCode}</div>
                <div className="text-gray-600">餘額：</div>
                <div className="font-medium text-green-600">{person?.balance || 0} 點</div>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                列印
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                下載
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;