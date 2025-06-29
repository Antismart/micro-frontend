import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, AlertCircle } from 'lucide-react';

interface OfflineData {
  policies: any[];
  weatherData: any[];
  lastSync: Date;
}

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOfflineMessage && isOnline) return null;

  return (
    <div className={`fixed top-16 left-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300 ${
      isOnline ? 'bg-green-100 border border-green-200' : 'bg-orange-100 border border-orange-200'
    }`}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <Wifi className="w-5 h-5 text-green-600" />
        ) : (
          <WifiOff className="w-5 h-5 text-orange-600" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${isOnline ? 'text-green-800' : 'text-orange-800'}`}>
            {isOnline ? 'Back online!' : 'You\'re offline'}
          </p>
          <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
            {isOnline 
              ? 'Syncing your latest data...' 
              : 'Some features may be limited. Data will sync when connection returns.'
            }
          </p>
        </div>
        {isOnline && (
          <button
            onClick={() => setShowOfflineMessage(false)}
            className="text-green-600 hover:text-green-800"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export const OfflineDataManager = {
  // Save data to localStorage for offline access
  saveOfflineData: (data: OfflineData) => {
    try {
      localStorage.setItem('microcrop_offline_data', JSON.stringify({
        ...data,
        lastSync: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save offline data:', error);
    }
  },

  // Load data from localStorage
  loadOfflineData: (): OfflineData | null => {
    try {
      const data = localStorage.getItem('microcrop_offline_data');
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          lastSync: new Date(parsed.lastSync)
        };
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error);
    }
    return null;
  },

  // Clear offline data
  clearOfflineData: () => {
    try {
      localStorage.removeItem('microcrop_offline_data');
    } catch (error) {
      console.warn('Failed to clear offline data:', error);
    }
  },

  // Generate offline receipt for payouts
  generateOfflineReceipt: (payout: any) => {
    const receipt = {
      id: payout.id,
      amount: payout.amount,
      date: new Date().toISOString(),
      transactionId: payout.transactionId,
      qrCode: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="white"/>
          <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="8">
            ${payout.transactionId.substring(0, 16)}...
          </text>
        </svg>
      `)}`
    };

    // Save to localStorage for later access
    const receipts = JSON.parse(localStorage.getItem('microcrop_receipts') || '[]');
    receipts.push(receipt);
    localStorage.setItem('microcrop_receipts', JSON.stringify(receipts));

    return receipt;
  }
};

export const OfflineReceiptViewer: React.FC<{ receiptId: string }> = ({ receiptId }) => {
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    const receipts = JSON.parse(localStorage.getItem('microcrop_receipts') || '[]');
    const foundReceipt = receipts.find((r: any) => r.id === receiptId);
    setReceipt(foundReceipt);
  }, [receiptId]);

  if (!receipt) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Receipt not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border max-w-sm mx-auto">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Payment Receipt</h3>
        <p className="text-sm text-gray-600">MicroCrop Insurance</p>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Amount:</span>
          <span className="font-medium">{receipt.amount} ALGO</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">{new Date(receipt.date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Receipt ID:</span>
          <span className="font-medium text-xs">{receipt.id}</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <img 
          src={receipt.qrCode} 
          alt="Transaction QR Code" 
          className="w-24 h-24 mx-auto border"
        />
        <p className="text-xs text-gray-500 mt-2">Scan to verify on blockchain</p>
      </div>

      <button
        onClick={() => window.print()}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Print Receipt</span>
      </button>
    </div>
  );
};