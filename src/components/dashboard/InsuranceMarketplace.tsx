import React, { useState, useEffect } from 'react';
import { Shield, Plus, TrendingUp, Users, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { InsurancePurchaseFlow } from '../insurance/InsurancePurchaseFlow';
import { useInsuranceContract } from '../../hooks/useInsuranceContract';
import { useAlgorand } from '../../hooks/useAlgorand';

export const InsuranceMarketplace: React.FC = () => {
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const { isConnected } = useAlgorand();
  const { contractState, getContractState, loading } = useInsuranceContract(123456); // Replace with actual contract ID

  useEffect(() => {
    if (isConnected) {
      getContractState();
    }
  }, [isConnected, getContractState]);

  const insuranceCategories = [
    {
      id: 'crop',
      name: 'Crop Insurance',
      description: 'Weather-based crop protection with automatic payouts',
      icon: '🌾',
      color: 'green',
      stats: { policies: 1250, coverage: '2.5M', claims: '98%' },
      features: ['Weather triggers', 'Automatic payouts', 'Real-time monitoring', 'Yield protection'],
      riskLevel: 'Low',
      avgPremium: '8%'
    },
    {
      id: 'weather',
      name: 'Weather Insurance',
      description: 'Parametric weather coverage for extreme conditions',
      icon: '🌦️',
      color: 'blue',
      stats: { policies: 850, coverage: '1.8M', claims: '95%' },
      features: ['Temperature protection', 'Rainfall coverage', 'Wind damage', 'Hail protection'],
      riskLevel: 'Medium',
      avgPremium: '6%'
    },
    {
      id: 'yield',
      name: 'Yield Insurance',
      description: 'Harvest yield guarantee with market price protection',
      icon: '📊',
      color: 'purple',
      stats: { policies: 650, coverage: '3.2M', claims: '92%' },
      features: ['Yield guarantee', 'Market price protection', 'Quality coverage', 'Revenue insurance'],
      riskLevel: 'High',
      avgPremium: '10%'
    },
    {
      id: 'livestock',
      name: 'Livestock Insurance',
      description: 'Comprehensive livestock protection and health coverage',
      icon: '🐄',
      color: 'orange',
      stats: { policies: 420, coverage: '1.1M', claims: '89%' },
      features: ['Health coverage', 'Mortality protection', 'Disease outbreak', 'Feed cost protection'],
      riskLevel: 'Medium',
      avgPremium: '12%'
    }
  ];

  const marketStats = [
    {
      label: 'Total Policies',
      value: contractState?.totalPolicies?.toLocaleString() || '0',
      icon: Shield,
      color: 'text-green-600 bg-green-100'
    },
    {
      label: 'Total Coverage',
      value: `${((contractState?.totalPayouts || 0) / 1000000).toFixed(1)}M ALGO`,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      label: 'Active Users',
      value: '3,200+',
      icon: Users,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      label: 'Claims Paid',
      value: `${contractState?.totalClaims?.toLocaleString() || '0'}`,
      icon: DollarSign,
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  const filteredCategories = selectedCategory === 'all' 
    ? insuranceCategories 
    : insuranceCategories.filter(cat => cat.id === selectedCategory);

  const handlePolicyComplete = (policyData: any) => {
    console.log('Policy created:', policyData);
    setShowPurchaseFlow(false);
    // Refresh contract state
    getContractState();
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Insurance Marketplace</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Decentralized insurance powered by Algorand blockchain. 
          Transparent, automated, and secure coverage for your agricultural needs.
        </p>
        
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Connect your wallet to purchase insurance</span>
            </div>
          </div>
        )}
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {marketStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hover padding="md">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant={selectedCategory === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Categories
        </Button>
        {insuranceCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.icon} {category.name}
          </Button>
        ))}
      </div>

      {/* Insurance Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category.id} hover padding="none" className="overflow-hidden">
            <div className="p-6">
              {/* Category Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{category.icon}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-gray-600">{category.description}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(category.riskLevel)}`}>
                  {category.riskLevel} Risk
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Active Policies</div>
                  <div className="text-lg font-bold text-gray-900">{category.stats.policies}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Total Coverage</div>
                  <div className="text-lg font-bold text-gray-900">{category.stats.coverage}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Claim Rate</div>
                  <div className="text-lg font-bold text-gray-900">{category.stats.claims}</div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
                <div className="flex flex-wrap gap-2">
                  {category.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Premium Info */}
              <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
                <div>
                  <span className="text-sm text-green-700">Average Premium Rate</span>
                  <div className="text-lg font-bold text-green-900">{category.avgPremium}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-green-700">Coverage Range</span>
                  <div className="text-sm font-medium text-green-900">100 - 100,000 ALGO</div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowPurchaseFlow(true)}
                disabled={!isConnected}
                icon={<Plus className="w-5 h-5" />}
                fullWidth
              >
                {isConnected ? 'Get Coverage' : 'Connect Wallet to Purchase'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* How It Works Section */}
      <Card padding="lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: 1,
              title: 'Connect Wallet',
              description: 'Connect your Algorand wallet to authenticate and manage policies',
              icon: '🔗'
            },
            {
              step: 2,
              title: 'Choose Coverage',
              description: 'Select insurance type, coverage amount, and policy duration',
              icon: '🛡️'
            },
            {
              step: 3,
              title: 'Complete KYC',
              description: 'Verify your identity for regulatory compliance',
              icon: '📋'
            },
            {
              step: 4,
              title: 'Get Policy NFT',
              description: 'Receive your policy as an NFT with automatic claim processing',
              icon: '🎫'
            }
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Transparent & Trustless',
            description: 'All policies and claims are recorded on the blockchain for complete transparency',
            icon: '🔍'
          },
          {
            title: 'Automatic Payouts',
            description: 'Smart contracts automatically trigger payouts when conditions are met',
            icon: '⚡'
          },
          {
            title: 'Low Cost & Fast',
            description: 'Minimal fees and instant settlements powered by Algorand',
            icon: '💨'
          }
        ].map((benefit, index) => (
          <Card key={index} hover padding="md" className="text-center">
            <div className="text-4xl mb-4">{benefit.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
            <p className="text-gray-600">{benefit.description}</p>
          </Card>
        ))}
      </div>

      {/* Purchase Flow Modal */}
      <InsurancePurchaseFlow
        isOpen={showPurchaseFlow}
        onClose={() => setShowPurchaseFlow(false)}
        onComplete={handlePolicyComplete}
      />
    </div>
  );
};