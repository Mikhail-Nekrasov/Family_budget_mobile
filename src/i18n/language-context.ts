import {
    createContext,
    type Dispatch,
    type SetStateAction,
} from 'react';

import type { Messages } from './en';
import type { Language } from './languages';

export type LanguageContextValue = {
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  locale: string;
  translations: Messages;
};

export const LanguageContext =
  createContext<LanguageContextValue | null>(null);