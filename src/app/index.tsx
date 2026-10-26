import { CategoryChart, type ChartSegment } from '@/components/category-chart';
import { HomeFilters } from '@/components/home-filters';
import { accounts, categories, demoEntries, formatAmount, type EntryType } from '@/data/home-demo';
import { DrawerToggleButton } from 'expo-router/drawer';
import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

function AccountIcon({ iconKey, color }: { iconKey: 'cash' | 'card'; color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden>
    <Rect x={2} y={5} width={20} height={14} rx={3} fill="none" stroke={color} strokeWidth={1.7} />
    {iconKey === 'card'
      ? <Path d="M2 10H22 M6 15H10" fill="none" stroke={color} strokeWidth={1.7} />
      : <Circle cx={12} cy={12} r={3} fill="none" stroke={color} strokeWidth={1.7} />}
  </Svg>;
}

export default function HomeScreen() {
  const [type, setType] = useState<EntryType>('EXPENSE');
  const [period, setPeriod] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const palette = dark
    ? { background: '#111722', card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52', accent: '#A0B8FF', icon: '#29354B' }
    : { background: '#F5F6F9', card: '#FFFFFF', text: '#192238', muted: '#6C7890', line: '#E0E5EE', accent: '#365BBC', icon: '#EAF0FC' };

  const monthKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(period);
  const entries = demoEntries.filter((entry) => entry.type === type && entry.month === monthKey
    && (accountIds.length === 0 || accountIds.includes(entry.accountId))
    && (categoryIds.length === 0 || categoryIds.includes(entry.categoryId)));
  const segments: ChartSegment[] = Object.entries(categories).map(([id, category]) => ({
    id, name: category.name, color: category.color,
    amountCents: entries.filter((entry) => entry.categoryId === id).reduce((sum, entry) => sum + entry.amountCents, 0),
  })).filter((segment) => segment.amountCents > 0);

  function changeMonth(direction: number) {
    setPeriod((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <SafeAreaView 
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      {!dark && (
        <Image
          source={require('../../assets/images/bears-background.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
          accessible={false}
        />
      )}
      <View style={[styles.tabs, { borderBottomColor: palette.line }]} accessibilityRole="tablist">
        <DrawerToggleButton tintColor={palette.text} />
        {(['EXPENSE', 'INCOME'] as const).map((value) => <Pressable key={value}
          accessibilityRole="tab" accessibilityState={{ selected: type === value }} onPress={() => { setType(value); setCategoryIds([]); }}
          style={[styles.tab, { borderBottomColor: type === value ? palette.accent : 'transparent' }]}>
          <Text style={[styles.tabText, { color: type === value ? palette.accent : palette.muted }]}>
            {value === 'EXPENSE' ? 'Расходы' : 'Доходы'}
          </Text>
        </Pressable>)}
      </View>

      <FlatList data={entries} keyExtractor={(entry) => entry.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={<View style={styles.header}>
          <View style={styles.period}>
            <Pressable onPress={() => changeMonth(-1)} accessibilityRole="button" accessibilityLabel="Предыдущий месяц" style={styles.arrow}>
              <Text style={[styles.arrowText, { color: palette.text }]}>‹</Text>
            </Pressable>
            <Text style={[styles.periodText, { color: palette.text }]}>{monthLabel}</Text>
            <Pressable onPress={() => changeMonth(1)} accessibilityRole="button" accessibilityLabel="Следующий месяц" style={styles.arrow}>
              <Text style={[styles.arrowText, { color: palette.text }]}>›</Text>
            </Pressable>
          </View>
          <View style={styles.chartPanel}>
          <CategoryChart segments={segments} label={type === 'EXPENSE' ? 'Всего расходов' : 'Всего доходов'}
            currencySymbol="€" textColor={palette.text} mutedColor={palette.muted} trackColor={palette.line} />
          <Pressable accessibilityRole="button" accessibilityLabel={type === 'EXPENSE' ? 'Добавить расход' : 'Добавить доход'}
            onPress={() => Alert.alert(type === 'EXPENSE' ? 'Новый расход' : 'Новый доход', 'Форму создания подключим следующим этапом.')}
            style={[styles.addButton, { backgroundColor: palette.accent }]}>
            <Text style={[styles.addText, { color: palette.background }]}>＋</Text>
          </Pressable>
          </View>
          <HomeFilters accountIds={accountIds} categoryIds={categoryIds}
            onAccountsChange={setAccountIds} onCategoriesChange={setCategoryIds}
            categoryOptions={Object.entries(categories)
              .filter(([id]) => type === 'EXPENSE'
                ? ['groceries', 'housing', 'transport'].includes(id)
                : ['salary', 'otherIncome'].includes(id))
              .map(([id, category]) => ({ id, name: category.name }))}
            palette={palette} />
        </View>}
        ListEmptyComponent={<Text style={[styles.empty, { color: palette.muted }]}>За этот месяц операций нет</Text>}
        renderItem={({ item }) => {
          const account = accounts[item.accountId];
          return <Pressable accessibilityRole="button" accessibilityLabel={`Открыть операцию: ${item.title}`}
            onPress={() => Alert.alert(item.title, `Операция ${item.id}. Форму редактирования подключим следующим этапом.`)}
            style={[styles.entry, { backgroundColor: palette.card }]}>
            <View accessible accessibilityLabel={account.name} style={[styles.accountIcon, { backgroundColor: palette.icon }]}>
              <AccountIcon iconKey={account.iconKey} color={palette.accent} />
            </View>
            <Text numberOfLines={2} style={[styles.entryTitle, { color: palette.text }]}>{item.title}</Text>
            <View style={styles.amountGroup}>
              <Text style={[styles.amount, { color: type === 'EXPENSE' ? palette.text : dark ? '#7BD4B0' : '#217E5D' }]}>
                {formatAmount(item.amountCents)}
              </Text>
              <Text accessibilityLabel={account.currencyCode} style={[styles.currency, { color: palette.muted }]}>{account.currencySymbol}</Text>
            </View>
          </Pressable>;
        }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, alignItems: 'center', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3
  },
  tabText: { fontSize: 20, fontWeight: '600' },
  content: {
    paddingHorizontal: 20,
    gap: 10
  },
  chartPanel: {
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 2
  },
  addButton: { position: 'absolute', right: 0, bottom: 8, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 30, lineHeight: 36 },
  header: { paddingBottom: 12 },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
  periodText: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, minHeight: 76 },
  accountIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  entryTitle: { flex: 1, fontSize: 15, fontWeight: '500' },
  amountGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  currency: { fontSize: 16 },
  empty: { textAlign: 'center', paddingVertical: 28, fontSize: 15 },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
