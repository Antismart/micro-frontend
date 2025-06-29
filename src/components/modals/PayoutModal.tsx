import React from 'react';
import { X, CheckCircle, ExternalLink, Share2, Download, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  payout: {
    id: string;
    amount: number;
    transactionId: string;
    triggerType: string;
    date: Date;
    weatherData: {
      temperature: number;
      rainfall: number;
      threshold: number;
    };
  };
}

export const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, payout }) => {
  if (!isOpen) return null;

  const handleShare = async () => {
    const shareText = `🌾 Great news! I just received a ${payout.amount} ALGO payout from my MicroCrop insurance policy due to ${payout.triggerType.replace('_', ' ')}. Protecting my crops with blockchain technology! 🚀`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MicroCrop Insurance Payout',
          text: shareText,
          url: `https://testnet.algoexplorer.io/tx/${payout.transactionId}`
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Payout details copied to clipboard!');
    }
  };

  const handleCopyTxId = () => {
    navigator.clipboard.writeText(payout.transactionId);
    alert('Transaction ID copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Payout Received!</h2>
              <p className="text-sm text-gray-600">Your claim has been processed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Payout amount */}
        <div className="p-6 text-center border-b">
          <div className="text-4xl font-bold text-green-600 mb-2">
            +{payout.amount.toLocaleString()} ALGO
          </div>
          <p className="text-gray-600">Sent to your wallet</p>
          <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Payment Confirmed</span>
          </div>
        </div>

        {/* Payout details */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Payout Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Trigger Event:</span>
                <span className="font-medium capitalize">{payout.triggerType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{format(payout.date, 'MMM dd, yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payout ID:</span>
                <span className="font-medium text-sm">{payout.id}</span>
              </div>
            </div>
          </div>

          {/* Weather conditions */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Weather Conditions</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Temperature:</span>
                <span className="font-medium">{payout.weatherData.temperature}°C</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rainfall:</span>
                <span className="font-medium">{payout.weatherData.rainfall}mm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Threshold:</span>
                <span className="font-medium">{payout.weatherData.threshold}mm</span>
              </div>
            </div>
          </div>

          {/* Transaction details */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Blockchain Transaction</h3>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-800 font-medium">Transaction ID</span>
                <button
                  onClick={handleCopyTxId}
                  className="p-1 hover:bg-blue-200 rounded transition-colors"
                  title="Copy transaction ID"
                >
                  <Copy className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              <div className="text-xs text-blue-700 font-mono break-all mb-3">
                {payout.transactionId}
              </div>
              <a
                href={`https://testnet.algoexplorer.io/tx/${payout.transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on AlgoExplorer</span>
              </a>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-6 border-t space-y-3">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Good News</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};