import React, { useState } from 'react';
import { Slider } from '../ui/Slider';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CropType } from '../../../types';
import { ShoppingCart, Info, TrendingUp, Shield, AlertTriangle } from 'lucide-react';

interface CoverageCardProps {
  crop: CropType;
  onPurchase: (cropId: string, coverageAmount: number, duration: number) => void;
  loading?: boolean;
}

export const CoverageCard: React.FC<CoverageCardProps> = ({ crop, onPurchase, loading }) => {
  const [coverageAmount, setCoverageAmount] = useState(5); // Start with 5 ALGO
  const [duration, setDuration] = useState(90);
  const [showDetails, setShowDetails] = useState(false);

  const premiumAmount = coverageAmount * crop.premiumRate;
  const monthlyPremium = (premiumAmount / duration) * 30;

  const handlePurchase = async () => {
    try {
      await onPurchase(crop.id, coverageAmount, duration);
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const durationOptions = [
    { value: 60, label: '60 days', popular: false },
    { value: 90, label: '90 days', popular: true },
    { value: 120, label: '120 days', popular: false }
  ];

  return (
    <Card hover padding="none" className="overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{crop.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{crop.name}</h3>
              <p className="text-sm text-gray-500">Weather-protected coverage</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            icon={<Info className="w-4 h-4" />}
          />
        </div>

        {/* Risk indicators */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 font-medium">Min Rainfall</div>
            <div className="text-sm font-bold text-blue-800">{crop.minRainfall}mm</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-xs text-red-600 font-medium">Max Temp</div>
            <div className="text-sm font-bold text-red-800">{crop.maxTemperature}°C</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 font-medium">Premium</div>
            <div className="text-sm font-bold text-green-800">{(crop.premiumRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Coverage amount slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Shield className="w-4 h-4" />
              <span>Coverage Amount</span>
            </label>
            <span className="text-lg font-bold text-gray-900">{coverageAmount.toLocaleString()} ALGO</span>
          </div>
          <Slider
            value={[coverageAmount]}
            onValueChange={(value) => setCoverageAmount(value[0])}
            max={8} // Maximum 8 ALGO for testing
            min={1} // Minimum 1 ALGO
            step={0.5} // 0.5 ALGO increments
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 ALGO</span>
            <span>8 ALGO</span>
          </div>
        </div>

        {/* Duration selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Coverage Period</label>
          <div className="grid grid-cols-3 gap-2">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDuration(option.value)}
                className={`relative py-3 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  duration === option.value
                    ? 'bg-green-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                }`}
              >
                {option.label}
                {option.popular && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Premium breakdown */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6 border border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Premium:</span>
              <span className="font-medium">{premiumAmount.toFixed(3)} ALGO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Cost:</span>
              <span className="font-medium">{monthlyPremium.toFixed(3)} ALGO</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium text-gray-900">You Pay Now:</span>
              <span className="font-bold text-green-600">{premiumAmount.toFixed(3)} ALGO</span>
            </div>
          </div>
        </div>

        {/* Purchase button */}
        <Button
          variant="primary"
          size="lg"
          onClick={handlePurchase}
          loading={loading}
          icon={<ShoppingCart className="w-5 h-5" />}
          fullWidth
        >
          Purchase Coverage
        </Button>

        {/* Protection details */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p className="flex items-center justify-center space-x-4">
            <span className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Automatic payouts</span>
            </span>
            <span className="flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>No paperwork</span>
            </span>
            <span className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Instant settlements</span>
            </span>
          </p>
        </div>

        {/* Expandable details */}
        {showDetails && (
          <div className="mt-6 pt-6 border-t border-gray-200 animate-slideDown">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Coverage Details</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Automatic payouts when rainfall drops below {crop.minRainfall}mm/month</p>
              <p>• Protection against temperatures exceeding {crop.maxTemperature}°C</p>
              <p>• Coverage for excessive rainfall above {crop.maxDailyRainfall}mm/day</p>
              <p>• Powered by WeatherXM real-time data</p>
              <p>• Instant blockchain settlements</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};