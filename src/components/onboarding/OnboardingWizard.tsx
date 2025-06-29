import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Shield, Smartphone, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAlgorand } from '../../hooks/useAlgorand';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center space-y-6">
    <div className="flex justify-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <Shield className="w-10 h-10 text-green-600" />
      </div>
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MicroCrop Insurance</h2>
      <p className="text-gray-600 text-lg">Protect your crops with smart, weather-based insurance</p>
    </div>
    <div className="bg-green-50 rounded-lg p-4 text-left">
      <h3 className="font-semibold text-green-800 mb-2">What you'll get:</h3>
      <ul className="space-y-2 text-green-700">
        <li className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>Automatic payouts when weather affects your crops</span>
        </li>
        <li className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>No paperwork or claim forms needed</span>
        </li>
        <li className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>Fast payments directly to your wallet</span>
        </li>
      </ul>
    </div>
    <button
      onClick={onNext}
      className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
    >
      Get Started
    </button>
  </div>
);

const WalletSetupStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { connectWallet, isConnected, loading, error } = useAlgorand();
  
  const handleConnect = async () => {
    await connectWallet();
    // Only proceed if connection was successful
    if (!loading && !error) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (isConnected) {
          onNext();
        }
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connect Your Pera Wallet</h2>
        <p className="text-gray-600">We'll connect to your Pera wallet to secure your insurance policies</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Why Pera Wallet?</h3>
        <ul className="space-y-1 text-blue-700 text-sm">
          <li>• Your insurance policies are stored securely on the blockchain</li>
          <li>• Payouts are sent directly to your wallet</li>
          <li>• You maintain full control of your funds</li>
          <li>• Official Algorand wallet with excellent security</li>
        </ul>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Connection Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-3 text-sm text-red-700">
            <p><strong>Troubleshooting:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Make sure you have Pera Wallet installed on your mobile device</li>
              <li>Ensure you have an Algorand account in Pera Wallet</li>
              <li>Try refreshing the page and connecting again</li>
            </ul>
          </div>
        </div>
      )}

      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Smartphone className="w-5 h-5" />
              <span>Connect Pera Wallet</span>
            </>
          )}
        </button>
      ) : (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            <span className="font-medium">Pera Wallet Connected!</span>
          </div>
          <button
            onClick={onNext}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        className="w-full text-gray-600 py-2 hover:text-gray-800 transition-colors"
      >
        Back
      </button>
    </div>
  );
};

const LocationStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [location, setLocation] = useState({ lat: '', lng: '', address: '' });
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            address: 'Current Location'
          });
          setLoading(false);
        },
        () => {
          setLoading(false);
          alert('Unable to get your location. Please enter coordinates manually.');
        }
      );
    }
  };

  const canContinue = location.lat && location.lng;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Set Your Farm Location</h2>
        <p className="text-gray-600">We need your farm's location to monitor local weather conditions</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              <span>Use Current Location</span>
            </>
          )}
        </button>

        <div className="text-center text-gray-500">or enter manually</div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={location.lat}
            onChange={(e) => setLocation(prev => ({ ...prev, lat: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={location.lng}
            onChange={(e) => setLocation(prev => ({ ...prev, lng: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <input
          type="text"
          placeholder="Farm address (optional)"
          value={location.address}
          onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 text-gray-600 py-3 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const ProfileStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [profile, setProfile] = useState({ name: '', phone: '', farmSize: '' });

  const canContinue = profile.name.trim();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h2>
        <p className="text-gray-600">Help us personalize your insurance experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="For SMS notifications"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Farm Size (optional)
          </label>
          <select
            value={profile.farmSize}
            onChange={(e) => setProfile(prev => ({ ...prev, farmSize: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select farm size</option>
            <option value="small">{"Small (< 2 acres)"}</option>
            <option value="medium">Medium (2-10 acres)</option>
            <option value="large">{"Large (> 10 acres)"}</option>
          </select>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="flex-1 text-gray-600 py-3 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    { id: 'welcome', title: 'Welcome', description: 'Introduction to MicroCrop', component: WelcomeStep },
    { id: 'wallet', title: 'Wallet', description: 'Connect your wallet', component: WalletSetupStep },
    { id: 'location', title: 'Location', description: 'Set farm location', component: LocationStep },
    { id: 'profile', title: 'Profile', description: 'Personal information', component: ProfileStep }
  ];

  const currentStepData = steps[currentStep];
  const StepComponent = currentStepData.component;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index <= currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}: {currentStepData.title}
            </span>
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <StepComponent onNext={handleNext} onBack={handleBack} />
        </div>
      </div>
    </div>
  );
};