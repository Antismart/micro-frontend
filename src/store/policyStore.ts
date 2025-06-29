/**
 * Policy Store - Global state management for insurance policies
 */

import { create } from 'zustand';
import { InsurancePolicy, CropType, Farmer } from '../../types';

interface PolicyState {
  // State
  policies: InsurancePolicy[];
  activePolicies: InsurancePolicy[];
  farmer: Farmer | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setPolicies: (policies: InsurancePolicy[]) => void;
  addPolicy: (policy: InsurancePolicy) => void;
  updatePolicy: (policyId: string, updates: Partial<InsurancePolicy>) => void;
  setFarmer: (farmer: Farmer) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Computed getters
  getTotalCoverage: () => number;
  getActivePolicies: () => InsurancePolicy[];
  getPolicyById: (id: string) => InsurancePolicy | undefined;
}

export const usePolicyStore = create<PolicyState>((set, get) => ({
  // Initial state
  policies: [],
  activePolicies: [],
  farmer: null,
  loading: false,
  error: null,

  // Actions
  setPolicies: (policies) => set((state) => ({
    ...state,
    policies,
    activePolicies: policies.filter(p => p.status === 'active')
  })),

  addPolicy: (policy) => set((state) => ({
    ...state,
    policies: [...state.policies, policy],
    activePolicies: policy.status === 'active' 
      ? [...state.activePolicies, policy]
      : state.activePolicies
  })),

  updatePolicy: (policyId, updates) => set((state) => ({
    ...state,
    policies: state.policies.map(p => 
      p.id === policyId ? { ...p, ...updates } : p
    ),
    activePolicies: state.activePolicies.map(p => 
      p.id === policyId ? { ...p, ...updates } : p
    ).filter(p => p.status === 'active')
  })),

  setFarmer: (farmer) => set({ farmer }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Computed getters
  getTotalCoverage: () => {
    const { activePolicies } = get();
    return activePolicies.reduce((total, policy) => total + policy.coverageAmount, 0);
  },

  getActivePolicies: () => {
    const { policies } = get();
    return policies.filter(p => p.status === 'active');
  },

  getPolicyById: (id) => {
    const { policies } = get();
    return policies.find(p => p.id === id);
  }
}));