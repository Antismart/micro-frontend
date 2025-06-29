import React, { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Lazy load heavy components
export const LazyWeatherChart = lazy(() => 
  import('../weather/WeatherChart').then(module => ({ default: module.WeatherChart }))
);

export const LazyPolicyForm = lazy(() => 
  import('../forms/PolicyForm').then(module => ({ default: module.PolicyForm }))
);

export const LazyPayoutModal = lazy(() => 
  import('../modals/PayoutModal').then(module => ({ default: module.PayoutModal }))
);

export const LazyOnboardingWizard = lazy(() => 
  import('../onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard }))
);

// Wrapper component with loading fallback
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <LoadingSpinner text="Loading..." /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Preload components for better UX
export const preloadComponents = () => {
  // Preload commonly used components
  import('../weather/WeatherChart');
  import('../forms/PolicyForm');
  import('../modals/PayoutModal');
};

// Component for critical resource hints
export const ResourceHints: React.FC = () => {
  return (
    <>
      {/* Preload critical fonts */}
      <link
        rel="preload"
        href="/fonts/inter-var.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      
      {/* Preconnect to external services */}
      <link rel="preconnect" href="https://api.weatherxm.com" />
      <link rel="preconnect" href="https://testnet-api.algonode.cloud" />
      
      {/* DNS prefetch for likely navigation */}
      <link rel="dns-prefetch" href="https://testnet.algoexplorer.io" />
    </>
  );
};