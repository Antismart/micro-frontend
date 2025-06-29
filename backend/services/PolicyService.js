/**
 * Policy Management Service
 * Handles insurance policy lifecycle and data management
 */

export class PolicyService {
  constructor() {
    // In a production environment, this would connect to postgres, Supabase, etc.
    this.policies = new Map();
    this.farmers = new Map();
    
    // Crop type definitions with insurance parameters
    this.cropTypes = {
      'maize': {
        id: 'maize',
        name: 'Maize/Corn',
        minRainfall: 300, // mm per month
        maxTemperature: 35, // celsius
        maxDailyRainfall: 50, // mm per day
        premiumRate: 0.08, // 8% of coverage
        icon: '🌽'
      },
      'rice': {
        id: 'rice',
        name: 'Rice',
        minRainfall: 400,
        maxTemperature: 38,
        maxDailyRainfall: 80,
        premiumRate: 0.10,
        icon: '🌾'
      },
      'wheat': {
        id: 'wheat',
        name: 'Wheat',
        minRainfall: 200,
        maxTemperature: 32,
        maxDailyRainfall: 40,
        premiumRate: 0.06,
        icon: '🌾'
      },
      'cotton': {
        id: 'cotton',
        name: 'Cotton',
        minRainfall: 250,
        maxTemperature: 40,
        maxDailyRainfall: 45,
        premiumRate: 0.12,
        icon: '🌱'
      }
    };
  }

  /**
   * Create a new insurance policy
   */
  async createPolicy(params) {
    const { farmerId, cropType, coverageAmount, location, duration } = params;
    
    // Validate crop type
    if (!this.cropTypes[cropType]) {
      throw new Error(`Invalid crop type: ${cropType}`);
    }

    const crop = this.cropTypes[cropType];
    const policyId = this.generatePolicyId();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));
    const premiumAmount = Math.floor(coverageAmount * crop.premiumRate);

    const policy = {
      id: policyId,
      asaId: null, // Will be set after ASA creation
      farmerId,
      cropType: crop,
      coverageAmount,
      premiumPaid: premiumAmount,
      startDate,
      endDate,
      location,
      status: 'active',
      claimHistory: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    this.policies.set(policyId, policy);
    
    // Update farmer's policies
    if (!this.farmers.has(farmerId)) {
      this.farmers.set(farmerId, {
        id: farmerId,
        policies: [],
        totalCoverage: 0,
        totalClaims: 0
      });
    }
    
    const farmer = this.farmers.get(farmerId);
    farmer.policies.push(policyId);
    farmer.totalCoverage += coverageAmount;

    console.log(`✅ Created policy ${policyId} for farmer ${farmerId}`);
    return policy;
  }

  /**
   * Get all policies for a farmer
   */
  async getFarmerPolicies(farmerId) {
    const farmer = this.farmers.get(farmerId);
    if (!farmer) {
      return [];
    }

    return farmer.policies.map(policyId => this.policies.get(policyId));
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicy(policyId) {
    return this.policies.get(policyId);
  }

  /**
   * Get all active policies
   */
  async getActivePolicies() {
    const now = new Date();
    return Array.from(this.policies.values()).filter(policy => 
      policy.status === 'active' && 
      policy.endDate > now
    );
  }

  /**
   * Update policy status
   */
  async updatePolicyStatus(policyId, status) {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.status = status;
    policy.lastUpdated = new Date();
    
    console.log(`📝 Updated policy ${policyId} status to ${status}`);
    return policy;
  }

  /**
   * Add claim record to policy
   */
  async addClaimRecord(policyId, claimData) {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const claim = {
      id: this.generateClaimId(),
      policyId,
      claimDate: new Date(),
      ...claimData
    };

    policy.claimHistory.push(claim);
    policy.lastUpdated = new Date();

    // Update farmer's total claims
    const farmer = this.farmers.get(policy.farmerId);
    if (farmer && claim.status === 'paid') {
      farmer.totalClaims += claim.payoutAmount;
    }

    console.log(`💰 Added claim ${claim.id} to policy ${policyId}`);
    return claim;
  }

  /**
   * Get policy statistics
   */
  async getPolicyStats() {
    const policies = Array.from(this.policies.values());
    const activePolicies = policies.filter(p => p.status === 'active');
    const totalCoverage = policies.reduce((sum, p) => sum + p.coverageAmount, 0);
    const totalClaims = policies.reduce((sum, p) => 
      sum + p.claimHistory.filter(c => c.status === 'paid').length, 0
    );
    const totalPayouts = policies.reduce((sum, p) => 
      sum + p.claimHistory
        .filter(c => c.status === 'paid')
        .reduce((claimSum, c) => claimSum + c.payoutAmount, 0), 0
    );

    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalCoverage,
      totalClaims,
      totalPayouts,
      averageCoverage: policies.length > 0 ? totalCoverage / policies.length : 0,
      claimRate: policies.length > 0 ? totalClaims / policies.length : 0
    };
  }

  /**
   * Get available crop types
   */
  getCropTypes() {
    return Object.values(this.cropTypes);
  }

  /**
   * Get crop type by ID
   */
  getCropType(cropId) {
    return this.cropTypes[cropId];
  }

  /**
   * Generate unique policy ID
   */
  generatePolicyId() {
    return `POL_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate unique claim ID
   */
  generateClaimId() {
    return `CLM_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Check if policy is expired
   */
  isPolicyExpired(policy) {
    return new Date() > policy.endDate;
  }

  /**
   * Check if policy is eligible for claims
   */
  isPolicyEligible(policy) {
    const now = new Date();
    return policy.status === 'active' && 
           now >= policy.startDate && 
           now <= policy.endDate;
  }
}