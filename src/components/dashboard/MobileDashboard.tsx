import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, AlertTriangle, Plus, Bell, Settings, RefreshCw } from 'lucide-react';
import { PolicyStatusCard } from '../policy/PolicyStatusCard';
import { WeatherFeed } from '../weather/WeatherFeed';
import { CoverageCard } from './CoverageCard';
import { usePolicyStore } from '../../store/policyStore';
import { useWeatherData } from '../../hooks/useWeatherData';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface MobileDashboardProps {
  onCreatePolicy: () => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ onCreatePolicy }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'weather' | 'marketplace'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [weatherDeviceId, setWeatherDeviceId] = useState<string>('test-device-001');
  
  const { policies, getTotalCoverage, loading, error } = usePolicyStore();
  const { data: weatherData, weatherStats, refetch: refetchWeather, findNearbyDevices } = useWeatherData(weatherDeviceId, 7);

  const activePolicies = policies.filter(p => p.status === 'active');
  const totalPayouts = policies.reduce((sum, p) => 
    sum + p.claimHistory.filter(c => c.status === 'paid').reduce((claimSum, c) => claimSum + c.payoutAmount, 0), 0
  );

  const cropTypes = [
    { id: 'maize', name: 'Maize/Corn', minRainfall: 300, maxTemperature: 35, maxDailyRainfall: 50, premiumRate: 0.08, icon: '🌽' },
    { id: 'rice', name: 'Rice', minRainfall: 400, maxTemperature: 38, maxDailyRainfall: 80, premiumRate: 0.10, icon: '🌾' },
    { id: 'wheat', name: 'Wheat', minRainfall: 200, maxTemperature: 32, maxDailyRainfall: 40, premiumRate: 0.06, icon: '🌾' },
    { id: 'cotton', name: 'Cotton', minRainfall: 250, maxTemperature: 40, maxDailyRainfall: 45, premiumRate: 0.12, icon: '🌱' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'policies', label: 'My Policies', icon: Shield },
    { id: 'weather', label: 'Weather', icon: AlertTriangle },
    { id: 'marketplace', label: 'Buy Coverage', icon: Plus }
  ];

  // Try to find nearby weather devices on component mount
  useEffect(() => {
    const findWeatherDevice = async () => {
      try {
        // Get user's location from localStorage if available
        const userProfile = localStorage.getItem('microcrop_user_profile');
        const farmLocation = localStorage.getItem('microcrop_farm_location');
        
        let lat = 40.7128; // Default to NYC
        let lng = -74.0060;
        
        if (farmLocation) {
          const location = JSON.parse(farmLocation);
          lat = parseFloat(location.lat);
          lng = parseFloat(location.lng);
        } else if (userProfile) {
          const profile = JSON.parse(userProfile);
          if (profile.location) {
            lat = parseFloat(profile.location.lat);
            lng = parseFloat(profile.location.lng);
          }
        }
        
        // Find nearby devices
        const devices = await findNearbyDevices(lat, lng, 100);
        if (devices && devices.length > 0) {
          setWeatherDeviceId(devices[0].deviceId);
          console.log(`🌤️ Found nearby weather device: ${devices[0].deviceId}`);
        } else {
          console.log('🌤️ No nearby weather devices found, using test device');
        }
      } catch (error) {
        console.log('🌤️ Could not find nearby devices, using test device:', error);
      }
    };

    findWeatherDevice();
  }, [findNearbyDevices]);

  const handlePurchase = async (cropId: string, coverageAmount: number, duration: number) => {
    try {
      console.log('Purchase:', { cropId, coverageAmount, duration });
      onCreatePolicy();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchWeather();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">MicroCrop</h1>
                <p className="text-xs text-gray-500">Crop Insurance</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                loading={refreshing}
                icon={<RefreshCw className="w-5 h-5" />}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Bell className="w-5 h-5" />}
                className="relative"
              >
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Settings className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card hover padding="md" className="bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Active Policies</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{activePolicies.length}</div>
                <div className="text-xs text-green-600">
                  {activePolicies.length === 1 ? 'policy' : 'policies'} active
                </div>
              </Card>
              
              <Card hover padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Total Coverage</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{getTotalCoverage().toLocaleString()}</div>
                <div className="text-xs text-blue-600">ALGO</div>
              </Card>
            </div>

            {/* Weather Overview */}
            <WeatherFeed 
              data={weatherData} 
              riskLevel="low"
              triggers={[]}
              deviceId={weatherDeviceId}
              onRefresh={refetchWeather}
            />

            {/* Recent Policies */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Your Policies</h2>
                {activePolicies.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('policies')}
                  >
                    View All
                  </Button>
                )}
              </div>
              {activePolicies.length > 0 ? (
                <div className="space-y-4">
                  {activePolicies.slice(0, 2).map((policy) => (
                    <PolicyStatusCard
                      key={policy.id}
                      policy={policy}
                      onViewDetails={() => {}}
                    />
                  ))}
                </div>
              ) : (
                <Card padding="lg" className="text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Policies</h3>
                  <p className="text-gray-600 mb-4">Protect your crops with weather-based insurance</p>
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('marketplace')}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Get Coverage
                  </Button>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">My Policies</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('marketplace')}
                icon={<Plus className="w-4 h-4" />}
              >
                New Policy
              </Button>
            </div>
            {policies.length > 0 ? (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <PolicyStatusCard
                    key={policy.id}
                    policy={policy}
                    onViewDetails={() => {}}
                  />
                ))}
              </div>
            ) : (
              <Card padding="xl" className="text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Policies Yet</h3>
                <p className="text-gray-600 mb-6">Start protecting your crops today</p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setActiveTab('marketplace')}
                  icon={<Plus className="w-5 h-5" />}
                >
                  Create Your First Policy
                </Button>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Weather Monitor</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                loading={refreshing}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
            
            <WeatherFeed 
              data={weatherData} 
              riskLevel="low"
              triggers={[]}
              deviceId={weatherDeviceId}
              onRefresh={refetchWeather}
            />

            {/* Weather device info */}
            <Card padding="md" className="bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">WeatherXM Integration</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Device ID:</strong> {weatherDeviceId}</p>
                <p><strong>Data Points:</strong> {weatherData.length}</p>
                <p><strong>Quality Score:</strong> {weatherStats?.qualityScore?.toFixed(0) || 'N/A'}%</p>
                <p className="text-blue-700">
                  Weather data is sourced from WeatherXM's decentralized network of weather stations.
                </p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Available Coverage</h2>
              <p className="text-gray-600">Choose the right protection for your crops</p>
            </div>
            <div className="space-y-4">
              {cropTypes.map((crop) => (
                <CoverageCard
                  key={crop.id}
                  crop={crop}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-all duration-200 min-w-[44px] min-h-[44px] ${
                  isActive 
                    ? 'text-green-600 bg-green-50 transform scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom padding for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
};