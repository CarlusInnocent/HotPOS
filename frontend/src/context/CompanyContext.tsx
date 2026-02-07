import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { companySettingsApi, type CompanySettings } from '@/lib/api';

interface CompanyContextType {
  settings: CompanySettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: CompanySettings = {
  companyName: 'HOTLINES',
  receiptFooter: 'Thank you for your purchase!',
  receiptTagline: 'Please come again',
  currencySymbol: 'UGX',
};

const CompanyContext = createContext<CompanyContextType>({
  settings: defaultSettings,
  isLoading: true,
  refreshSettings: async () => {},
});

export function useCompany() {
  return useContext(CompanyContext);
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      // Only fetch if user is logged in (has token)
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      const data = await companySettingsApi.get();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load company settings:', err);
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <CompanyContext.Provider value={{ settings, isLoading, refreshSettings }}>
      {children}
    </CompanyContext.Provider>
  );
}
