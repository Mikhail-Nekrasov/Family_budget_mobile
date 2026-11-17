import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { BudgetEntityConflictComparison } from '@/components/budget-entity-conflict-comparison';
import { EntryConflictComparison } from '@/components/entry-conflict-comparison';
import { PreferenceConflictComparison } from '@/components/preference-conflict-comparison';
import { ScreenBackground } from '@/components/screen-background';
import { useBudgetAuth } from '@/components/budget-auth';
import { useBudgetSyncStatus } from '@/hooks/use-budget-download-revision';
import { useLanguage } from '@/hooks/use-language';
import { syncPageText } from '@/i18n/sync-page-text';
import { syncConflictId } from '@/services/pending-sync-conflicts';

export default function SynchronizationScreen() {
  const { user } = useBudgetAuth();
  const { conflicts, resolveConflict } = useBudgetSyncStatus();
  const { language, locale } = useLanguage();
  const text = syncPageText[language];
  const dark = useColorScheme() === 'dark';
  const color = dark ? '#F0F3FA' : '#192238';
  const current = conflicts[0];

  return (
    <ScreenBackground>
      <Stack.Screen options={{ title: text.title, headerBackButtonDisplayMode: 'minimal' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.count, {
          backgroundColor: dark ? '#1C2432' : '#FFFFFF', borderColor: dark ? '#333F52' : '#E0E5EE',
        }]}>
          <Text accessibilityRole="header" style={[styles.heading, { flex: 1, color }]}>{text.count}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.heading, { color }]}>{conflicts.length}</Text>
        </View>
        {!current && <Text style={{ color }}>{text.clear}</Text>}
        {current && 'kind' in current && (
          <PreferenceConflictComparison
            key={syncConflictId(current)} conflict={current} color={color}
            onResolve={(choice) => resolveConflict(current, choice)}
          />
        )}
        {current && 'entity' in current && (
          <BudgetEntityConflictComparison
            key={syncConflictId(current)}
            conflict={current} language={language} locale={locale} color={color}
            onResolve={(choice) => resolveConflict(current, choice)}
          />
        )}
        {current && !('entity' in current) && !('kind' in current) && user && (
          <EntryConflictComparison
            key={syncConflictId(current)}
            conflict={current} username={user.username} language={language} locale={locale} color={color}
            onResolve={(choice) => resolveConflict(current, choice)}
          />
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56,
    paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 16 },
  heading: { fontSize: 18, fontWeight: '600' },
});
