import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type PropsWithChildren } from 'react';

import { LanguageContext } from './language-context';
import {
  defaultLanguage,
  languages,
  type Language,
} from './languages';

const LANGUAGE_STORAGE_KEY = 'settings.language';

function isLanguage(value: string): value is Language {
  return Object.prototype.hasOwnProperty.call(languages, value);
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLanguage() {
      try {
        const savedLanguage = await AsyncStorage.getItem(
          LANGUAGE_STORAGE_KEY,
        );

        if (
          active &&
          savedLanguage !== null &&
          isLanguage(savedLanguage)
        ) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.warn('Failed to load language setting', error);
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    void loadLanguage();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language).catch(
      (error) => {
        console.warn('Failed to save language setting', error);
      },
    );
  }, [language, loaded]);

  const { locale, messages } = languages[language];

  if (!loaded) {
    return null;
  }

  return (
    <LanguageContext
      value={{
        language,
        setLanguage,
        locale,
        translations: messages,
      }}
    >
      {children}
    </LanguageContext>
  );
}