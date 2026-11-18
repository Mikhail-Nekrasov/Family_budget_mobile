import { en, type Messages } from './en';
import { fi } from './fi';
import { fr } from './fr';
import { es } from './es';
import { ru } from './ru';
import { vi } from './vi';

type LanguageDefinition = {
  locale: string;
  messages: Messages;
};

export const languages = {
  en: {
    locale: 'en-GB',
    messages: en,
  },
  ru: {
    locale: 'ru-RU',
    messages: ru,
  },
  fi: {
    locale: 'fi-FI',
    messages: fi,
  },
  fr: { locale: 'fr-FR', messages: fr },
  es: { locale: 'es-ES', messages: es },
  vi: { locale: 'vi-VN', messages: vi },
} satisfies Record<string, LanguageDefinition>;

export type Language = keyof typeof languages;

export const defaultLanguage: Language = 'en';