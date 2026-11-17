import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import ReorderableList, { reorderItems, useReorderableDrag } from 'react-native-reorderable-list';

import { AppButton } from '@/components/app-button';
import { CategoryCard } from '@/components/categories/category-card';
import { CategoryForm } from '@/components/categories/category-form';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import {
  StartupEmptyLayout,
  startupPreloadEnabled,
  useStartupScreenLayout,
} from '@/components/startup-layout';
import { useFocusedList } from '@/hooks/use-focused-list';
import { useLanguage } from '@/hooks/use-language';
import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';
import { getCategories, saveCategoryOrder } from '@/repositories/category-repository';

function ReorderableCategoryCard({ category }: { category: Category }) {
  const drag = useReorderableDrag();
  return <CategoryCard category={category} onPress={() => undefined} onLongPress={drag} />;
}

export default function CategoriesScreen() {
  const database = useSQLiteContext();
  const { translations } = useLanguage();

  const [reordering, setReordering] = useState(false);
  const saving = useRef(false);
  const [type, setType] = useState<EntryType>('EXPENSE');
  const [createVisible, setCreateVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  const loadCategories = useCallback(
    (categoryType: EntryType) => getCategories(database, categoryType),
    [database],
  );

  const { rows: categories, status, setRows } = useFocusedList(
    type,
    loadCategories,
    createVisible,
    startupPreloadEnabled,
  );
  const markStartupLayout = useStartupScreenLayout('categories', status !== 'loading');

  async function reorder(from: number, to: number) {
    if (saving.current || from === to) return;
    saving.current = true;
    const next = reorderItems(categories, from, to);
    setRows(next);
    try {
      await saveCategoryOrder(database, type, next.map(({ syncId }) => syncId));
    } catch {
      setRows(await getCategories(database, type).catch(() => categories));
      Alert.alert(translations.loadCategoriesError);
    } finally {
      saving.current = false;
    }
  }

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
            disabled={reordering}
            onPress={() => {
              setEditingCategory(null);
              setCreateVisible(true);
            }}
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
            onChange={(next) => { if (!saving.current) { setReordering(false); setType(next); } }}
          />
        </View>

        {reordering ? (
          <ReorderableList
            style={styles.screen}
            data={categories}
            keyExtractor={(category) => category.syncId}
            contentContainerStyle={styles.content}
            onReorder={({ from, to }) => void reorder(from, to)}
            renderItem={({ item }) => <ReorderableCategoryCard category={item} />}
          />
        ) : <FlatList
          style={styles.screen}
          data={categories}
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
          renderItem={({ item, index }) => (
            <CategoryCard
              onLayout={index === 0 ? markStartupLayout : undefined}
              category={item}
              onPress={() => {
                setEditingCategory(item);
                setCreateVisible(true);
              }}
            />
          )}
        />}
        {!categories.length && <StartupEmptyLayout onLayout={markStartupLayout} />}
        {(categories.length > 1 || reordering) && (
          <View style={styles.footer}>
            <AppButton
              title={reordering ? translations.finishReordering : translations.reorderAccounts}
              nativeGlass rightIcon={reordering ? 'check' : undefined} keepTitleCentered
              onPress={() => { if (!saving.current) setReordering((current) => !current); }}
            />
          </View>
        )}
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
            <SafeAreaProvider style={{ backgroundColor: dark ? '#111722' : '#F5F6F9' }}>
              <CategoryForm
                type={type}
                category={editingCategory ?? undefined}
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
  footer: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
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
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});