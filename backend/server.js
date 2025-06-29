/**
 * MicroCrop Insurance Backend Oracle Service
 * Handles WeatherXM integration and automatic payout triggers
 */

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { AlgorandService } from './services/AlgorandService.js';
import { WeatherService } from './services/WeatherService.js';
import { PolicyService } from './services/PolicyService.js';
import { PayoutService } from './services/PayoutService.js';
import weatherRoutes from './routes/weather.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Services initialization
const algorandService = new AlgorandService();
const weatherService = new WeatherService();
const policyService = new PolicyService();
const payoutService = new PayoutService(algorandService, weatherService);

// Routes
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      algorand: 'connected',
      weatherxm: 'connected'
    }
  });
});

// WeatherXM health check
app.get('/api/health/weatherxm', async (req, res) => {
  try {
    const healthStatus = weatherService.getHealthStatus();
    res.json({
      success: true,
      health: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Policy management endpoints
app.post('/api/policies', async (req, res) => {
  try {
    const { farmerId, cropType, coverageAmount, location, duration } = req.body;
    
    const policy = await policyService.createPolicy({
      farmerId,
      cropType,
      coverageAmount,
      location,
      duration
    });
    
    res.json({ success: true, policy });
  } catch (error) {
    console.error('Policy creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/policies/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const policies = await policyService.getFarmerPolicies(farmerId);
    res.json({ policies });
  } catch (error) {
    console.error('Policy fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payout endpoints
app.get('/api/payouts/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;
    const payouts = await payoutService.getPayoutHistory(policyId);
    res.json({ payouts });
  } catch (error) {
    console.error('Payout fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual payout trigger (for testing)
app.post('/api/payouts/trigger', async (req, res) => {
  try {
    const { policyId, reason } = req.body;
    const result = await payoutService.triggerManualPayout(policyId, reason);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Manual payout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Algorand network status
app.get('/api/algorand/status', async (req, res) => {
  try {
    const status = await algorandService.getNetworkStatus();
    res.json(status);
  } catch (error) {
    console.error('Algorand status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Contract state
app.get('/api/contract/state', async (req, res) => {
  try {
    const state = await algorandService.getContractState();
    res.json(state);
  } catch (error) {
    console.error('Contract state error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Automated payout checking - runs every hour
cron.schedule('0 * * * *', async () => {
  console.log('🔍 Running automated payout check...');
  
  try {
    const activePolicies = await policyService.getActivePolicies();
    console.log(`Found ${activePolicies.length} active policies to check`);
    
    for (const policy of activePolicies) {
      await payoutService.checkPayoutConditions(policy);
    }
    
    console.log('✅ Automated payout check completed');
  } catch (error) {
    console.error('❌ Automated payout check failed:', error);
  }
});

// Weather data sync - runs every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('🌤️ Syncing weather data...');
  
  try {
    await weatherService.syncAllDeviceData();
    console.log('✅ Weather data sync completed');
  } catch (error) {
    console.error('❌ Weather data sync failed:', error);
  }
});

// WeatherXM health monitoring - runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const healthStatus = weatherService.getHealthStatus();
    if (!healthStatus.isHealthy) {
      console.warn('⚠️ WeatherXM service health check failed:', healthStatus);
    }
  } catch (error) {
    console.error('❌ WeatherXM health check failed:', error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MicroCrop Insurance Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌤️ WeatherXM API Key: ${process.env.WEATHERXM_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`📡 Weather endpoints: http://localhost:${PORT}/api/weather/*`);
});

export default app;