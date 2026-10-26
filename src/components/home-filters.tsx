import { accounts } from '@/data/home-demo';
import { useLanguage } from '@/hooks/use-language';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Option = { id: string; name: string };
type Props = {
  accountIds: string[];
  categoryIds: string[];
  onAccountsChange: (ids: string[]) => void;
  onCategoriesChange: (ids: string[]) => void;
  categoryOptions: Option[];
  palette: { card: string; text: string; muted: string; accent: string; line: string };
};

export function HomeFilters({ accountIds, categoryIds, onAccountsChange, onCategoriesChange, categoryOptions, palette }: Props) {
  const { translations } = useLanguage();
  const [active, setActive] = useState<'accounts' | 'categories' | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const options = active === 'accounts'
    ? Object.entries(accounts).map(([id, account]) => ({ id, name: account.name }))
    : categoryOptions;

  function openFilter(kind: 'accounts' | 'categories') {
    setDraft([...(kind === 'accounts' ? accountIds : categoryIds)]);
    setActive(kind);
  }

  function toggle(id: string) {
    setDraft((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  function apply() {
    if (active === 'accounts') onAccountsChange(draft);
    if (active === 'categories') onCategoriesChange(draft);
    setActive(null);
  }

  return (
    <>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => openFilter('accounts')}
          style={[styles.chip, { backgroundColor: palette.card, borderColor: accountIds.length ? palette.accent : palette.line }]}>
          <Text style={{ color: palette.text }}>
            {accountIds.length
              ? translations.selectedAccounts(accountIds.length)
              : translations.allAccounts} ▾
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => openFilter('categories')}
          style={[styles.chip, { backgroundColor: palette.card, borderColor: categoryIds.length ? palette.accent : palette.line }]}>
          <Text style={{ color: palette.text }}>
            {categoryIds.length
              ? translations.selectedCategories(categoryIds.length)
              : translations.allCategories} ▾
          </Text>
        </Pressable>
      </View>
      {(accountIds.length > 0 || categoryIds.length > 0) && (
        <Pressable accessibilityRole="button" style={styles.reset} onPress={() => { onAccountsChange([]); onCategoriesChange([]); }}>
          <Text style={{ color: palette.accent }}>{translations.resetFilters}</Text>
        </Pressable>
      )}
      <Modal visible={active !== null} transparent animationType="slide" onRequestClose={() => setActive(null)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={translations.closeFilter} onPress={() => setActive(null)} />
          <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: palette.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.heading}>
              <Text style={[styles.title, { color: palette.text }]}>
                {active === 'accounts'
                  ? translations.accounts
                  : translations.categories}
              </Text>
              <Pressable accessibilityRole="button" style={styles.close} onPress={() => setActive(null)}>
                <Text style={{ color: palette.accent }}>{translations.cancel}</Text>
              </Pressable>
            </View>
            <Text style={{ color: palette.muted }}>{translations.filterHint}</Text>
            <ScrollView style={styles.options}>
              {options.map((option) => (
                <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: draft.includes(option.id) }}
                  onPress={() => toggle(option.id)} style={styles.option}>
                  <Text style={{ color: palette.text, flex: 1 }}>{option.name}</Text>
                  <Text style={{ color: palette.accent, fontSize: 22 }}>{draft.includes(option.id) ? '☑' : '□'}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={apply} style={[styles.apply, { borderColor: palette.accent }]}>
              <Text style={{ color: palette.accent, fontWeight: '600' }}>{translations.apply}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8
  },
  chip: { flex: 1, borderWidth: 1, borderRadius: 20, minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  reset: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: { maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '600' },
  close: { minHeight: 44, justifyContent: 'center' },
  options: { marginVertical: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  apply: { minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
