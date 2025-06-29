/**
 * Dashboard Statistics Component
 */

import React from 'react';
import { Shield, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { usePolicyStore } from '../../store/policyStore';

export const DashboardStats: React.FC = () => {
  const { policies, getTotalCoverage } = usePolicyStore();

  const activePolicies = policies.filter(p => p.status === 'active');
  const totalClaims = policies.reduce((sum, p) => sum + p.claimHistory.length, 0);
  const totalPayouts = policies.reduce((sum, p) => 
    sum + p.claimHistory
      .filter(c => c.status === 'paid')
      .reduce((claimSum, c) => claimSum + c.payoutAmount, 0), 0
  );

  const stats = [
    {
      label: 'Active Policies',
      value: activePolicies.length,
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Total Coverage',
      value: `${getTotalCoverage().toLocaleString()} ALGO`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Claims Filed',
      value: totalClaims,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      label: 'Total Payouts',
      value: `${totalPayouts.toLocaleString()} ALGO`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};