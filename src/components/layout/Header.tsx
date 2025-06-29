import React, { useState } from 'react';
import { Shield, Wallet, Settings, AlertCircle, Menu, X, Bell } from 'lucide-react';
import { useAlgorand } from '../../hooks/useAlgorand';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export const Header: React.FC = () => {
  const { isConnected, currentAccount, balance, connectWallet, disconnectWallet, loading, error } = useAlgorand();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      setShowMobileMenu(false);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and title */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">MicroCrop Insurance</h1>
                <p className="text-xs text-gray-500">Decentralized Crop Protection</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">MicroCrop</h1>
              </div>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Error display */}
              {error && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <span>Connection failed</span>
                </div>
              )}

              {isConnected ? (
                <div className="flex items-center space-x-3">
                  {/* Notifications */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(!showNotifications)}
                    icon={<Bell className="w-5 h-5" />}
                    className="relative"
                  >
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  </Button>

                  {/* Account info */}
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {balance.toFixed(2)} ALGO
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatAddress(currentAccount)}
                    </p>
                  </div>

                  {/* Disconnect button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectWallet}
                    icon={<Wallet className="w-4 h-4" />}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConnectWallet}
                  loading={loading}
                  icon={<Wallet className="w-4 h-4" />}
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
                icon={<Settings className="w-5 h-5" />}
              />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                icon={showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 py-4 animate-slideDown">
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>Connection failed</span>
                  </div>
                )}

                {isConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {balance.toFixed(2)} ALGO
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatAddress(currentAccount)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotifications(!showNotifications)}
                        icon={<Bell className="w-5 h-5" />}
                        className="relative"
                      >
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleDisconnectWallet}
                      icon={<Wallet className="w-4 h-4" />}
                      fullWidth
                    >
                      Disconnect Wallet
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleConnectWallet}
                    loading={loading}
                    icon={<Wallet className="w-4 h-4" />}
                    fullWidth
                  >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setShowSettingsModal(true);
                    setShowMobileMenu(false);
                  }}
                  icon={<Settings className="w-5 h-5" />}
                  fullWidth
                >
                  Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Settings"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email Notifications</span>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">SMS Alerts</span>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setShowSettingsModal(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowSettingsModal(false)} fullWidth>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </>
  );
};