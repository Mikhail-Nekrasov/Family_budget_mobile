import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { CategoryCard } from '@/components/categories/category-card';
import { CategoryForm } from '@/components/categories/category-form';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { useLanguage } from '@/hooks/use-language';
import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';
import { getCategories } from '@/repositories/category-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function CategoriesScreen() {
  const database = useSQLiteContext();
  const { translations } = useLanguage();

  const [type, setType] = useState<EntryType>('EXPENSE');
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [createVisible, setCreateVisible] = useState(false);

  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        text: '#F0F3FA',
        muted: '#A8B3C5',
      }
    : {
        text: '#192238',
        muted: '#6C7890',
      };

  useFocusEffect(
    useCallback(() => {
      if (createVisible) {
        return;
      }
      let active = true;

      async function loadCategories() {
        setStatus('loading');

        try {
          const result = await getCategories(database, type);

          if (active) {
            setCategories(result);
            setStatus('ready');
          }
        } catch (error) {
          console.warn('Failed to load categories', error);

          if (active) {
            setStatus('error');
          }
        }
      }

      void loadCategories();

      return () => {
        active = false;
      };
    }, [database, type, createVisible]),
  );

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={styles.screen}
      >
        <View style={styles.toolbar}>
          <AppButton
            title={translations.newCategory}
            rightSymbol="＋"
            nativeGlass
            onPress={() => setCreateVisible(true)}
          />
        </View>
        <View style={styles.tabs}>
          <ScreenTabs<EntryType>
            options={[
              {
                value: 'EXPENSE',
                label: translations.expenses,
              },
              {
                value: 'INCOME',
                label: translations.income,
              },
            ]}
            value={type}
            onChange={setType}
          />
        </View>

        <FlatList
          data={status === 'ready' ? categories : []}
          keyExtractor={(category) => category.syncId}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            status === 'loading' ? (
              <ActivityIndicator
                accessibilityLabel={translations.loading}
                color={palette.text}
                style={styles.loading}
              />
            ) : (
              <Text
                style={[
                  styles.message,
                  { color: palette.muted },
                ]}
              >
                {status === 'error'
                  ? translations.loadCategoriesError
                  : translations.noCategories}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <CategoryCard category={item} />
          )}
        />
        <Modal
          visible={createVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          backdropColor={dark ? '#111722' : '#F5F6F9'}
          onRequestClose={() => {
            if (!createVisible) {
              return;
            }

            setCreateVisible(false);
          }}
        >
          {createVisible && (
            <SafeAreaProvider>
              <CategoryForm
                type={type}
                onSaved={() => setCreateVisible(false)}
                onCancel={() => setCreateVisible(false)}
              />
            </SafeAreaProvider>
          )}
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
  },
  content: {
    padding: 20,
    gap: 4,
  },
  loading: {
    marginTop: 24,
  },
  message: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 16,
  },
    toolbar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});