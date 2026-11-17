
import { ConflictComparison } from '@/components/conflict-comparison';
import { ConflictIconPreview } from '@/components/conflict-icon-preview';
import { useLanguage } from '@/hooks/use-language';
import type { PreferenceConflict } from '@/services/budget-preferences';

const labels = {
  en: { account: 'Account order', EXPENSE: 'Expense category order', INCOME: 'Income category order',
    color: 'Icon color', hidden: 'Account visibility', icon: 'Category icon', local: 'This device',
    server: 'Server', none: 'No color', yes: 'Hidden', no: 'Shown', error: 'Could not save your choice.' },
  ru: { account: 'Порядок счетов', EXPENSE: 'Порядок категорий расходов', INCOME: 'Порядок категорий доходов',
    color: 'Цвет иконки', hidden: 'Видимость счёта', icon: 'Иконка категории', local: 'Это устройство',
    server: 'Сервер', none: 'Без цвета', yes: 'Скрыт', no: 'Показан', error: 'Не удалось сохранить выбор.' },
  fi: { account: 'Tilien järjestys', EXPENSE: 'Menoluokkien järjestys', INCOME: 'Tuloluokkien järjestys',
    color: 'Kuvakkeen väri', hidden: 'Tilin näkyvyys', icon: 'Luokan kuvake', local: 'Tämä laite',
    server: 'Palvelin', none: 'Ei väriä', yes: 'Piilotettu', no: 'Näkyvissä', error: 'Valintaa ei voitu tallentaa.' },
} as const;

export function PreferenceConflictComparison({ conflict, color, onResolve }: {
  conflict: PreferenceConflict;
  color: string;
  onResolve: (choice: 'local' | 'server') => Promise<void>;
}) {
  const { language } = useLanguage();
  const text = labels[language];
  const entities = {
    en: { account: 'Account', category: 'Category' },
    ru: { account: 'Счёт', category: 'Категория' },
    fi: { account: 'Tili', category: 'Luokka' },
  }[language];
  const parts = conflict.key.split(':');
  const kind = (parts[0] === 'order' ? parts[1] : parts[2]) as
    'account' | 'EXPENSE' | 'INCOME' | 'color' | 'hidden' | 'icon';

  function display(value: PreferenceConflict['local']) {
    if (Array.isArray(value)) return value.map((id, index) => `${index + 1}. ${conflict.names[id] ?? id}`).join('\n');
    if (value === null) return text.none;
    if (typeof value === 'boolean') return value ? text.yes : text.no;
    return value;
  }

  function preview(value: PreferenceConflict['local']) {
    if (kind === 'color' || kind === 'icon') {
      return <ConflictIconPreview kind={parts[0] === 'account' ? 'account' : 'category'}
        iconKey={kind === 'icon' && typeof value === 'string' ? value : undefined}
        iconColor={kind === 'color' ? value as string | null : undefined} color={color} />;
    }
    return display(value);
  }

  return <ConflictComparison language={language} color={color}
    title={conflict.name ? `${entities[parts[0] as keyof typeof entities]} ${conflict.name} · ${text[kind]}` : text[kind]}
    rows={[{ label: text[kind], local: preview(conflict.local), server: preview(conflict.server) }]}
    onResolve={onResolve} />;
}
