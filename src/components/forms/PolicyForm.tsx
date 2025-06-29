/**
 * New Policy Form Component
 */

import React, { useState } from 'react';
import { MapPin, Calendar, DollarSign, Sprout } from 'lucide-react';
import { CropType } from '../../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface PolicyFormProps {
  onSubmit: (policyData: any) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export const PolicyForm: React.FC<PolicyFormProps> = ({ onSubmit, loading, error }) => {
  const [formData, setFormData] = useState({
    cropType: '',
    coverageAmount: '',
    duration: '90', // days
    latitude: '',
    longitude: '',
    address: ''
  });

  const cropTypes: CropType[] = [
    { id: 'maize', name: 'Maize/Corn', minRainfall: 300, maxTemperature: 35, maxDailyRainfall: 50, premiumRate: 0.08, icon: '🌽' },
    { id: 'rice', name: 'Rice', minRainfall: 400, maxTemperature: 38, maxDailyRainfall: 80, premiumRate: 0.10, icon: '🌾' },
    { id: 'wheat', name: 'Wheat', minRainfall: 200, maxTemperature: 32, maxDailyRainfall: 40, premiumRate: 0.06, icon: '🌾' },
    { id: 'cotton', name: 'Cotton', minRainfall: 250, maxTemperature: 40, maxDailyRainfall: 45, premiumRate: 0.12, icon: '🌱' }
  ];

  const selectedCrop = cropTypes.find(c => c.id === formData.cropType);
  const coverageAmount = parseFloat(formData.coverageAmount) || 0;
  const premiumAmount = selectedCrop ? coverageAmount * selectedCrop.premiumRate : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cropType || !formData.coverageAmount || !formData.latitude || !formData.longitude) {
      return;
    }

    await onSubmit({
      cropType: formData.cropType,
      coverageAmount: coverageAmount,
      duration: parseInt(formData.duration),
      location: {
        lat: parseFloat(formData.latitude),
        lng: parseFloat(formData.longitude),
        address: formData.address,
        deviceId: 'nearest' // Will be resolved by backend
      }
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
          <Sprout className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">New Insurance Policy</h2>
          <p className="text-sm text-gray-600">Protect your crops with weather-based insurance</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Crop Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Crop Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {cropTypes.map((crop) => (
              <label
                key={crop.id}
                className={`relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  formData.cropType === crop.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="cropType"
                  value={crop.id}
                  checked={formData.cropType === crop.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, cropType: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{crop.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{crop.name}</p>
                    <p className="text-xs text-gray-500">{(crop.premiumRate * 100).toFixed(1)}% premium</p>
                  </div>
                </div>
                {formData.cropType === crop.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Coverage Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coverage Amount (ALGO)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              min="100"
              step="50"
              value={formData.coverageAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, coverageAmount: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Enter coverage amount"
              required
            />
          </div>
          {premiumAmount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Premium: <strong>{premiumAmount.toFixed(2)} ALGO</strong>
            </p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coverage Duration
          </label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days (Recommended)</option>
            <option value="120">120 Days</option>
            <option value="180">180 Days</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Farm Location
          </label>
          <div className="space-y-3">
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Latitude"
                  required
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Longitude"
                  required
                />
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Farm address (optional)"
            />
          </div>
        </div>

        {/* Policy Summary */}
        {selectedCrop && coverageAmount > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Policy Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Crop Type:</span>
                <span className="font-medium">{selectedCrop.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Coverage Amount:</span>
                <span className="font-medium">{coverageAmount.toLocaleString()} ALGO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Premium Rate:</span>
                <span className="font-medium">{(selectedCrop.premiumRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{formData.duration} days</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-900 font-medium">Premium Due:</span>
                <span className="text-green-600 font-bold">{premiumAmount.toFixed(2)} ALGO</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !formData.cropType || !formData.coverageAmount || !formData.latitude || !formData.longitude}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              <span>Create Policy</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};