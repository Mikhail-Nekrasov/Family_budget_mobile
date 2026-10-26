import { en, type Messages } from './en';
import { fi } from './fi';
import { ru } from './ru';

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
} satisfies Record<string, LanguageDefinition>;

export type Language = keyof typeof languages;

export const defaultLanguage: Language = 'en';