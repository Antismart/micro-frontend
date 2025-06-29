export interface WeatherData {
  deviceId: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface CropType {
  id: string;
  name: string;
  minRainfall: number; // mm per month
  maxTemperature: number; // celsius
  premiumRate: number; // percentage of coverage
  icon: string;
}

export interface InsurancePolicy {
  id: string;
  asaId: number;
  farmerId: string;
  cropType: CropType;
  coverageAmount: number; // in Algos
  premiumPaid: number; // in Algos
  startDate: Date;
  endDate: Date;
  location: {
    lat: number;
    lng: number;
    deviceId: string;
  };
  status: 'active' | 'expired' | 'claimed' | 'cancelled';
  claimHistory: ClaimRecord[];
}

export interface ClaimRecord {
  id: string;
  policyId: string;
  claimDate: Date;
  triggerType: 'drought' | 'excessive_heat' | 'flooding';
  weatherReading: WeatherData;
  payoutAmount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
}

export interface Farmer {
  id: string;
  walletAddress: string;
  name: string;
  farmLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  policies: InsurancePolicy[];
  totalCoverage: number;
  totalClaims: number;
  registrationDate: Date;
}

export interface AlgorandAccount {
  address: string;
  balance: number;
  assets: AlgorandAsset[];
}

export interface AlgorandAsset {
  assetId: number;
  amount: number;
  decimals: number;
  name: string;
  unitName: string;
}

export interface ContractState {
  globalState: {
    totalPolicies: number;
    totalClaims: number;
    totalPayouts: number;
    oracleAddress: string;
  };
  localState: {
    [address: string]: {
      activePolicies: number;
      totalCoverage: number;
    };
  };
}