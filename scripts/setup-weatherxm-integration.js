/**
 * WeatherXM Integration Setup Script
 * Automates the setup process for WeatherXM integration
 */

import fs from 'fs';
import path from 'path';
import { WeatherXMIntegrationService } from '../backend/services/WeatherXMIntegrationService.js';

async function setupWeatherXMIntegration() {
  console.log('🌤️ Setting up WeatherXM Integration...\n');

  try {
    // Step 1: Validate environment variables
    console.log('1. Validating environment configuration...');
    validateEnvironment();
    console.log('✅ Environment configuration valid\n');

    // Step 2: Test API connectivity
    console.log('2. Testing WeatherXM API connectivity...');
    await testAPIConnectivity();
    console.log('✅ API connectivity successful\n');

    // Step 3: Setup database schema
    console.log('3. Setting up database schema...');
    await setupDatabaseSchema();
    console.log('✅ Database schema created\n');

    // Step 4: Configure webhooks
    console.log('4. Configuring webhook endpoints...');
    await configureWebhooks();
    console.log('✅ Webhooks configured\n');

    // Step 5: Initialize data sync
    console.log('5. Initializing data synchronization...');
    await initializeDataSync();
    console.log('✅ Data sync initialized\n');

    // Step 6: Setup monitoring
    console.log('6. Setting up monitoring and alerts...');
    await setupMonitoring();
    console.log('✅ Monitoring configured\n');

    console.log('🎉 WeatherXM integration setup completed successfully!');
    console.log('\nNext steps:');
    console.log('- Review the integration dashboard');
    console.log('- Test weather data retrieval');
    console.log('- Configure policy triggers');
    console.log('- Monitor system health');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

function validateEnvironment() {
  const requiredVars = [
    'WEATHERXM_API_KEY',
    'WEATHERXM_API_URL',
    'WEATHERXM_WEBHOOK_SECRET',
    'DATABASE_URL',
    'BASE_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate API key format
  if (!process.env.WEATHERXM_API_KEY.startsWith('wxm_')) {
    console.warn('⚠️ WeatherXM API key format may be incorrect');
  }

  // Validate webhook secret
  if (process.env.WEATHERXM_WEBHOOK_SECRET.length < 32) {
    console.warn('⚠️ Webhook secret should be at least 32 characters long');
  }
}

async function testAPIConnectivity() {
  const weatherService = new WeatherXMIntegrationService();
  
  try {
    // Test basic connectivity
    const healthStatus = weatherService.getHealthStatus();
    console.log(`   API client initialized (uptime: ${healthStatus.uptime}s)`);

    // Test device discovery
    const devices = await weatherService.getNearbyDevices(40.7128, -74.0060, 100);
    console.log(`   Found ${devices.length} nearby weather devices`);

    // Test data retrieval if devices available
    if (devices.length > 0) {
      const testDevice = devices[0];
      const currentWeather = await weatherService.getCurrentWeather(testDevice.deviceId);
      console.log(`   Retrieved weather data from device ${testDevice.deviceId}`);
      console.log(`   Temperature: ${currentWeather.temperature}°C, Quality: ${currentWeather.qualityScore}%`);
    }

  } catch (error) {
    throw new Error(`API connectivity test failed: ${error.message}`);
  }
}

async function setupDatabaseSchema() {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Read and execute schema file
    const schemaPath = path.join(process.cwd(), 'backend/database/weatherDataSchema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('   Database schema executed successfully');

    // Create initial partitions for current and next month
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 7);
    
    await createMonthlyPartition(pool, currentMonth);
    await createMonthlyPartition(pool, nextMonth);
    
    console.log(`   Created partitions for ${currentMonth} and ${nextMonth}`);

  } catch (error) {
    throw new Error(`Database setup failed: ${error.message}`);
  } finally {
    await pool.end();
  }
}

async function createMonthlyPartition(pool, monthString) {
  const [year, month] = monthString.split('-');
  const startDate = `${year}-${month}-01`;
  const nextMonth = new Date(parseInt(year), parseInt(month), 1);
  const endDate = nextMonth.toISOString().slice(0, 10);
  
  const partitionName = `weather_readings_${year}_${month}`;
  
  const query = `
    CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF weather_readings
    FOR VALUES FROM ('${startDate}') TO ('${endDate}')
  `;
  
  await pool.query(query);
}

async function configureWebhooks() {
  const weatherService = new WeatherXMIntegrationService();
  const baseUrl = process.env.BASE_URL;
  
  if (!baseUrl) {
    throw new Error('BASE_URL environment variable required for webhook configuration');
  }

  try {
    // Subscribe to weather alerts for all available devices
    const devices = await weatherService.getNearbyDevices(40.7128, -74.0060, 1000); // Large radius
    const deviceIds = devices.map(d => d.deviceId);
    
    if (deviceIds.length > 0) {
      await weatherService.subscribeToAlerts(deviceIds, [
        'severe_weather',
        'temperature_extreme',
        'precipitation_extreme',
        'wind_extreme',
        'data_quality',
        'device_offline'
      ]);
      
      console.log(`   Subscribed to alerts for ${deviceIds.length} devices`);
    }

    // Create webhook configuration file
    const webhookConfig = {
      endpoints: {
        alerts: `${baseUrl}/webhooks/weatherxm-alerts`,
        devices: `${baseUrl}/webhooks/weatherxm-devices`,
        quality: `${baseUrl}/webhooks/weatherxm-quality`
      },
      secret: process.env.WEATHERXM_WEBHOOK_SECRET,
      subscribedDevices: deviceIds,
      configuredAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'webhook-config.json'),
      JSON.stringify(webhookConfig, null, 2)
    );

  } catch (error) {
    throw new Error(`Webhook configuration failed: ${error.message}`);
  }
}

async function initializeDataSync() {
  const weatherService = new WeatherXMIntegrationService();
  
  try {
    // Find all available devices
    const devices = await weatherService.getNearbyDevices(40.7128, -74.0060, 1000);
    console.log(`   Found ${devices.length} devices for data sync`);

    // Initialize historical data sync for each device
    const syncPromises = devices.slice(0, 10).map(async (device) => { // Limit to first 10 devices
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        
        const historicalData = await weatherService.getHistoricalWeather(
          device.deviceId,
          startDate,
          endDate,
          'hourly'
        );
        
        console.log(`   Synced ${historicalData.length} records for device ${device.deviceId}`);
        return { deviceId: device.deviceId, records: historicalData.length };
      } catch (error) {
        console.warn(`   Failed to sync device ${device.deviceId}: ${error.message}`);
        return { deviceId: device.deviceId, error: error.message };
      }
    });

    const syncResults = await Promise.all(syncPromises);
    const successful = syncResults.filter(r => !r.error);
    const failed = syncResults.filter(r => r.error);

    console.log(`   Successfully synced ${successful.length} devices`);
    if (failed.length > 0) {
      console.warn(`   Failed to sync ${failed.length} devices`);
    }

    // Save sync status
    const syncStatus = {
      totalDevices: devices.length,
      syncedDevices: successful.length,
      failedDevices: failed.length,
      syncResults,
      lastSync: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'sync-status.json'),
      JSON.stringify(syncStatus, null, 2)
    );

  } catch (error) {
    throw new Error(`Data sync initialization failed: ${error.message}`);
  }
}

async function setupMonitoring() {
  // Create monitoring configuration
  const monitoringConfig = {
    healthChecks: {
      apiConnectivity: {
        endpoint: '/health/weatherxm-api',
        interval: 60000, // 1 minute
        timeout: 30000,
        retries: 3
      },
      dataQuality: {
        endpoint: '/health/data-quality',
        interval: 300000, // 5 minutes
        thresholds: {
          minQualityScore: 80,
          maxDataAge: 900000 // 15 minutes
        }
      },
      webhookDelivery: {
        endpoint: '/health/webhooks',
        interval: 300000, // 5 minutes
        maxFailureRate: 0.05 // 5%
      }
    },
    alerts: {
      email: process.env.ALERT_EMAIL || 'admin@microcrop.insurance',
      slack: process.env.SLACK_WEBHOOK_URL,
      thresholds: {
        errorRate: 0.05,
        responseTime: 5000,
        consecutiveFailures: 5
      }
    },
    metrics: {
      retention: '30d',
      aggregation: 'hourly',
      dashboardUrl: `${process.env.BASE_URL}/dashboard/weatherxm`
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'monitoring-config.json'),
    JSON.stringify(monitoringConfig, null, 2)
  );

  console.log('   Monitoring configuration saved');
  console.log(`   Dashboard will be available at: ${monitoringConfig.metrics.dashboardUrl}`);
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupWeatherXMIntegration();
}

export { setupWeatherXMIntegration };