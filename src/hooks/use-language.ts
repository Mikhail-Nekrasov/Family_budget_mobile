import { useContext } from 'react';

import { LanguageContext } from '@/i18n/language-context';

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context === null) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}