/**
 * Weather Data Hook - Updated for WeatherXM integration
 * Manages weather data fetching and caching
 */

import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '../../types';

interface WeatherState {
  data: WeatherData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface WeatherAnalysis {
  triggers: Array<{
    type: string;
    severity: string;
    value: number;
    threshold: number;
    description: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export const useWeatherData = (deviceId: string | null, days: number = 7) => {
  const [state, setState] = useState<WeatherState>({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  const [analysis, setAnalysis] = useState<WeatherAnalysis | null>(null);

  const fetchWeatherData = useCallback(async () => {
    if (!deviceId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`http://localhost:3001/api/weather/${deviceId}?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch weather data');
      }
      
      setState(prev => ({
        ...prev,
        data: result.weatherData,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather data'
      }));
    }
  }, [deviceId, days]);

  const analyzeWeatherConditions = useCallback(async (cropType: string, thresholds: any) => {
    if (!deviceId || !cropType || !thresholds) return;

    try {
      const response = await fetch('http://localhost:3001/api/weather/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          cropType,
          thresholds,
          days
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Weather analysis failed:', error);
    }
  }, [deviceId, days]);

  const findNearbyDevices = useCallback(async (lat: number, lng: number, radius: number = 50) => {
    try {
      const response = await fetch(`http://localhost:3001/api/weather/devices/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.devices;
      } else {
        throw new Error(result.error || 'Failed to find nearby devices');
      }
    } catch (error) {
      console.error('Failed to find nearby devices:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  const refetch = () => {
    fetchWeatherData();
  };

  // Calculate weather statistics
  const getWeatherStats = () => {
    if (state.data.length === 0) return null;

    const temperatures = state.data.map(d => d.temperature).filter(t => t !== null && t !== undefined);
    const rainfalls = state.data.map(d => d.rainfall || d.precipitation || 0);

    if (temperatures.length === 0) return null;

    return {
      avgTemperature: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      maxTemperature: Math.max(...temperatures),
      minTemperature: Math.min(...temperatures),
      totalRainfall: rainfalls.reduce((a, b) => a + b, 0),
      avgRainfall: rainfalls.reduce((a, b) => a + b, 0) / rainfalls.length,
      dataPoints: state.data.length,
      qualityScore: state.data.reduce((sum, d) => sum + (d.qualityScore || 100), 0) / state.data.length
    };
  };

  return {
    ...state,
    analysis,
    refetch,
    analyzeWeatherConditions,
    findNearbyDevices,
    weatherStats: getWeatherStats()
  };
};