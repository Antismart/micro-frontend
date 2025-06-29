/**
 * WeatherXM Integration Service
 * Handles weather data fetching and analysis
 */

import axios from 'axios';

export class WeatherService {
  constructor() {
    this.baseURL = 'https://api.weatherxm.com/api/v1';
    this.apiKey = process.env.WEATHERXM_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get weather devices near a location
   */
  async getNearbyDevices(lat, lng, radius = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/devices`, {
        params: {
          lat,
          lng,
          radius,
          limit: 20
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data.map(device => ({
        deviceId: device.id,
        name: device.name,
        location: {
          lat: device.location.lat,
          lng: device.location.lng,
          address: device.location.address
        },
        lastSeen: device.last_seen,
        status: device.status,
        distance: this.calculateDistance(lat, lng, device.location.lat, device.location.lng)
      }));
    } catch (error) {
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
      
      const response = await axios.get(`${this.baseURL}/devices/${deviceId}/data`, {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          granularity: 'hourly'
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const weatherData = response.data.map(reading => ({
        deviceId,
        timestamp: new Date(reading.timestamp).getTime(),
        temperature: reading.temperature,
        humidity: reading.humidity,
        rainfall: reading.precipitation,
        windSpeed: reading.wind_speed,
        pressure: reading.pressure,
        solarRadiation: reading.solar_radiation
      }));

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      throw new Error(`Failed to fetch weather history: ${error.message}`);
    }
  }

  /**
   * Get latest weather reading for a device
   */
  async getCurrentWeather(deviceId) {
    try {
      const response = await axios.get(`${this.baseURL}/devices/${deviceId}/current`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const reading = response.data;
      return {
        deviceId,
        timestamp: new Date(reading.timestamp).getTime(),
        temperature: reading.temperature,
        humidity: reading.humidity,
        rainfall: reading.precipitation,
        windSpeed: reading.wind_speed,
        pressure: reading.pressure,
        solarRadiation: reading.solar_radiation
      };
    } catch (error) {
      throw new Error(`Failed to fetch current weather: ${error.message}`);
    }
  }

  /**
   * Analyze weather conditions for insurance triggers
   */
  analyzeWeatherConditions(weatherData, cropType, thresholds) {
    const analysis = {
      triggers: [],
      riskLevel: 'low',
      recommendations: []
    };

    // Calculate averages and extremes
    const temperatures = weatherData.map(d => d.temperature);
    const rainfalls = weatherData.map(d => d.rainfall);
    
    const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const maxTemp = Math.max(...temperatures);
    const minTemp = Math.min(...temperatures);
    const totalRainfall = rainfalls.reduce((a, b) => a + b, 0);
    const avgRainfall = totalRainfall / rainfalls.length;

    // Drought conditions
    if (totalRainfall < thresholds.minMonthlyRainfall) {
      analysis.triggers.push({
        type: 'drought',
        severity: totalRainfall < (thresholds.minMonthlyRainfall * 0.5) ? 'severe' : 'moderate',
        value: totalRainfall,
        threshold: thresholds.minMonthlyRainfall,
        description: `Total rainfall (${totalRainfall.toFixed(1)}mm) below minimum threshold`
      });
    }

    // Excessive heat
    if (maxTemp > thresholds.maxTemperature) {
      analysis.triggers.push({
        type: 'excessive_heat',
        severity: maxTemp > (thresholds.maxTemperature + 5) ? 'severe' : 'moderate',
        value: maxTemp,
        threshold: thresholds.maxTemperature,
        description: `Maximum temperature (${maxTemp.toFixed(1)}°C) exceeded threshold`
      });
    }

    // Excessive rainfall (flooding)
    const dailyRainfalls = this.calculateDailyTotals(weatherData, 'rainfall');
    const maxDailyRainfall = Math.max(...dailyRainfalls);
    
    if (maxDailyRainfall > thresholds.maxDailyRainfall) {
      analysis.triggers.push({
        type: 'flooding',
        severity: maxDailyRainfall > (thresholds.maxDailyRainfall * 1.5) ? 'severe' : 'moderate',
        value: maxDailyRainfall,
        threshold: thresholds.maxDailyRainfall,
        description: `Daily rainfall (${maxDailyRainfall.toFixed(1)}mm) exceeded flooding threshold`
      });
    }

    // Determine overall risk level
    const severeTriggers = analysis.triggers.filter(t => t.severity === 'severe');
    const moderateTriggers = analysis.triggers.filter(t => t.severity === 'moderate');

    if (severeTriggers.length > 0) {
      analysis.riskLevel = 'high';
    } else if (moderateTriggers.length > 1) {
      analysis.riskLevel = 'medium';
    }

    return analysis;
  }

  /**
   * Calculate daily totals from hourly data
   */
  calculateDailyTotals(weatherData, field) {
    const dailyTotals = {};
    
    weatherData.forEach(reading => {
      const date = new Date(reading.timestamp).toDateString();
      if (!dailyTotals[date]) {
        dailyTotals[date] = 0;
      }
      dailyTotals[date] += reading[field] || 0;
    });
    
    return Object.values(dailyTotals);
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Sync data for all active devices
   */
  async syncAllDeviceData() {
    // This would be implemented to sync data for all devices
    // that have active policies associated with them
    console.log('Syncing weather data for all active devices...');
  }
}