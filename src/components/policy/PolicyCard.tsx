/**
 * Policy Card Component
 */

import React from 'react';
import { Calendar, MapPin, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { InsurancePolicy } from '../../../types';
import { format } from 'date-fns';

interface PolicyCardProps {
  policy: InsurancePolicy;
  onViewDetails: (policy: InsurancePolicy) => void;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({ policy, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      case 'claimed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'expired': return AlertCircle;
      case 'claimed': return Shield;
      case 'cancelled': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(policy.status);
  const daysRemaining = Math.ceil((policy.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{policy.cropType.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{policy.cropType.name}</h3>
              <p className="text-sm text-gray-500">Policy #{policy.id.split('_')[1]}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
            <StatusIcon className="w-3 h-3" />
            <span className="capitalize">{policy.status}</span>
          </div>
        </div>

        {/* Policy details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>Coverage: <strong>{policy.coverageAmount.toLocaleString()} ALGO</strong></span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {format(policy.startDate, 'MMM dd')} - {format(policy.endDate, 'MMM dd, yyyy')}
              {daysRemaining > 0 && policy.status === 'active' && (
                <span className="ml-2 text-green-600 font-medium">
                  ({daysRemaining} days left)
                </span>
              )}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{policy.location.address || `${policy.location.lat.toFixed(4)}, ${policy.location.lng.toFixed(4)}`}</span>
          </div>
        </div>

        {/* Claims summary */}
        {policy.claimHistory.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Claims</h4>
            <div className="space-y-1">
              {policy.claimHistory.slice(-2).map((claim, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 capitalize">{claim.triggerType.replace('_', ' ')}</span>
                  <span className={`font-medium ${
                    claim.status === 'paid' ? 'text-green-600' : 
                    claim.status === 'pending' ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {claim.status === 'paid' ? `+${claim.payoutAmount} ALGO` : claim.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={() => onViewDetails(policy)}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );
};