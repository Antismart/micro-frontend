/**
 * Weather Service - Updated to use WeatherXM integration
 * Handles weather data fetching and analysis for insurance policies
 */

import { WeatherXMService } from './WeatherXMService.js';

export class WeatherService {
  constructor() {
    this.weatherXM = new WeatherXMService();
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    
    // Set up event listeners
    this.weatherXM.on('weatherDataReceived', (data) => {
      console.log(`📊 Weather data received for device ${data.deviceId}`);
    });
    
    this.weatherXM.on('healthCheckFailed', (status) => {
      console.warn('⚠️ WeatherXM health check failed:', status);
    });
  }

  /**
   * Get weather devices near a location
   */
  async getNearbyDevices(lat, lng, radius = 50) {
    try {
      const devices = await this.weatherXM.getNearbyDevices(lat, lng, radius);
      
      return devices.map(device => ({
        deviceId: device.deviceId,
        name: device.name,
        location: {
          lat: device.location.lat,
          lng: device.location.lng,
          address: device.location.address
        },
        lastSeen: device.lastSeen,
        status: device.status,
        distance: device.distance,
        dataQuality: device.dataQuality
      }));
    } catch (error) {
      console.error('Failed to fetch nearby devices:', error);
      throw new Error(`Failed to fetch nearby devices: ${error.message}`);
    }
  }

  /**
   * Get historical weather data for a device
   */
  async getWeatherHistory(deviceId, days = 7) {
    const cacheKey = `weather_${deviceId}_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const weatherData = await this.weatherXM.getHistoricalWeather(
        deviceId, 
        startDate, 
        endDate, 
        'hourly'
      );

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather history:', error);
      
      // Return mock data for testing if WeatherXM is unavailable
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockWeatherData(deviceId, days);
      }
      
      throw new Error(`Failed to fetch weather history: ${error.message}`);
    }
  }

  /**
   * Get latest weather reading for a device
   */
  async getCurrentWeather(deviceId) {
    try {
      const weatherData = await this.weatherXM.getCurrentWeather(deviceId);
      return weatherData;
    } catch (error) {
      console.error('Failed to fetch current weather:', error);
      
      // Return mock data for testing if WeatherXM is unavailable
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockCurrentWeather(deviceId);
      }
      
      throw new Error(`Failed to fetch current weather: ${error.message}`);
    }
  }

  /**
   * Analyze weather conditions for insurance triggers
   */
  analyzeWeatherConditions(weatherData, cropType, thresholds) {
    return this.weatherXM.analyzeWeatherConditions(weatherData, cropType, thresholds);
  }

  /**
   * Generate mock weather data for testing
   */
  generateMockWeatherData(deviceId, days) {
    const mockData = [];
    const now = Date.now();
    
    for (let i = 0; i < days * 24; i++) {
      const timestamp = now - (i * 60 * 60 * 1000); // Hourly data
      
      mockData.push({
        deviceId,
        timestamp,
        temperature: 20 + Math.random() * 15, // 20-35°C
        humidity: 40 + Math.random() * 40, // 40-80%
        rainfall: Math.random() < 0.3 ? Math.random() * 10 : 0, // 30% chance of rain
        precipitation: Math.random() < 0.3 ? Math.random() * 10 : 0,
        windSpeed: Math.random() * 20, // 0-20 m/s
        windDirection: Math.random() * 360,
        pressure: 1000 + Math.random() * 50, // 1000-1050 hPa
        solarRadiation: Math.random() * 1000,
        uvIndex: Math.random() * 12,
        qualityScore: 85 + Math.random() * 15, // 85-100%
        location: {
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1,
          address: `Test Location ${deviceId}`
        }
      });
    }
    
    return mockData.reverse(); // Oldest first
  }

  /**
   * Generate mock current weather data for testing
   */
  generateMockCurrentWeather(deviceId) {
    return {
      deviceId,
      timestamp: Date.now(),
      temperature: 25 + Math.random() * 10,
      humidity: 50 + Math.random() * 30,
      rainfall: Math.random() < 0.2 ? Math.random() * 5 : 0,
      precipitation: Math.random() < 0.2 ? Math.random() * 5 : 0,
      windSpeed: Math.random() * 15,
      windDirection: Math.random() * 360,
      pressure: 1010 + Math.random() * 20,
      solarRadiation: Math.random() * 800,
      uvIndex: Math.random() * 10,
      qualityScore: 90 + Math.random() * 10,
      location: {
        lat: 40.7128,
        lng: -74.0060,
        address: `Test Location ${deviceId}`
      }
    };
  }

  /**
   * Sync data for all active devices
   */
  async syncAllDeviceData() {
    console.log('🔄 Syncing weather data for all active devices...');
    
    try {
      // In a real implementation, this would sync data for all devices
      // that have active policies associated with them
      const healthStatus = this.weatherXM.getHealthStatus();
      console.log('📊 WeatherXM Health Status:', healthStatus);
      
      return {
        success: true,
        syncedDevices: 0,
        healthStatus
      };
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return this.weatherXM.getHealthStatus();
  }
}