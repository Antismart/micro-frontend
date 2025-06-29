/**
 * Weather API Routes
 * Handles weather data endpoints for the frontend
 */

import express from 'express';
import { WeatherService } from '../services/WeatherService.js';

const router = express.Router();
const weatherService = new WeatherService();

// Get weather history for a device
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 7 } = req.query;
    
    console.log(`📊 Fetching weather data for device ${deviceId} (${days} days)`);
    
    const weatherData = await weatherService.getWeatherHistory(deviceId, parseInt(days));
    
    res.json({ 
      success: true,
      weatherData,
      deviceId,
      days: parseInt(days),
      dataPoints: weatherData.length
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      deviceId: req.params.deviceId
    });
  }
});

// Get current weather for a device
router.get('/:deviceId/current', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const currentWeather = await weatherService.getCurrentWeather(deviceId);
    
    res.json({
      success: true,
      weather: currentWeather,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Current weather fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Find nearby weather devices
router.get('/devices/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    console.log(`🔍 Finding devices near ${lat}, ${lng} within ${radius}km`);
    
    const devices = await weatherService.getNearbyDevices(
      parseFloat(lat), 
      parseFloat(lng), 
      parseFloat(radius)
    );
    
    res.json({ 
      success: true,
      devices,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: parseFloat(radius),
      count: devices.length
    });
  } catch (error) {
    console.error('Device search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Analyze weather conditions for a location
router.post('/analyze', async (req, res) => {
  try {
    const { deviceId, cropType, thresholds, days = 7 } = req.body;
    
    if (!deviceId || !cropType || !thresholds) {
      return res.status(400).json({
        success: false,
        error: 'deviceId, cropType, and thresholds are required'
      });
    }
    
    // Get weather data
    const weatherData = await weatherService.getWeatherHistory(deviceId, days);
    
    // Analyze conditions
    const analysis = weatherService.analyzeWeatherConditions(weatherData, cropType, thresholds);
    
    res.json({
      success: true,
      analysis,
      deviceId,
      cropType,
      dataPoints: weatherData.length,
      analyzedPeriod: `${days} days`
    });
  } catch (error) {
    console.error('Weather analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get WeatherXM service health status
router.get('/health/status', async (req, res) => {
  try {
    const healthStatus = weatherService.getHealthStatus();
    
    res.json({
      success: true,
      health: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Sync weather data for all devices
router.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Manual weather data sync triggered');
    
    const syncResult = await weatherService.syncAllDeviceData();
    
    res.json({
      success: true,
      syncResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather sync error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;