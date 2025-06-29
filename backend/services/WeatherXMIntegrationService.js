/**
 * WeatherXM Integration Service
 * Complete implementation of WeatherXM API integration with error handling,
 * caching, and real-time data processing
 */

import axios from 'axios';
import crypto from 'crypto';
import EventEmitter from 'events';

export class WeatherXMIntegrationService extends EventEmitter {
  constructor() {
    super();
    this.baseURL = process.env.WEATHERXM_API_URL || 'https://api.weatherxm.com/api/v1';
    this.apiKey = process.env.WEATHERXM_API_KEY;
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.backoffMultiplier = 2;
    
    // Connection pool and caching
    this.connectionPool = new Map();
    this.dataCache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    
    // Rate limiting
    this.requestQueue = [];
    this.rateLimitWindow = 60000; // 1 minute
    this.maxRequestsPerWindow = 1000;
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
   * Initialize HTTP client with authentication and interceptors
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
   * Get device information and metadata
   */
  async getDeviceInfo(deviceId) {
    const cacheKey = `device_info_${deviceId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(`/devices/${deviceId}`);
      const deviceInfo = {
        deviceId: response.data.id,
        name: response.data.name,
        owner: response.data.owner,
        location: response.data.location,
        installationDate: new Date(response.data.installation_date),
        lastMaintenance: response.data.last_maintenance ? new Date(response.data.last_maintenance) : null,
        status: response.data.status,
        dataQuality: response.data.data_quality_score,
        sensors: response.data.sensors,
        coverageRadius: response.data.coverage_radius
      };

      this.setCache(cacheKey, deviceInfo, 24 * 60 * 60 * 1000); // 24 hours cache
      
      return deviceInfo;
    } catch (error) {
      console.error(`Failed to get device info for ${deviceId}:`, error);
      throw new Error(`Device information unavailable for ${deviceId}`);
    }
  }

  /**
   * Get XM token rewards for a device
   */
  async getDeviceRewards(deviceId, startDate, endDate) {
    try {
      const response = await this.fetchWithRetry(`/devices/${deviceId}/rewards`, {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });

      return response.data.map(reward => ({
        date: new Date(reward.date),
        dataPointsContributed: reward.data_points,
        qualityScore: reward.quality_score,
        tokensEarned: parseFloat(reward.tokens_earned),
        tokensClaimed: parseFloat(reward.tokens_claimed || 0),
        claimTransactionHash: reward.claim_tx_hash
      }));
    } catch (error) {
      console.error(`Failed to get rewards for device ${deviceId}:`, error);
      throw new Error(`Reward data unavailable for device ${deviceId}`);
    }
  }

  /**
   * Subscribe to real-time weather alerts
   */
  async subscribeToAlerts(deviceIds, alertTypes = ['severe_weather', 'data_quality', 'device_offline']) {
    try {
      const response = await this.fetchWithRetry('/alerts/subscribe', {
        method: 'POST',
        data: {
          device_ids: deviceIds,
          alert_types: alertTypes,
          webhook_url: `${process.env.BASE_URL}/webhooks/weatherxm-alerts`
        }
      });

      console.log(`Subscribed to alerts for ${deviceIds.length} devices`);
      return response.data;
    } catch (error) {
      console.error('Failed to subscribe to alerts:', error);
      throw new Error('Alert subscription failed');
    }
  }

  /**
   * Validate weather data quality
   */
  validateWeatherData(data) {
    const validationRules = {
      temperature: { min: -50, max: 60, unit: 'celsius' },
      humidity: { min: 0, max: 100, unit: 'percent' },
      windSpeed: { min: 0, max: 200, unit: 'm/s' },
      windDirection: { min: 0, max: 360, unit: 'degrees' },
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

    // Check for suspicious patterns
    if (data.temperature && data.humidity) {
      const dewPoint = this.calculateDewPoint(data.temperature, data.humidity);
      if (dewPoint > data.temperature) {
        warnings.push('Dew point higher than temperature - possible sensor error');
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
      timestamp: new Date(rawData.timestamp),
      temperature: rawData.temperature,
      humidity: rawData.humidity,
      windSpeed: rawData.wind_speed,
      windDirection: rawData.wind_direction,
      windGusts: rawData.wind_gusts,
      pressure: rawData.pressure,
      precipitation: rawData.precipitation,
      solarRadiation: rawData.solar_radiation,
      uvIndex: rawData.uv_index,
      visibility: rawData.visibility,
      cloudCover: rawData.cloud_cover
    };

    // Validate and add quality metrics
    const validation = this.validateWeatherData(normalized);
    normalized.dataQuality = validation;
    normalized.qualityScore = validation.qualityScore;

    return normalized;
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
   * Determine if error is retryable
   */
  isRetryableError(error) {
    if (!error.response) {
      return true; // Network errors are retryable
    }

    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors and rate limiting
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * Handle request errors
   */
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

  clearCache() {
    this.dataCache.clear();
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

  calculateDewPoint(temperature, humidity) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}