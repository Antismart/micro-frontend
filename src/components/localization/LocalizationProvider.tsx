import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocalizationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date) => string;
  isRTL: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return context;
};

// Translation data structure
const translations = {
  en: {
    'app.title': 'MicroCrop Insurance',
    'app.subtitle': 'Decentralized Crop Protection',
    'nav.overview': 'Overview',
    'nav.policies': 'My Policies',
    'nav.weather': 'Weather',
    'nav.marketplace': 'Buy Coverage',
    'onboarding.welcome.title': 'Welcome to MicroCrop Insurance',
    'onboarding.welcome.subtitle': 'Protect your crops with smart, weather-based insurance',
    'onboarding.wallet.title': 'Connect Your Wallet',
    'onboarding.wallet.subtitle': 'We\'ll connect to your Algorand wallet to secure your insurance policies',
    'onboarding.location.title': 'Set Your Farm Location',
    'onboarding.location.subtitle': 'We need your farm\'s location to monitor local weather conditions',
    'onboarding.profile.title': 'Tell Us About Yourself',
    'onboarding.profile.subtitle': 'Help us personalize your insurance experience',
    'policy.coverage': 'Coverage',
    'policy.payouts': 'Payouts',
    'policy.active': 'Active',
    'policy.expired': 'Expired',
    'policy.expiring_soon': 'Expiring Soon',
    'weather.temperature': 'Temperature',
    'weather.rainfall': 'Rainfall',
    'weather.humidity': 'Humidity',
    'weather.wind_speed': 'Wind Speed',
    'weather.risk_level': 'Risk Level',
    'weather.low_risk': 'Low Risk',
    'weather.medium_risk': 'Medium Risk',
    'weather.high_risk': 'High Risk',
    'payout.received': 'Payout Received!',
    'payout.amount': 'Amount',
    'payout.transaction_id': 'Transaction ID',
    'payout.share': 'Share Good News',
    'button.continue': 'Continue',
    'button.back': 'Back',
    'button.purchase': 'Purchase Coverage',
    'button.view_details': 'View Details',
    'button.connect_wallet': 'Connect Wallet',
    'error.wallet_connection': 'Failed to connect wallet',
    'error.weather_data': 'Unable to load weather data',
    'error.policy_creation': 'Failed to create policy'
  },
  es: {
    'app.title': 'Seguro MicroCrop',
    'app.subtitle': 'Protección Descentralizada de Cultivos',
    'nav.overview': 'Resumen',
    'nav.policies': 'Mis Pólizas',
    'nav.weather': 'Clima',
    'nav.marketplace': 'Comprar Cobertura',
    'onboarding.welcome.title': 'Bienvenido al Seguro MicroCrop',
    'onboarding.welcome.subtitle': 'Protege tus cultivos con seguro inteligente basado en el clima',
    'policy.coverage': 'Cobertura',
    'policy.payouts': 'Pagos',
    'policy.active': 'Activa',
    'policy.expired': 'Expirada',
    'policy.expiring_soon': 'Expira Pronto',
    'weather.temperature': 'Temperatura',
    'weather.rainfall': 'Lluvia',
    'weather.humidity': 'Humedad',
    'weather.wind_speed': 'Velocidad del Viento',
    'button.continue': 'Continuar',
    'button.back': 'Atrás',
    'button.purchase': 'Comprar Cobertura',
    'button.connect_wallet': 'Conectar Billetera'
  },
  sw: {
    'app.title': 'Bima ya MicroCrop',
    'app.subtitle': 'Ulinzi wa Mazao Usio na Kituo',
    'nav.overview': 'Muhtasari',
    'nav.policies': 'Sera Zangu',
    'nav.weather': 'Hali ya Hewa',
    'nav.marketplace': 'Nunua Ulinzi',
    'onboarding.welcome.title': 'Karibu kwenye Bima ya MicroCrop',
    'onboarding.welcome.subtitle': 'Linda mazao yako kwa bima ya akili inayotegemea hali ya hewa',
    'policy.coverage': 'Ulinzi',
    'policy.payouts': 'Malipo',
    'policy.active': 'Hai',
    'policy.expired': 'Imeisha',
    'weather.temperature': 'Joto',
    'weather.rainfall': 'Mvua',
    'button.continue': 'Endelea',
    'button.back': 'Rudi',
    'button.purchase': 'Nunua Ulinzi',
    'button.connect_wallet': 'Unganisha Mkoba'
  }
};

const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

interface LocalizationProviderProps {
  children: React.ReactNode;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang as keyof typeof translations]) {
      setLanguageState(browserLang);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language as keyof typeof translations] || translations.en;
    let translation = langTranslations[key as keyof typeof langTranslations] || key;

    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{{${paramKey}}}`, String(value));
      });
    }

    return translation;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(language, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' ALGO';
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const isRTL = rtlLanguages.includes(language);

  return (
    <LocalizationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatCurrency,
        formatDate,
        isRTL
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};