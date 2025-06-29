/**
 * WeatherXM Service - Production-ready integration
 * Handles weather data fetching, caching, and real-time monitoring
 */

import axios from 'axios';
import crypto from 'crypto';
import EventEmitter from 'events';

export class WeatherXMService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = process.env.WEATHERXM_API_KEY;
    this.baseURL = process.env.WEATHERXM_API_URL || 'https://api.weatherxm.com/api/v1';
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    
    // Connection and caching
    this.dataCache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    
    // Rate limiting
    this.rateLimitWindow = 60000; // 1 minute
    this.maxRequestsPerWindow = 100;
    this.requestCounts = new Map();
    
    // Health monitoring
    this.healthStatus = {
      isHealthy: true,
      lastSuccessfulRequest: new Date(),
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0
    };
    
    this.initializeClient();
    this.startHealthMonitoring();
  }

  /**
   * Initialize HTTP client with authentication
   */
  initializeClient() {
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MicroCrop-Insurance/1.0'
      }
    });

    // Request interceptor for rate limiting
    this.httpClient.interceptors.request.use(
      async (config) => {
        await this.enforceRateLimit();
        this.healthStatus.totalRequests++;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        this.healthStatus.successfulRequests++;
        this.healthStatus.consecutiveFailures = 0;
        this.healthStatus.lastSuccessfulRequest = new Date();
        return response;
      },
      (error) => {
        this.healthStatus.consecutiveFailures++;
        this.handleRequestError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get current weather data for a specific device
   */
  async getCurrentWeather(deviceId) {
    const cacheKey = `current_${deviceId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(`/devices/${deviceId}/current`);
      const weatherData = this.normalizeWeatherData(response.data, deviceId);
      
      this.setCache(cacheKey, weatherData, 5 * 60 * 1000); // 5 minutes cache
      this.emit('weatherDataReceived', weatherData);
      
      return weatherData;
    } catch (error) {
      console.error(`Failed to get current weather for device ${deviceId}:`, error);
      throw new Error(`Weather data unavailable for device ${deviceId}`);
    }
  }

  /**
   * Get historical weather data
   */
  async getHistoricalWeather(deviceId, startDate, endDate, granularity = 'hourly') {
    const cacheKey = `history_${deviceId}_${startDate}_${endDate}_${granularity}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(`/devices/${deviceId}/history`, {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          granularity
        }
      });

      const historicalData = response.data.map(reading => 
        this.normalizeWeatherData(reading, deviceId)
      );
      
      this.setCache(cacheKey, historicalData, 60 * 60 * 1000); // 1 hour cache
      
      return historicalData;
    } catch (error) {
      console.error(`Failed to get historical weather for device ${deviceId}:`, error);
      throw new Error(`Historical weather data unavailable for device ${deviceId}`);
    }
  }

  /**
   * Find nearby weather devices
   */
  async getNearbyDevices(latitude, longitude, radius = 50) {
    const cacheKey = `nearby_${latitude}_${longitude}_${radius}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry('/devices/nearby', {
        params: {
          lat: latitude,
          lng: longitude,
          radius
        }
      });

      const devices = response.data.map(device => ({
        deviceId: device.id,
        name: device.name,
        location: {
          lat: device.location.lat,
          lng: device.location.lng,
          address: device.location.address
        },
        distance: this.calculateDistance(latitude, longitude, device.location.lat, device.location.lng),
        lastSeen: new Date(device.last_seen),
        status: device.status,
        dataQuality: device.data_quality_score || 0,
        elevation: device.elevation
      }));

      this.setCache(cacheKey, devices, 30 * 60 * 1000); // 30 minutes cache
      
      return devices;
    } catch (error) {
      console.error(`Failed to find nearby devices:`, error);
      throw new Error('Unable to find nearby weather devices');
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

    if (!weatherData || weatherData.length === 0) {
      return analysis;
    }

    // Calculate averages and extremes
    const temperatures = weatherData.map(d => d.temperature).filter(t => t !== null);
    const rainfalls = weatherData.map(d => d.precipitation).filter(r => r !== null);
    
    if (temperatures.length === 0 || rainfalls.length === 0) {
      return analysis;
    }

    const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const maxTemp = Math.max(...temperatures);
    const minTemp = Math.min(...temperatures);
    const totalRainfall = rainfalls.reduce((a, b) => a + b, 0);

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
    const dailyRainfalls = this.calculateDailyTotals(weatherData, 'precipitation');
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
   * Validate weather data quality
   */
  validateWeatherData(data) {
    const validationRules = {
      temperature: { min: -50, max: 60, unit: 'celsius' },
      humidity: { min: 0, max: 100, unit: 'percent' },
      wind_speed: { min: 0, max: 200, unit: 'm/s' },
      wind_direction: { min: 0, max: 360, unit: 'degrees' },
      pressure: { min: 800, max: 1100, unit: 'hPa' },
      precipitation: { min: 0, max: 1000, unit: 'mm' }
    };

    const errors = [];
    const warnings = [];

    for (const [field, rules] of Object.entries(validationRules)) {
      if (data[field] !== undefined && data[field] !== null) {
        if (data[field] < rules.min || data[field] > rules.max) {
          errors.push(`${field} value ${data[field]} outside valid range [${rules.min}, ${rules.max}] ${rules.unit}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: this.calculateQualityScore(data, errors, warnings)
    };
  }

  /**
   * Normalize weather data from WeatherXM format
   */
  normalizeWeatherData(rawData, deviceId) {
    const normalized = {
      deviceId,
      timestamp: new Date(rawData.timestamp).getTime(),
      temperature: rawData.temperature || 0,
      humidity: rawData.humidity || 0,
      windSpeed: rawData.wind_speed || 0,
      windDirection: rawData.wind_direction || 0,
      windGusts: rawData.wind_gusts || 0,
      pressure: rawData.pressure || 0,
      precipitation: rawData.precipitation || 0,
      rainfall: rawData.precipitation || 0, // Alias for compatibility
      solarRadiation: rawData.solar_radiation || 0,
      uvIndex: rawData.uv_index || 0,
      visibility: rawData.visibility || 0,
      cloudCover: rawData.cloud_cover || 0,
      location: {
        lat: 0,
        lng: 0,
        address: ''
      }
    };

    // Validate and add quality metrics
    const validation = this.validateWeatherData(normalized);
    normalized.dataQuality = validation;
    normalized.qualityScore = validation.qualityScore;

    return normalized;
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
   * Fetch with retry logic and exponential backoff
   */
  async fetchWithRetry(endpoint, options = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.httpClient.request({
          url: endpoint,
          ...options
        });
        return response;
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryableError(error) || attempt === this.retryAttempts) {
          break;
        }

        const delay = this.calculateBackoffDelay(attempt);
        console.warn(`Request failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    // Clean old entries
    for (const [timestamp] of this.requestCounts) {
      if (timestamp < windowStart) {
        this.requestCounts.delete(timestamp);
      }
    }
    
    // Check current window
    const currentRequests = this.requestCounts.size;
    if (currentRequests >= this.maxRequestsPerWindow) {
      const oldestRequest = Math.min(...this.requestCounts.keys());
      const waitTime = oldestRequest + this.rateLimitWindow - now;
      await this.sleep(waitTime);
    }
    
    this.requestCounts.set(now, true);
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.dataCache.delete(key);
    return null;
  }

  setCache(key, data, ttl = this.cacheTimeout) {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Health monitoring
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.checkHealth();
    }, 60000); // Check every minute
  }

  checkHealth() {
    const now = new Date();
    const timeSinceLastSuccess = now - this.healthStatus.lastSuccessfulRequest;
    const successRate = this.healthStatus.totalRequests > 0 ? 
      this.healthStatus.successfulRequests / this.healthStatus.totalRequests : 0;

    this.healthStatus.isHealthy = 
      timeSinceLastSuccess < 5 * 60 * 1000 && // Last success within 5 minutes
      this.healthStatus.consecutiveFailures < 5 && // Less than 5 consecutive failures
      successRate > 0.95; // Success rate above 95%

    if (!this.healthStatus.isHealthy) {
      this.emit('healthCheckFailed', this.healthStatus);
    }
  }

  getHealthStatus() {
    return {
      ...this.healthStatus,
      cacheSize: this.dataCache.size,
      uptime: process.uptime()
    };
  }

  /**
   * Utility functions
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

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  calculateQualityScore(data, errors, warnings) {
    let score = 100;
    score -= errors.length * 20; // -20 points per error
    score -= warnings.length * 5; // -5 points per warning
    
    // Additional quality checks
    if (data.timestamp) {
      const age = Date.now() - new Date(data.timestamp).getTime();
      if (age > 60 * 60 * 1000) { // Data older than 1 hour
        score -= 10;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  isRetryableError(error) {
    if (!error.response) {
      return true; // Network errors are retryable
    }

    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors and rate limiting
  }

  calculateBackoffDelay(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, maxDelay);
  }

  handleRequestError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 401:
          console.error('WeatherXM API authentication failed');
          this.emit('authenticationError', error);
          break;
        case 403:
          console.error('WeatherXM API access forbidden');
          this.emit('accessDenied', error);
          break;
        case 429:
          console.warn('WeatherXM API rate limit exceeded');
          this.emit('rateLimitExceeded', error);
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          console.error('WeatherXM API server error:', message);
          this.emit('serverError', error);
          break;
        default:
          console.error('WeatherXM API error:', message);
          this.emit('apiError', error);
      }
    } else {
      console.error('WeatherXM network error:', error.message);
      this.emit('networkError', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}