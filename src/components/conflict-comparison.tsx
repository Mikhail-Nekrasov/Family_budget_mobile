import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { AppButton } from '@/components/app-button';
import type { Language } from '@/i18n/languages';

const labels = {
  en: { local: 'On this device', server: 'On the server', chooseLocal: 'Local version',
    chooseServer: 'Server version', choose: 'Choose version to apply', failed: 'Could not save your choice. Please try again.' },
  ru: { local: 'На этом устройстве', server: 'На сервере', chooseLocal: 'Локальная',
    chooseServer: 'Серверная', choose: 'Выберите версию', failed: 'Не удалось сохранить выбор. Попробуйте ещё раз.' },
  fi: { local: 'Tällä laitteella', server: 'Palvelimella', chooseLocal: 'Paikallinen versio',
    chooseServer: 'Palvelimen versio', choose: 'Valitse käytettävä versio', failed: 'Valintaa ei voitu tallentaa. Yritä uudelleen.' },
  fr: { local: "Sur cet appareil", server: "Sur le serveur", chooseLocal: "Version locale",
    chooseServer: "Version du serveur", choose: "Choisissez la version à appliquer", failed: "Impossible d’enregistrer votre choix. Réessayez." },
  es: { local: "En este dispositivo", server: "En el servidor", chooseLocal: "Versión local",
    chooseServer: "Versión del servidor", choose: "Elige la versión que quieres aplicar", failed: "No se pudo guardar tu elección. Inténtalo de nuevo." },
 vi: { local: "Trên thiết bị này", server: "Trên máy chủ", chooseLocal: "Bản cục bộ",
    chooseServer: "Bản máy chủ", choose: "Chọn phiên bản cần áp dụng", failed: "Không thể lưu lựa chọn. Hãy thử lại." } };

export type ConflictComparisonRow = { label: string; local: ReactNode; server: ReactNode };

export function ConflictComparison({ language, color, title, rows, localInfo, serverInfo,
  canKeepLocal = true, onResolve }: {
  language: Language; color: string; title?: string; rows: ConflictComparisonRow[];
  localInfo?: string; serverInfo?: string; canKeepLocal?: boolean;
  onResolve: (choice: 'local' | 'server') => Promise<void>;
}) {
  const text = labels[language];
  const dark = useColorScheme() === 'dark';
  const [choice, setChoice] = useState<'local' | 'server' | null>(null);
  const [failed, setFailed] = useState(false);
  const saving = useRef(false);
  async function resolve(next: 'local' | 'server') {
    if (saving.current) return;
    saving.current = true;
    setChoice(next);
    setFailed(false);
    try { await onResolve(next); } catch { setFailed(true); } finally {
      saving.current = false;
      setChoice(null);
    }
  }
  const card = { backgroundColor: dark ? '#1C2432' : '#FFFFFF', borderColor: dark ? '#333F52' : '#E0E5EE' };
  return (
    <View style={styles.container}>
      {title && <Text style={[styles.title, { color }]}>{title}</Text>}
      <View>
        <View style={styles.row}>
          {(['local', 'server'] as const).map((side) => (
            <View key={side} style={[styles.cell, styles.top, card]}>
              <Text style={[styles.title, { color }]}>{text[side]}</Text>
              {(side === 'local' ? localInfo : serverInfo) && (
                <Text style={{ color }}>{side === 'local' ? localInfo : serverInfo}</Text>
              )}
            </View>
          ))}
        </View>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            {(['local', 'server'] as const).map((side) => (
              <View key={side} style={[styles.cell, card]}>
                <Text style={[styles.label, { color }]}>{row.label}</Text>
                {typeof row[side] === 'string' || typeof row[side] === 'number'
                  ? <Text selectable style={{ color }}>{row[side]}</Text> : row[side]}
              </View>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          {(['local', 'server'] as const).map((side) => (
            <View key={side} style={[styles.cell, styles.bottom, card]} />
          ))}
        </View>
      </View>
      <Text style={[styles.title, styles.choose, { color }]}>{text.choose}</Text>
      <View style={styles.row}>
        {(['local', 'server'] as const).map((side) => (
          <View key={side} style={styles.action}>
            {(side === 'server' || canKeepLocal) && <AppButton nativeGlass compact keepTitleCentered
              title={side === 'local' ? text.chooseLocal : text.chooseServer}
              disabled={choice !== null} loading={choice === side} onPress={() => void resolve(side)} />}
          </View>
        ))}
      </View>
      {failed && <Text accessibilityLiveRegion="polite" style={{ color }}>{text.failed}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  cell: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 10,
    borderLeftWidth: 1, borderRightWidth: 1, gap: 8 },
  top: { borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  bottom: { paddingVertical: 4, borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  action: { flex: 1, minWidth: 0 },
  choose: { textAlign: 'center', marginTop: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  label: { fontWeight: '600' },
});
