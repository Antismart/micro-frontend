import React, { useEffect, useState } from 'react';
import { Cloud, Droplets, Thermometer, Wind, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { WeatherData } from '../../../types';
import { format } from 'date-fns';
import { Button } from '../ui/Button';

interface WeatherFeedProps {
  data: WeatherData[];
  riskLevel: 'low' | 'medium' | 'high';
  triggers?: Array<{
    type: string;
    severity: string;
    value: number;
    threshold: number;
    description: string;
  }>;
  deviceId?: string;
  onRefresh?: () => void;
}

export const WeatherFeed: React.FC<WeatherFeedProps> = ({ 
  data, 
  riskLevel, 
  triggers = [], 
  deviceId,
  onRefresh 
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Weather Data</h3>
          <p className="text-gray-600 mb-4">Weather information will appear once available</p>
          {deviceId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h4 className="font-medium text-blue-800 mb-2">Using WeatherXM Integration</h4>
              <p className="text-sm text-blue-700">
                Weather data is fetched from WeatherXM's decentralized network. 
                If no data appears, it may be because:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• No weather stations are nearby</li>
                <li>• The device ID needs to be configured</li>
                <li>• WeatherXM API is temporarily unavailable</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const latestReading = data[data.length - 1];
  const last24Hours = data.slice(-24);
  
  const avgTemp = last24Hours.reduce((sum, reading) => sum + reading.temperature, 0) / last24Hours.length;
  const totalRainfall = last24Hours.reduce((sum, reading) => sum + (reading.rainfall || reading.precipitation || 0), 0);
  const avgHumidity = last24Hours.reduce((sum, reading) => sum + reading.humidity, 0) / last24Hours.length;
  const avgWindSpeed = last24Hours.reduce((sum, reading) => sum + reading.windSpeed, 0) / last24Hours.length;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return AlertTriangle;
      case 'medium': return Clock;
      default: return CheckCircle;
    }
  };

  const RiskIcon = getRiskIcon(riskLevel);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6">
        {/* Header with risk level */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Weather Monitor</h3>
            <p className="text-sm text-gray-600">
              Last updated: {format(new Date(latestReading.timestamp), 'MMM dd, HH:mm')}
              {deviceId && <span className="ml-2 text-blue-600">• Device: {deviceId}</span>}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium ${getRiskColor(riskLevel)}`}>
              <RiskIcon className="w-4 h-4" />
              <span className="capitalize">{riskLevel} Risk</span>
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                loading={refreshing}
                icon={<RefreshCw className="w-4 h-4" />}
              />
            )}
          </div>
        </div>

        {/* Current conditions grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Thermometer className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Temperature</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{avgTemp.toFixed(1)}°C</div>
            <div className="text-xs text-blue-600">24h average</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Droplets className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Rainfall</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{totalRainfall.toFixed(1)}mm</div>
            <div className="text-xs text-green-600">Last 24 hours</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Cloud className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Humidity</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{avgHumidity.toFixed(0)}%</div>
            <div className="text-xs text-purple-600">24h average</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Wind className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Wind Speed</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">{avgWindSpeed.toFixed(1)} m/s</div>
            <div className="text-xs text-orange-600">24h average</div>
          </div>
        </div>

        {/* Data quality indicator */}
        {latestReading.qualityScore && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Data Quality</span>
              <span className="text-sm text-gray-600">{latestReading.qualityScore.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  latestReading.qualityScore >= 90 ? 'bg-green-600' :
                  latestReading.qualityScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${latestReading.qualityScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Rainfall chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">24-Hour Rainfall Pattern</h4>
          <div className="flex items-end space-x-1 h-20">
            {last24Hours.map((reading, index) => {
              const rainfall = reading.rainfall || reading.precipitation || 0;
              const maxRainfall = Math.max(...last24Hours.map(r => r.rainfall || r.precipitation || 0));
              const height = maxRainfall > 0 ? Math.max((rainfall / maxRainfall) * 100, 2) : 2;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-200 rounded-t hover:bg-blue-300 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${rainfall.toFixed(1)}mm at ${format(new Date(reading.timestamp), 'HH:mm')}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{format(new Date(last24Hours[0]?.timestamp), 'HH:mm')}</span>
            <span>Now</span>
          </div>
        </div>

        {/* Active triggers */}
        {triggers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Weather Alerts</h4>
            <div className="space-y-2">
              {triggers.map((trigger, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${
                    trigger.severity === 'severe' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 ${trigger.severity === 'severe' ? 'text-red-600' : 'text-orange-600'}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${trigger.severity === 'severe' ? 'text-red-800' : 'text-orange-800'}`}>
                      {trigger.description}
                    </div>
                    <div className={`text-xs ${trigger.severity === 'severe' ? 'text-red-600' : 'text-orange-600'}`}>
                      Current: {trigger.value.toFixed(1)} | Threshold: {trigger.threshold.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WeatherXM attribution */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Powered by WeatherXM Network</span>
            <span>{data.length} data points</span>
          </div>
        </div>
      </div>
    </div>
  );
};