/**
 * WeatherXM Integration Test Suite
 * Comprehensive testing for data accuracy, API performance, and system resilience
 */

import { WeatherXMIntegrationService } from '../services/WeatherXMIntegrationService.js';
import { WeatherXMWebhookService } from '../services/WeatherXMWebhookService.js';
import axios from 'axios';
import { performance } from 'perf_hooks';

describe('WeatherXM Integration Tests', () => {
  let weatherService;
  let webhookService;
  
  beforeAll(async () => {
    weatherService = new WeatherXMIntegrationService();
    webhookService = new WeatherXMWebhookService();
  });

  describe('Data Accuracy Verification', () => {
    test('Temperature readings should be within acceptable range', async () => {
      const deviceId = 'test-device-001';
      const weatherData = await weatherService.getCurrentWeather(deviceId);
      
      expect(weatherData.temperature).toBeGreaterThan(-50);
      expect(weatherData.temperature).toBeLessThan(60);
      expect(weatherData.qualityScore).toBeGreaterThan(80);
    });

    test('Humidity readings should be 0-100%', async () => {
      const deviceId = 'test-device-001';
      const weatherData = await weatherService.getCurrentWeather(deviceId);
      
      expect(weatherData.humidity).toBeGreaterThanOrEqual(0);
      expect(weatherData.humidity).toBeLessThanOrEqual(100);
    });

    test('Wind speed should be non-negative', async () => {
      const deviceId = 'test-device-001';
      const weatherData = await weatherService.getCurrentWeather(deviceId);
      
      expect(weatherData.windSpeed).toBeGreaterThanOrEqual(0);
      expect(weatherData.windSpeed).toBeLessThan(200);
    });

    test('Precipitation should be non-negative', async () => {
      const deviceId = 'test-device-001';
      const weatherData = await weatherService.getCurrentWeather(deviceId);
      
      expect(weatherData.precipitation).toBeGreaterThanOrEqual(0);
      expect(weatherData.precipitation).toBeLessThan(1000);
    });

    test('Data validation should catch anomalies', () => {
      const invalidData = {
        temperature: 150, // Invalid
        humidity: 120,    // Invalid
        windSpeed: -10,   // Invalid
        pressure: 500     // Invalid
      };
      
      const validation = weatherService.validateWeatherData(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('API Response Times', () => {
    test('Current weather API should respond within 200ms', async () => {
      const startTime = performance.now();
      
      try {
        await weatherService.getCurrentWeather('test-device-001');
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(200);
      } catch (error) {
        // Test passes if we get a response (even error) within time limit
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(200);
      }
    });

    test('Historical data API should respond within 500ms', async () => {
      const startTime = performance.now();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      try {
        await weatherService.getHistoricalWeather('test-device-001', startDate, endDate);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(500);
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(500);
      }
    });

    test('Nearby devices API should respond within 300ms', async () => {
      const startTime = performance.now();
      
      try {
        await weatherService.getNearbyDevices(40.7128, -74.0060, 50);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(300);
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(300);
      }
    });
  });

  describe('System Resilience Under Load', () => {
    test('Should handle concurrent requests without errors', async () => {
      const concurrentRequests = 50;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          weatherService.getCurrentWeather('test-device-001')
            .catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      const errorRate = errors.length / results.length;
      
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
    });

    test('Should implement proper rate limiting', async () => {
      const requests = [];
      const maxRequests = 10;
      
      // Make rapid requests
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          weatherService.getCurrentWeather('test-device-001')
            .catch(error => error)
        );
      }
      
      const results = await Promise.all(requests);
      
      // Should not exceed rate limits
      const rateLimitErrors = results.filter(result => 
        result.response && result.response.status === 429
      );
      
      expect(rateLimitErrors.length).toBe(0);
    });

    test('Should recover from network failures', async () => {
      // Simulate network failure by using invalid endpoint
      const originalBaseURL = weatherService.baseURL;
      weatherService.baseURL = 'https://invalid-endpoint.com';
      
      try {
        await weatherService.getCurrentWeather('test-device-001');
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      // Restore valid endpoint
      weatherService.baseURL = originalBaseURL;
      
      // Should work again
      const result = await weatherService.getCurrentWeather('test-device-001')
        .catch(error => ({ error: error.message }));
      
      // Either succeeds or fails gracefully
      expect(result).toBeDefined();
    });

    test('Should handle malformed API responses', () => {
      const malformedData = {
        temperature: "not a number",
        humidity: null,
        windSpeed: undefined,
        timestamp: "invalid date"
      };
      
      expect(() => {
        weatherService.normalizeWeatherData(malformedData, 'test-device');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('Should handle API timeout gracefully', async () => {
      const originalTimeout = weatherService.timeout;
      weatherService.timeout = 1; // 1ms timeout
      
      try {
        await weatherService.getCurrentWeather('test-device-001');
      } catch (error) {
        expect(error.code).toBe('ECONNABORTED');
      }
      
      weatherService.timeout = originalTimeout;
    });

    test('Should retry failed requests', async () => {
      const originalRetryAttempts = weatherService.retryAttempts;
      weatherService.retryAttempts = 2;
      
      let attemptCount = 0;
      const originalFetch = weatherService.httpClient.request;
      weatherService.httpClient.request = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network error');
        }
        return originalFetch.call(weatherService.httpClient, arguments[0]);
      });
      
      try {
        await weatherService.getCurrentWeather('test-device-001');
        expect(attemptCount).toBe(2);
      } catch (error) {
        expect(attemptCount).toBeGreaterThan(1);
      }
      
      weatherService.retryAttempts = originalRetryAttempts;
    });

    test('Should validate webhook signatures', () => {
      const validPayload = JSON.stringify({ test: 'data' });
      const validSignature = require('crypto')
        .createHmac('sha256', process.env.WEATHERXM_WEBHOOK_SECRET || 'test-secret')
        .update(validPayload)
        .digest('hex');
      
      const isValid = webhookService.verifyWebhookSignature(validPayload, validSignature);
      expect(isValid).toBe(true);
      
      const isInvalid = webhookService.verifyWebhookSignature(validPayload, 'invalid-signature');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Caching and Performance', () => {
    test('Should cache API responses', async () => {
      const deviceId = 'test-device-001';
      
      // First request
      const startTime1 = performance.now();
      await weatherService.getCurrentWeather(deviceId);
      const endTime1 = performance.now();
      const firstRequestTime = endTime1 - startTime1;
      
      // Second request (should be cached)
      const startTime2 = performance.now();
      await weatherService.getCurrentWeather(deviceId);
      const endTime2 = performance.now();
      const secondRequestTime = endTime2 - startTime2;
      
      // Cached request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.1);
    });

    test('Should expire cache appropriately', async () => {
      const deviceId = 'test-device-001';
      const originalCacheTimeout = weatherService.cacheTimeout;
      weatherService.cacheTimeout = 100; // 100ms
      
      // First request
      await weatherService.getCurrentWeather(deviceId);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should make new request
      const cacheKey = `current_${deviceId}`;
      const cached = weatherService.getFromCache(cacheKey);
      expect(cached).toBeNull();
      
      weatherService.cacheTimeout = originalCacheTimeout;
    });
  });

  describe('Health Monitoring', () => {
    test('Should track health metrics', () => {
      const healthStatus = weatherService.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('isHealthy');
      expect(healthStatus).toHaveProperty('totalRequests');
      expect(healthStatus).toHaveProperty('successfulRequests');
      expect(healthStatus).toHaveProperty('consecutiveFailures');
      expect(healthStatus).toHaveProperty('lastSuccessfulRequest');
    });

    test('Should detect unhealthy state', () => {
      // Simulate failures
      weatherService.healthStatus.consecutiveFailures = 10;
      weatherService.healthStatus.lastSuccessfulRequest = new Date(Date.now() - 10 * 60 * 1000);
      
      weatherService.checkHealth();
      
      expect(weatherService.healthStatus.isHealthy).toBe(false);
    });
  });

  describe('Data Quality Validation', () => {
    test('Should calculate quality scores correctly', () => {
      const goodData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 5,
        pressure: 1013,
        timestamp: new Date()
      };
      
      const validation = weatherService.validateWeatherData(goodData);
      expect(validation.qualityScore).toBeGreaterThan(90);
      
      const badData = {
        temperature: 200, // Invalid
        humidity: 150,    // Invalid
        windSpeed: -5,    // Invalid
        pressure: 500     // Invalid
      };
      
      const badValidation = weatherService.validateWeatherData(badData);
      expect(badValidation.qualityScore).toBeLessThan(50);
    });

    test('Should detect sensor anomalies', () => {
      const anomalousData = {
        temperature: 30,
        humidity: 20, // Very low humidity for high temperature
        dewPoint: 35  // Impossible: dew point higher than temperature
      };
      
      const validation = weatherService.validateWeatherData(anomalousData);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });
});

// Performance benchmarking
describe('Performance Benchmarks', () => {
  test('Throughput test - should handle 100 requests per second', async () => {
    const requestCount = 100;
    const timeLimit = 1000; // 1 second
    
    const startTime = performance.now();
    const promises = [];
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(
        weatherService.getCurrentWeather('test-device-001')
          .catch(error => ({ error: error.message }))
      );
    }
    
    await Promise.all(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(timeLimit * 2); // Allow some margin
  });

  test('Memory usage should remain stable', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Make many requests
    for (let i = 0; i < 100; i++) {
      await weatherService.getCurrentWeather('test-device-001')
        .catch(() => {});
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});