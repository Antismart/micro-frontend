import React from 'react';
import { Calendar, MapPin, Shield, AlertCircle, CheckCircle, Clock, TrendingUp, Droplets } from 'lucide-react';
import { InsurancePolicy } from '../../../types';
import { format, differenceInDays } from 'date-fns';

interface PolicyStatusCardProps {
  policy: InsurancePolicy;
  weatherData?: any;
  onViewDetails: (policy: InsurancePolicy) => void;
}

export const PolicyStatusCard: React.FC<PolicyStatusCardProps> = ({ 
  policy, 
  weatherData,
  onViewDetails 
}) => {
  const daysRemaining = differenceInDays(policy.endDate, new Date());
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;

  const getStatusConfig = () => {
    if (isExpired) {
      return {
        color: 'text-gray-600 bg-gray-100',
        icon: AlertCircle,
        text: 'Expired'
      };
    }
    if (isExpiringSoon) {
      return {
        color: 'text-orange-600 bg-orange-100',
        icon: Clock,
        text: 'Expiring Soon'
      };
    }
    return {
      color: 'text-green-600 bg-green-100',
      icon: CheckCircle,
      text: 'Active'
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const totalPayouts = policy.claimHistory
    .filter(claim => claim.status === 'paid')
    .reduce((sum, claim) => sum + claim.payoutAmount, 0);

  const recentClaims = policy.claimHistory.slice(-3);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
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
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusConfig.text}</span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">Coverage</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{policy.coverageAmount.toLocaleString()}</div>
            <div className="text-xs text-blue-600">ALGO</div>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">Payouts</span>
            </div>
            <div className="text-lg font-bold text-green-900">{totalPayouts.toLocaleString()}</div>
            <div className="text-xs text-green-600">ALGO received</div>
          </div>
        </div>

        {/* Policy details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {format(policy.startDate, 'MMM dd')} - {format(policy.endDate, 'MMM dd, yyyy')}
              {!isExpired && (
                <span className={`ml-2 font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}>
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

        {/* Weather status */}
        {weatherData && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Current Conditions</span>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Updated 2h ago</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Temp: {weatherData.temperature}°C</span>
              </div>
              <div className="flex items-center space-x-2">
                <Droplets className="w-3 h-3 text-blue-500" />
                <span className="text-sm text-gray-600">Rain: {weatherData.rainfall}mm</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent claims */}
        {recentClaims.length > 0 && (
          <div className="border-t pt-4 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
            <div className="space-y-2">
              {recentClaims.map((claim, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 capitalize">
                    {claim.triggerType.replace('_', ' ')} • {format(claim.claimDate, 'MMM dd')}
                  </span>
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
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          View Full Details
        </button>
      </div>
    </div>
  );
};