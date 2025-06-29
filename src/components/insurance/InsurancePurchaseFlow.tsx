import React, { useState } from 'react';
import { Shield, FileText, CreditCard, CheckCircle, AlertTriangle, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useAlgorand } from '../../hooks/useAlgorand';

interface InsurancePurchaseFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (policyData: any) => void;
}

interface CoverageOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseRate: number;
  minCoverage: number;
  maxCoverage: number;
  features: string[];
}

interface PolicyDetails {
  coverageType: string;
  coverageAmount: number;
  duration: number;
  deductible: number;
  additionalRiders: string[];
}

export const InsurancePurchaseFlow: React.FC<InsurancePurchaseFlowProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected, connectWallet, currentAccount, balance, signTransaction } = useAlgorand();
  
  const [selectedCoverage, setSelectedCoverage] = useState<CoverageOption | null>(null);
  const [policyDetails, setPolicyDetails] = useState<PolicyDetails>({
    coverageType: '',
    coverageAmount: 5, // Start with 5 ALGO
    duration: 90,
    deductible: 0.5, // 0.5 ALGO deductible
    additionalRiders: []
  });
  const [premiumCalculation, setPremiumCalculation] = useState({
    basePremium: 0,
    riskMultiplier: 1.0,
    totalPremium: 0,
    breakdown: []
  });

  const coverageOptions: CoverageOption[] = [
    {
      id: 'crop',
      name: 'Crop Insurance',
      description: 'Weather-based crop protection',
      icon: '🌾',
      baseRate: 0.08,
      minCoverage: 1,
      maxCoverage: 8,
      features: ['Weather triggers', 'Automatic payouts', 'Real-time monitoring', 'Yield protection']
    },
    {
      id: 'weather',
      name: 'Weather Insurance',
      description: 'Parametric weather coverage',
      icon: '🌦️',
      baseRate: 0.06,
      minCoverage: 2,
      maxCoverage: 6,
      features: ['Temperature protection', 'Rainfall coverage', 'Wind damage', 'Hail protection']
    },
    {
      id: 'yield',
      name: 'Yield Insurance',
      description: 'Harvest yield guarantee',
      icon: '📊',
      baseRate: 0.10,
      minCoverage: 3,
      maxCoverage: 8,
      features: ['Yield guarantee', 'Market price protection', 'Quality coverage', 'Revenue insurance']
    }
  ];

  const steps = [
    { id: 1, title: 'Connect Wallet', icon: Wallet },
    { id: 2, title: 'Select Coverage', icon: Shield },
    { id: 3, title: 'Policy Details', icon: FileText },
    { id: 4, title: 'Review & Pay', icon: CreditCard },
    { id: 5, title: 'Confirmation', icon: CheckCircle }
  ];

  const calculatePremium = (coverage: CoverageOption, details: PolicyDetails) => {
    const basePremium = details.coverageAmount * coverage.baseRate;
    const durationMultiplier = details.duration / 365;
    const deductibleDiscount = details.deductible / details.coverageAmount * 0.1;
    
    const riskMultiplier = 1.0; // Simplified risk calculation without KYC
    const totalPremium = basePremium * durationMultiplier * riskMultiplier * (1 - deductibleDiscount);
    
    return {
      basePremium,
      riskMultiplier,
      totalPremium,
      breakdown: [
        { label: 'Base Premium', amount: basePremium },
        { label: 'Duration Adjustment', amount: basePremium * (durationMultiplier - 1) },
        { label: 'Deductible Discount', amount: -basePremium * deductibleDiscount },
        { label: 'Risk Assessment', amount: basePremium * (riskMultiplier - 1) }
      ]
    };
  };

  const handleCoverageSelect = (coverage: CoverageOption) => {
    setSelectedCoverage(coverage);
    setPolicyDetails(prev => ({ 
      ...prev, 
      coverageType: coverage.id,
      coverageAmount: Math.max(coverage.minCoverage, Math.min(coverage.maxCoverage, prev.coverageAmount))
    }));
    const calculation = calculatePremium(coverage, policyDetails);
    setPremiumCalculation(calculation);
  };

  const handlePolicyDetailsChange = (field: keyof PolicyDetails, value: any) => {
    const newDetails = { ...policyDetails, [field]: value };
    setPolicyDetails(newDetails);
    
    if (selectedCoverage) {
      const calculation = calculatePremium(selectedCoverage, newDetails);
      setPremiumCalculation(calculation);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!isConnected) {
        throw new Error('Wallet not connected');
      }
      
      if (balance < premiumCalculation.totalPremium) {
        throw new Error(`Insufficient ALGO balance. Need ${premiumCalculation.totalPremium.toFixed(3)} ALGO, have ${balance.toFixed(3)} ALGO`);
      }
      
      // Create and sign the transaction
      // This would interact with the smart contract
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setCurrentStep(5);
      
      // Call completion handler
      onComplete({
        coverageType: selectedCoverage?.id,
        coverageAmount: policyDetails.coverageAmount,
        duration: policyDetails.duration,
        premium: premiumCalculation.totalPremium,
        transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase()
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600">Connect your Algorand wallet to purchase insurance coverage</p>
            </div>
            
            {isConnected ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Wallet Connected</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    {currentAccount?.substring(0, 8)}...{currentAccount?.substring(currentAccount.length - 6)}
                  </p>
                  <p className="text-sm text-green-700">Balance: {balance.toFixed(3)} ALGO</p>
                </div>
                <Button variant="primary" onClick={() => setCurrentStep(2)} fullWidth>
                  Continue to Coverage Selection
                </Button>
              </div>
            ) : (
              <Button variant="primary" onClick={connectWallet} loading={loading} fullWidth>
                Connect Pera Wallet
              </Button>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Coverage Type</h3>
              <p className="text-gray-600">Choose the insurance coverage that best fits your needs</p>
            </div>
            
            <div className="space-y-4">
              {coverageOptions.map((option) => (
                <Card
                  key={option.id}
                  hover
                  padding="md"
                  className={`cursor-pointer transition-all ${
                    selectedCoverage?.id === option.id 
                      ? 'ring-2 ring-green-500 bg-green-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleCoverageSelect(option)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{option.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{option.name}</h4>
                      <p className="text-gray-600 mb-3">{option.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Premium Rate:</span>
                          <span className="font-medium ml-1">{(option.baseRate * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Coverage Range:</span>
                          <span className="font-medium ml-1">
                            {option.minCoverage} - {option.maxCoverage} ALGO
                          </span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {option.features.map((feature, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {selectedCoverage && (
              <Button variant="primary" onClick={() => setCurrentStep(3)} fullWidth>
                Continue to Policy Details
              </Button>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Policy Details</h3>
              <p className="text-gray-600">Customize your coverage amount and terms</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Amount (ALGO)
                </label>
                <Input
                  type="number"
                  value={policyDetails.coverageAmount}
                  onChange={(e) => handlePolicyDetailsChange('coverageAmount', parseFloat(e.target.value))}
                  min={selectedCoverage?.minCoverage}
                  max={selectedCoverage?.maxCoverage}
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Range: {selectedCoverage?.minCoverage} - {selectedCoverage?.maxCoverage} ALGO
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Duration (days)
                </label>
                <select
                  value={policyDetails.duration}
                  onChange={(e) => handlePolicyDetailsChange('duration', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={120}>120 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>365 days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deductible (ALGO)
                </label>
                <Input
                  type="number"
                  value={policyDetails.deductible}
                  onChange={(e) => handlePolicyDetailsChange('deductible', parseFloat(e.target.value))}
                  min={0}
                  max={policyDetails.coverageAmount * 0.2}
                  step={0.1}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher deductible = lower premium
                </p>
              </div>
              
              {premiumCalculation.totalPremium > 0 && (
                <Card padding="md" className="bg-blue-50 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Premium Calculation</h4>
                  <div className="space-y-1 text-sm">
                    {premiumCalculation.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-blue-700">{item.label}:</span>
                        <span className="font-medium text-blue-900">
                          {item.amount >= 0 ? '+' : ''}{item.amount.toFixed(3)} ALGO
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-blue-300 pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-blue-900">Total Premium:</span>
                        <span className="text-blue-900">{premiumCalculation.totalPremium.toFixed(3)} ALGO</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
            
            <Button variant="primary" onClick={() => setCurrentStep(4)} fullWidth>
              Continue to Review & Payment
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Review & Purchase</h3>
              <p className="text-gray-600">Review your policy details and complete the purchase</p>
            </div>
            
            <Card padding="md" className="space-y-4">
              <h4 className="font-semibold text-gray-900">Policy Summary</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Coverage Type:</span>
                  <p className="font-medium">{selectedCoverage?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Coverage Amount:</span>
                  <p className="font-medium">{policyDetails.coverageAmount} ALGO</p>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-medium">{policyDetails.duration} days</p>
                </div>
                <div>
                  <span className="text-gray-600">Deductible:</span>
                  <p className="font-medium">{policyDetails.deductible} ALGO</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Premium:</span>
                  <span className="text-xl font-bold text-green-600">
                    {premiumCalculation.totalPremium.toFixed(3)} ALGO
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Your balance: {balance.toFixed(3)} ALGO
                </div>
              </div>
            </Card>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                variant="primary" 
                onClick={handlePurchase} 
                loading={loading}
                fullWidth
                size="lg"
                disabled={balance < premiumCalculation.totalPremium}
              >
                Purchase Policy for {premiumCalculation.totalPremium.toFixed(3)} ALGO
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                By purchasing this policy, you agree to our terms and conditions. 
                Transaction fees may apply.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Policy Created Successfully!</h3>
              <p className="text-gray-600">Your insurance policy has been created and is now active</p>
            </div>
            
            <Card padding="md" className="bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Policy Details</h4>
              <div className="space-y-2 text-sm text-green-800">
                <p><strong>Policy ID:</strong> POL_{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                <p><strong>Coverage:</strong> {policyDetails.coverageAmount} ALGO</p>
                <p><strong>Duration:</strong> {policyDetails.duration} days</p>
                <p><strong>Premium Paid:</strong> {premiumCalculation.totalPremium.toFixed(3)} ALGO</p>
              </div>
            </Card>
            
            <Button variant="primary" onClick={onClose} fullWidth>
              View My Policies
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Purchase Insurance Coverage">
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Step content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
      </div>
    </Modal>
  );
};