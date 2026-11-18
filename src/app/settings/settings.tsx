import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { useBudgetAuth } from '@/components/budget-auth';
import { ScreenBackground } from '@/components/screen-background';
import { StartupEmptyLayout, useStartupScreenLayout } from '@/components/startup-layout';
import { useBudgetSyncStatus, type BudgetSyncPhase } from '@/hooks/use-budget-download-revision';
import { usePrimaryCurrencyPreference } from '@/hooks/use-primary-currency-preference';
import { CURRENCY_SYMBOLS } from '@/constants/currencies';
import { useLanguage } from '@/hooks/use-language';
import { syncPageText } from '@/i18n/sync-page-text';
import type { Language } from '@/i18n/languages';

const languageNames: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  fi: 'Suomi',
  fr: 'Français',
  es: 'Español',
  vi: 'Tiếng Việt',
};

const refreshLabels = {
  en: 'Refresh from server',
  ru: 'Обновить данные с сервера',
  fi: 'Päivitä tiedot palvelimelta',
  fr: 'Actualiser depuis le serveur',
  es: 'Actualizar desde el servidor',
 vi: "Cập nhật từ máy chủ" } satisfies Record<Language, string>;

const syncLabels = {
  en: {
    waiting: 'Waiting to sync', offline: 'Offline', uploading: 'Sending local changes…',
    downloading: 'Checking server changes…', synced: 'Up to date',
    legacy: 'This device’s old data needs reconciliation', pending: 'Local changes are queued',
    conflict: 'Sync conflict. Local changes are saved.',
    retrying: 'Sync interrupted. Retrying automatically.', failed: 'Sync stopped. Local changes are saved.',
  },
  ru: {
    waiting: 'Ожидание синхронизации', offline: 'Нет подключения', uploading: 'Отправка локальных изменений…',
    downloading: 'Проверка изменений на сервере…', synced: 'Данные актуальны',
    legacy: 'Нужно сверить старые данные устройства', pending: 'Локальные изменения в очереди',
    conflict: 'Конфликт синхронизации. Локальные изменения сохранены.',
    retrying: 'Синхронизация прервалась. Будет повтор.', failed: 'Синхронизация остановилась. Локальные изменения сохранены.',
  },
  fi: {
    waiting: 'Odotetaan synkronointia', offline: 'Ei verkkoyhteyttä', uploading: 'Lähetetään paikallisia muutoksia…',
    downloading: 'Tarkistetaan palvelimen muutoksia…', synced: 'Tiedot ovat ajan tasalla',
    legacy: 'Laitteen vanhat tiedot on sovitettava yhteen', pending: 'Paikalliset muutokset ovat jonossa',
    conflict: 'Synkronointiristiriita. Paikalliset muutokset on tallennettu.',
    retrying: 'Synkronointi keskeytyi. Yritetään uudelleen.', failed: 'Synkronointi pysähtyi. Paikalliset muutokset on tallennettu.',
  },
  fr: {
    waiting: "En attente de synchronisation", offline: "Hors ligne", uploading: "Envoi des modifications locales…",
    downloading: "Vérification des modifications du serveur…", synced: "À jour",
    legacy: "Les anciennes données de cet appareil doivent être rapprochées", pending: "Les modifications locales sont en attente",
    conflict: "Conflit de synchronisation. Les modifications locales sont enregistrées.",
    retrying: "Synchronisation interrompue. Nouvelle tentative automatique.", failed: "Synchronisation arrêtée. Les modifications locales sont enregistrées.",
  },
  es: {
    waiting: "Esperando sincronización", offline: "Sin conexión", uploading: "Enviando cambios locales…",
    downloading: "Comprobando cambios del servidor…", synced: "Actualizado",
    legacy: "Los datos antiguos de este dispositivo necesitan conciliarse", pending: "Los cambios locales están en cola",
    conflict: "Conflicto de sincronización. Los cambios locales están guardados.",
    retrying: "Sincronización interrumpida. Se reintentará automáticamente.", failed: "Sincronización detenida. Los cambios locales están guardados.",
  },
 vi: {
    waiting: "Đang chờ đồng bộ", offline: "Ngoại tuyến", uploading: "Đang gửi thay đổi cục bộ…",
    downloading: "Đang kiểm tra thay đổi trên máy chủ…", synced: "Đã cập nhật",
    legacy: "Dữ liệu cũ trên thiết bị này cần được đối soát", pending: "Thay đổi cục bộ đang chờ đồng bộ",
    conflict: "Xung đột đồng bộ. Thay đổi cục bộ đã được lưu.",
    retrying: "Đồng bộ bị gián đoạn. Đang tự động thử lại.", failed: "Đồng bộ đã dừng. Thay đổi cục bộ đã được lưu.",
  } } satisfies Record<Language, Record<BudgetSyncPhase, string>>;

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, busy, error, text, user, needsSignIn, reauthenticate } = useBudgetAuth();
  const { language, locale, translations } = useLanguage();
  const sync = useBudgetSyncStatus();
  const canRefresh = ['waiting', 'synced', 'pending'].includes(sync.phase);
  const syncLabel = needsSignIn ? text.signInAgain : syncLabels[language][sync.phase];
  const checkedAt = sync.checkedAt === null ? null : new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(sync.checkedAt);

  const dark = useColorScheme() === 'dark';
  const { currency: primaryCurrency, status } = usePrimaryCurrencyPreference();
  const preferencesError = status === 'error';
  const markStartupLayout = useStartupScreenLayout('settings', status !== 'loading');

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
        border: '#333F52',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
        border: '#E0E5EE',
      };

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={styles.screen}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/settings/language')}
            style={({ pressed }) => [
              styles.setting,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: palette.text },
              ]}
            >
              {translations.language}
            </Text>

            <Text
              style={[
                styles.value,
                { color: palette.muted },
              ]}
            >
              {languageNames[language]}
            </Text>

            <Text
              accessible={false}
              style={[
                styles.arrow,
                { color: palette.muted },
              ]}
            >
              ›
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push('/settings/primary-currency')
            }
            style={({ pressed }) => [
              styles.setting,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: palette.text },
              ]}
            >
              {translations.primaryCurrency}
            </Text>

            <Text
              style={[
                styles.value,
                { color: palette.muted },
              ]}
            >
              {primaryCurrency
                ? `${primaryCurrency} · ${CURRENCY_SYMBOLS[primaryCurrency]}`
                : preferencesError
                  ? '—'
                  : translations.loading}
            </Text>

            <Text
              accessible={false}
              style={[
                styles.arrow,
                { color: palette.muted },
              ]}
            >
              ›
            </Text>
          </Pressable>

          {preferencesError && (
            <Text style={{ color: palette.text }}>
              {translations.loadPreferencesError}
            </Text>
          )}
          {user && (
            <Text accessibilityLiveRegion="polite" style={{ color: palette.muted }}>
              {syncLabel}{checkedAt ? ` · ${checkedAt}` : ''}
            </Text>
          )}
          {user && !needsSignIn && (
            <Pressable accessibilityRole="button"
              onPress={() => router.push('/settings/synchronization')}
              style={({ pressed }) => [styles.setting, {
                backgroundColor: palette.card, borderColor: palette.border, opacity: pressed ? 0.75 : 1,
              }]}>
              <Text style={[styles.label, { color: palette.text }]}>{syncPageText[language].title}</Text>
              {sync.conflicts.length > 0 && <Text style={[styles.value, { color: palette.muted }]}>
                {sync.conflicts.length}
              </Text>}
              <Text accessible={false} style={[styles.arrow, { color: palette.muted }]}>›</Text>
            </Pressable>
          )}
          {user && !needsSignIn && (
            <AppButton nativeGlass title={refreshLabels[language]} onPress={sync.refresh} disabled={busy || !canRefresh} />
          )}
          {needsSignIn && (
            <AppButton title={text.signInAgain} onPress={reauthenticate} disabled={busy} />
          )}
          {error && <Text style={{ color: palette.text }}>{error}</Text>}
          <View style={styles.signOut}>
            {user && <Text style={{ color: palette.muted }}>{text.signedInAs}: {user.username}</Text>}
            <AppButton nativeGlass title={text.signOut} onPress={signOut} disabled={busy} />
          </View>
        </ScrollView>
        <StartupEmptyLayout onLayout={markStartupLayout} />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  signOut: { marginTop: 'auto', paddingTop: 24, gap: 12 },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 12,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 26,
    lineHeight: 30,
  },
});