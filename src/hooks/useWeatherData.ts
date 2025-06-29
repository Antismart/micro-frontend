/**
 * Weather Data Hook
 * Manages weather data fetching and caching
 */

import { useState, useEffect } from 'react';
import { WeatherData } from '../../types';

interface WeatherState {
  data: WeatherData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useWeatherData = (deviceId: string | null, days: number = 7) => {
  const [state, setState] = useState<WeatherState>({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  const fetchWeatherData = async () => {
    if (!deviceId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/weather/${deviceId}?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
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
  };

  useEffect(() => {
    fetchWeatherData();
  }, [deviceId, days]);

  const refetch = () => {
    fetchWeatherData();
  };

  // Calculate weather statistics
  const getWeatherStats = () => {
    if (state.data.length === 0) return null;

    const temperatures = state.data.map(d => d.temperature);
    const rainfalls = state.data.map(d => d.rainfall);

    return {
      avgTemperature: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      maxTemperature: Math.max(...temperatures),
      minTemperature: Math.min(...temperatures),
      totalRainfall: rainfalls.reduce((a, b) => a + b, 0),
      avgRainfall: rainfalls.reduce((a, b) => a + b, 0) / rainfalls.length,
      dataPoints: state.data.length
    };
  };

  return {
    ...state,
    refetch,
    weatherStats: getWeatherStats()
  };
};