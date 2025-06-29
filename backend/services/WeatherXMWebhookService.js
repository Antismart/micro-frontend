/**
 * WeatherXM Webhook Service
 * Handles incoming webhook notifications from WeatherXM
 */

import crypto from 'crypto';
import express from 'express';

export class WeatherXMWebhookService {
  constructor(policyService, payoutService) {
    this.policyService = policyService;
    this.payoutService = payoutService;
    this.webhookSecret = process.env.WEATHERXM_WEBHOOK_SECRET;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Weather alerts webhook
    this.router.post('/weatherxm-alerts', this.handleWeatherAlerts.bind(this));
    
    // Device status updates
    this.router.post('/weatherxm-devices', this.handleDeviceUpdates.bind(this));
    
    // Data quality notifications
    this.router.post('/weatherxm-quality', this.handleDataQuality.bind(this));
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Handle weather alerts
   */
  async handleWeatherAlerts(req, res) {
    try {
      const signature = req.headers['x-weatherxm-signature'];
      const payload = JSON.stringify(req.body);
      
      if (!this.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const alert = req.body;
      console.log('Received weather alert:', alert);

      // Process different alert types
      switch (alert.type) {
        case 'severe_weather':
          await this.processSevereWeatherAlert(alert);
          break;
        case 'temperature_extreme':
          await this.processTemperatureAlert(alert);
          break;
        case 'precipitation_extreme':
          await this.processPrecipitationAlert(alert);
          break;
        case 'wind_extreme':
          await this.processWindAlert(alert);
          break;
      }

      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }

  /**
   * Process severe weather alerts
   */
  async processSevereWeatherAlert(alert) {
    const affectedPolicies = await this.findAffectedPolicies(
      alert.device_id,
      alert.location
    );

    for (const policy of affectedPolicies) {
      await this.evaluateClaimConditions(policy, alert);
    }
  }

  /**
   * Find policies affected by weather event
   */
  async findAffectedPolicies(deviceId, location) {
    // Implementation would query database for policies
    // within the affected area
    return [];
  }

  /**
   * Evaluate if weather conditions trigger a claim
   */
  async evaluateClaimConditions(policy, alert) {
    const triggers = this.checkPolicyTriggers(policy, alert);
    
    if (triggers.length > 0) {
      await this.payoutService.processPayout(policy, triggers[0], alert);
    }
  }

  checkPolicyTriggers(policy, alert) {
    const triggers = [];
    
    // Check temperature triggers
    if (alert.data.temperature) {
      if (alert.data.temperature > policy.cropType.maxTemperature) {
        triggers.push({
          type: 'excessive_heat',
          severity: this.calculateSeverity(
            alert.data.temperature,
            policy.cropType.maxTemperature
          ),
          value: alert.data.temperature,
          threshold: policy.cropType.maxTemperature
        });
      }
    }
    
    // Check precipitation triggers
    if (alert.data.precipitation) {
      if (alert.data.precipitation > policy.cropType.maxDailyRainfall) {
        triggers.push({
          type: 'flooding',
          severity: this.calculateSeverity(
            alert.data.precipitation,
            policy.cropType.maxDailyRainfall
          ),
          value: alert.data.precipitation,
          threshold: policy.cropType.maxDailyRainfall
        });
      }
    }
    
    return triggers;
  }

  calculateSeverity(value, threshold) {
    const ratio = value / threshold;
    if (ratio > 2.0) return 'severe';
    if (ratio > 1.5) return 'moderate';
    return 'mild';
  }

  getRouter() {
    return this.router;
  }
}