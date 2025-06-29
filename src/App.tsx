import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { MobileDashboard } from './components/dashboard/MobileDashboard';
import { InsuranceMarketplace } from './components/dashboard/InsuranceMarketplace';
import { LazyWrapper, LazyOnboardingWizard, preloadComponents } from './components/performance/LazyComponents';
import { OfflineIndicator } from './components/offline/OfflineSupport';
import { AccessibilityProvider } from './components/accessibility/AccessibilityProvider';
import { LocalizationProvider } from './components/localization/LocalizationProvider';
import { usePolicyStore } from './store/policyStore';
import { useAlgorand } from './hooks/useAlgorand';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'marketplace'>('marketplace');
  
  const { isConnected } = useAlgorand();
  const { policies, setError, clearError } = usePolicyStore();

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('microcrop_onboarding_completed');
    const hasExistingPolicies = policies.length > 0;
    
    setIsFirstVisit(!hasCompletedOnboarding && !hasExistingPolicies);
    setShowOnboarding(!hasCompletedOnboarding && !isConnected);
  }, [isConnected, policies.length]);

  // Preload components for better performance
  useEffect(() => {
    const timer = setTimeout(preloadComponents, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('microcrop_onboarding_completed', 'true');
    setShowOnboarding(false);
    setIsFirstVisit(false);
  };

  const handleCreatePolicy = () => {
    setCurrentView('marketplace');
  };

  // Show onboarding for new users
  if (showOnboarding || (!isConnected && isFirstVisit)) {
    return (
      <AccessibilityProvider>
        <LocalizationProvider>
          <div className="min-h-screen bg-gray-50">
            <OfflineIndicator />
            <LazyWrapper>
              <LazyOnboardingWizard onComplete={handleOnboardingComplete} />
            </LazyWrapper>
          </div>
        </LocalizationProvider>
      </AccessibilityProvider>
    );
  }

  // Main application for connected users
  return (
    <AccessibilityProvider>
      <LocalizationProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Skip link for accessibility */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          
          <OfflineIndicator />
          <Header />
          
          {/* Navigation */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <button
                  onClick={() => setCurrentView('marketplace')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    currentView === 'marketplace'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Insurance Marketplace
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    currentView === 'dashboard'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Dashboard
                </button>
              </div>
            </div>
          </div>
          
          <main id="main-content" role="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentView === 'marketplace' ? (
              <InsuranceMarketplace />
            ) : (
              <MobileDashboard onCreatePolicy={handleCreatePolicy} />
            )}
          </main>
        </div>
      </LocalizationProvider>
    </AccessibilityProvider>
  );
}

export default App;