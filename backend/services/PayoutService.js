/**
 * Payout Service - Handles insurance claim processing and automatic payouts
 */

import crypto from 'crypto';

export class PayoutService {
  constructor(algorandService, weatherService) {
    this.algorandService = algorandService;
    this.weatherService = weatherService;
    this.payoutHistory = new Map();
  }

  /**
   * Check payout conditions for a specific policy
   */
  async checkPayoutConditions(policy) {
    try {
      console.log(`🔍 Checking payout conditions for policy ${policy.id}`);

      // Skip if policy is not eligible
      if (!this.isPolicyEligible(policy)) {
        console.log(`⏭️ Policy ${policy.id} not eligible for claims`);
        return null;
      }

      // Get recent weather data
      const weatherData = await this.weatherService.getWeatherHistory(
        policy.location.deviceId, 
        7 // Last 7 days
      );

      if (!weatherData || weatherData.length === 0) {
        console.log(`⚠️ No weather data available for policy ${policy.id}`);
        return null;
      }

      // Analyze weather conditions
      const analysis = this.weatherService.analyzeWeatherConditions(
        weatherData,
        policy.cropType.id,
        {
          minMonthlyRainfall: policy.cropType.minRainfall,
          maxTemperature: policy.cropType.maxTemperature,
          maxDailyRainfall: policy.cropType.maxDailyRainfall
        }
      );

      // Check for payout triggers
      if (analysis.triggers.length > 0) {
        console.log(`🚨 Payout triggers found for policy ${policy.id}:`, analysis.triggers);
        
        for (const trigger of analysis.triggers) {
          await this.processPayout(policy, trigger, weatherData);
        }
      } else {
        console.log(`✅ No payout triggers for policy ${policy.id}`);
      }

      return analysis;
    } catch (error) {
      console.error(`❌ Error checking payout conditions for policy ${policy.id}:`, error);
      throw error;
    }
  }

  /**
   * Process an insurance payout
   */
  async processPayout(policy, trigger, weatherData) {
    try {
      // Calculate payout amount based on trigger severity
      const payoutAmount = this.calculatePayoutAmount(policy, trigger);
      
      if (payoutAmount <= 0) {
        console.log(`⏭️ No payout required for policy ${policy.id} (amount: ${payoutAmount})`);
        return null;
      }

      // Check if similar payout was already processed recently
      if (this.isDuplicatePayout(policy.id, trigger.type)) {
        console.log(`⏭️ Duplicate payout prevented for policy ${policy.id}`);
        return null;
      }

      // Create weather data hash for verification
      const weatherDataHash = this.createWeatherDataHash(weatherData);

      console.log(`💰 Processing payout of ${payoutAmount} Algos for policy ${policy.id}`);

      // Execute payout on blockchain
      const result = await this.algorandService.processPayout({
        policyHolderAddress: policy.farmerId,
        payoutAmount: payoutAmount * 1000000, // Convert to microAlgos
        weatherDataHash
      });

      // Record payout
      const payoutRecord = {
        id: this.generatePayoutId(),
        policyId: policy.id,
        triggerType: trigger.type,
        payoutAmount,
        weatherDataHash,
        transactionId: result.transactionId,
        timestamp: new Date(),
        status: 'completed'
      };

      this.payoutHistory.set(payoutRecord.id, payoutRecord);

      console.log(`✅ Payout processed successfully: ${payoutRecord.id}`);
      return payoutRecord;

    } catch (error) {
      console.error(`❌ Failed to process payout for policy ${policy.id}:`, error);
      
      // Record failed payout attempt
      const failedRecord = {
        id: this.generatePayoutId(),
        policyId: policy.id,
        triggerType: trigger.type,
        payoutAmount: 0,
        error: error.message,
        timestamp: new Date(),
        status: 'failed'
      };

      this.payoutHistory.set(failedRecord.id, failedRecord);
      throw error;
    }
  }

  /**
   * Calculate payout amount based on trigger severity
   */
  calculatePayoutAmount(policy, trigger) {
    const basePayout = policy.coverageAmount * 0.1; // 10% base payout
    
    let multiplier = 1;
    switch (trigger.severity) {
      case 'severe':
        multiplier = 2.0; // 20% of coverage
        break;
      case 'moderate':
        multiplier = 1.0; // 10% of coverage
        break;
      default:
        multiplier = 0.5; // 5% of coverage
    }

    // Additional multiplier based on trigger type
    switch (trigger.type) {
      case 'drought':
        multiplier *= 1.5; // Drought is typically more damaging
        break;
      case 'flooding':
        multiplier *= 1.3;
        break;
      case 'excessive_heat':
        multiplier *= 1.2;
        break;
    }

    const payoutAmount = Math.min(
      basePayout * multiplier,
      policy.coverageAmount * 0.5 // Max 50% of coverage per payout
    );

    return Math.floor(payoutAmount);
  }

  /**
   * Check if a similar payout was already processed recently
   */
  isDuplicatePayout(policyId, triggerType) {
    const recentPayouts = Array.from(this.payoutHistory.values()).filter(
      payout => 
        payout.policyId === policyId &&
        payout.triggerType === triggerType &&
        payout.status === 'completed' &&
        (Date.now() - payout.timestamp.getTime()) < (24 * 60 * 60 * 1000) // Within 24 hours
    );

    return recentPayouts.length > 0;
  }

  /**
   * Create hash of weather data for verification
   */
  createWeatherDataHash(weatherData) {
    const dataString = weatherData
      .map(d => `${d.timestamp}-${d.temperature}-${d.rainfall}`)
      .join('|');
    
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Trigger manual payout (for testing/admin purposes)
   */
  async triggerManualPayout(policyId, reason) {
    console.log(`🔧 Manual payout triggered for policy ${policyId}: ${reason}`);
    
    // This would fetch the policy and process a manual payout
    // Implementation depends on the specific use case
    
    return {
      message: 'Manual payout triggered',
      policyId,
      reason,
      timestamp: new Date()
    };
  }

  /**
   * Get payout history for a policy
   */
  async getPayoutHistory(policyId) {
    return Array.from(this.payoutHistory.values())
      .filter(payout => payout.policyId === policyId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all payout statistics
   */
  async getPayoutStats() {
    const payouts = Array.from(this.payoutHistory.values());
    const completedPayouts = payouts.filter(p => p.status === 'completed');
    
    return {
      totalPayouts: payouts.length,
      completedPayouts: completedPayouts.length,
      totalAmount: completedPayouts.reduce((sum, p) => sum + p.payoutAmount, 0),
      avgPayoutAmount: completedPayouts.length > 0 ? 
        completedPayouts.reduce((sum, p) => sum + p.payoutAmount, 0) / completedPayouts.length : 0,
      triggerBreakdown: this.getPayoutTriggerBreakdown(completedPayouts)
    };
  }

  /**
   * Get breakdown of payouts by trigger type
   */
  getPayoutTriggerBreakdown(payouts) {
    const breakdown = {};
    
    payouts.forEach(payout => {
      if (!breakdown[payout.triggerType]) {
        breakdown[payout.triggerType] = {
          count: 0,
          totalAmount: 0
        };
      }
      
      breakdown[payout.triggerType].count++;
      breakdown[payout.triggerType].totalAmount += payout.payoutAmount;
    });
    
    return breakdown;
  }

  /**
   * Check if policy is eligible for payouts
   */
  isPolicyEligible(policy) {
    const now = new Date();
    return policy.status === 'active' && 
           now >= policy.startDate && 
           now <= policy.endDate;
  }

  /**
   * Generate unique payout ID
   */
  generatePayoutId() {
    return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}