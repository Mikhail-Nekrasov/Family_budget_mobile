import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  closeServerSession, ensureProfileSession, flushPendingRevocations, lockLocalProfile, logIn, openBudgetSession,
  profileDatabaseName, readLocalProfile, registerUser, type AuthUser,
} from '@/api/api-auth';
import { ApiError } from '@/api/api-error';
import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';

const messages = {
  en: {
    signIn: 'Sign in', signOut: 'Sign out', register: 'Create an account', username: 'Username',
    password: 'Password', confirm: 'Confirm password', retry: 'Try again', cancel: 'Cancel',
    signedInAs: 'Signed in as', signInAgain: 'Sign in again to reconnect', offline: 'Connect to the internet to sign in.',
    failed: 'Could not complete the request. Try again.', credentials: 'Incorrect username or password.',
    mismatch: 'The passwords do not match.', registered: 'Account created. Sign in to continue.',
    sameProfile: 'Sign in with your current username, or sign out to switch accounts.',
    web: 'Open Family Budget on iOS or Android to sign in.',
    storageError: 'Could not open the local budget.',
  },
  ru: {
    signIn: 'Войти', signOut: 'Выйти', register: 'Создать аккаунт', username: 'Имя пользователя',
    password: 'Пароль', confirm: 'Повтори пароль', retry: 'Повторить', cancel: 'Отмена',
    signedInAs: 'Вы вошли как', signInAgain: 'Войти снова для подключения', offline: 'Для входа подключись к интернету.',
    failed: 'Не удалось выполнить запрос. Попробуй ещё раз.', credentials: 'Неверное имя пользователя или пароль.',
    mismatch: 'Пароли не совпадают.', registered: 'Аккаунт создан. Войди, чтобы продолжить.',
    sameProfile: 'Войди под текущим именем пользователя или выйди, чтобы сменить аккаунт.',
    web: 'Для входа открой Family Budget на iOS или Android.',
    storageError: 'Не удалось открыть локальный бюджет.',
  },
  fi: {
    signIn: 'Kirjaudu', signOut: 'Kirjaudu ulos', register: 'Luo tili', username: 'Käyttäjätunnus',
    password: 'Salasana', confirm: 'Vahvista salasana', retry: 'Yritä uudelleen', cancel: 'Peruuta',
    signedInAs: 'Kirjautunut käyttäjä', signInAgain: 'Kirjaudu uudelleen', offline: 'Kirjautuminen vaatii internetyhteyden.',
    failed: 'Pyyntö epäonnistui. Yritä uudelleen.', credentials: 'Virheellinen käyttäjätunnus tai salasana.',
    mismatch: 'Salasanat eivät täsmää.', registered: 'Tili luotiin. Kirjaudu jatkaaksesi.',
    sameProfile: 'Kirjaudu nykyisellä tunnuksella tai vaihda tiliä kirjautumalla ulos.',
    web: 'Kirjaudu Family Budget -sovellukseen iOS- tai Android-laitteella.',
    storageError: 'Paikallista budjettia ei voitu avata.',
  },
};

type Texts = typeof messages.en;
type Profile = { user: AuthUser; databaseName: string };
type Auth = {
  text: Texts;
  user: AuthUser | null;
  databaseName: string | null;
  busy: boolean;
  error: string | null;
  needsSignIn: boolean;
  signOut: () => void;
  reauthenticate: () => void;
  withBudgetSession: <T>(userId: string, work: (headers: Record<string, string>) => Promise<T>) => Promise<T>;
};

const Context = createContext<Auth | null>(null);

export function useBudgetAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('BudgetAuthProvider is missing');
  return auth;
}

export function BudgetAuthProvider({ children }: PropsWithChildren) {
  const { language } = useLanguage();
  const text = messages[language];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [boot, setBoot] = useState<'loading' | 'failed' | 'ready'>('loading');
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionWork = useRef<Promise<void>>(Promise.resolve());
  const foreground = useRef(false);
  const background = useRef(false);
  const generation = useRef(0);

  const loadProfile = useCallback(async () => {
    try {
      const local = Platform.OS === 'web' ? null : await readLocalProfile();
      if (local) {
        setProfile({ user: local.user, databaseName: await profileDatabaseName(local.user.userId) });
        setNeedsSignIn(local.token === null);
      }
      setBoot('ready');
    } catch {
      setBoot('failed');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  useEffect(() => {
    if (boot !== 'ready' || Platform.OS === 'web') return;
    let active = true;
    async function reconnect() {
      if (!active || foreground.current || background.current) return;
      background.current = true;
      const revision = generation.current;
      sessionWork.current = (async () => {
        try {
          const local = await readLocalProfile();
          if (revision !== generation.current) return;
          if (local?.token) {
            const user = await ensureProfileSession(local.user.userId);
            if (active && revision === generation.current) setNeedsSignIn(!user);
          }
        } catch {
          // Offline and temporary server failures leave the local budget available.
        }
        try {
          await flushPendingRevocations();
        } catch {
          // Keep the queued revocations for the next connection.
        }
      })().finally(() => { background.current = false; });
    }

    void getNetworkStateAsync().then((state) => {
      if (state.isConnected !== false && state.isInternetReachable !== false) void reconnect();
    }).catch(() => undefined);
    const network = addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void reconnect();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconnect();
    });
    return () => {
      active = false;
      network.remove();
      app.remove();
    };
  }, [boot]);

  async function submit(mode: 'login' | 'register', username: string, password: string, confirmation: string) {
    if (foreground.current) return false;
    if (mode === 'register' && password !== confirmation) {
      setError(text.mismatch);
      return false;
    }
    if (profile && profile.user.username !== username) {
      setError(text.sameProfile);
      return false;
    }

    foreground.current = true;
    setBusy(true);
    setError(null);
    try {
      await sessionWork.current;
      const state = await getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false) {
        setError(text.offline);
        return false;
      }
      if (mode === 'register') {
        await registerUser({ username, password, passwordConfirm: confirmation });
      } else {
        const user = await logIn(username, password);
        setProfile({ user, databaseName: await profileDatabaseName(user.userId) });
        setReauth(false);
        setNeedsSignIn(false);
      }
      void flushPendingRevocations().catch(() => undefined);
      return true;
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 401
        ? text.credentials
        : failure instanceof ApiError && failure.status === 400
          ? failure.message
          : text.failed);
      return false;
    } finally {
      foreground.current = false;
      setBusy(false);
    }
  }

  const profileUserId = profile?.user.userId;
  const withBudgetSession = useCallback(async function withBudgetSession<T>(
    userId: string,
    work: (headers: Record<string, string>) => Promise<T>,
  ): Promise<T> {
    if (foreground.current || profileUserId !== userId) {
      throw new Error('Budget profile is busy or has changed');
    }
    foreground.current = true;
    setBusy(true);

    try {
      await sessionWork.current;
      const headers = await openBudgetSession(userId);
      setNeedsSignIn(false);
      return await work(headers);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNeedsSignIn(true);
      }
      throw error;
    } finally {
      foreground.current = false;
      setBusy(false);
    }
  }, [profileUserId]);

  async function signOut() {
    if (foreground.current) return;
    foreground.current = true;
    generation.current += 1;
    setBusy(true);
    setError(null);
    try {
      await lockLocalProfile();
      setProfile(null);
      setReauth(false);
      setNeedsSignIn(false);
      // Do not block local sign-out on network requests. Serialize cookie changes with the next login.
      sessionWork.current = sessionWork.current.then(async () => {
        const state = await getNetworkStateAsync();
        if (state.isConnected === false || state.isInternetReachable === false) return;
        await Promise.allSettled([flushPendingRevocations(), closeServerSession()]);
      }).catch(() => undefined);
    } catch {
      setError(text.failed);
    } finally {
      foreground.current = false;
      setBusy(false);
    }
  }

  const auth: Auth = {
    text, user: profile?.user ?? null, databaseName: profile?.databaseName ?? null, error, busy, needsSignIn,
    signOut: () => void signOut(),
    withBudgetSession,
    reauthenticate: () => { setError(null); setReauth(true); },
  };

  return (
    <Context.Provider value={auth}>
      {boot === 'ready' && profile && !reauth
        ? children
        : <AuthScreen
            boot={boot}
            retry={() => { setBoot('loading'); void loadProfile(); }}
            fixedUsername={reauth ? profile?.user.username : undefined}
            cancel={reauth ? () => { setError(null); setReauth(false); } : undefined}
            submit={submit}
          />}
    </Context.Provider>
  );
}

function AuthScreen({ boot, retry, fixedUsername, cancel, submit }: {
  boot: 'loading' | 'failed' | 'ready';
  retry: () => void;
  fixedUsername?: string;
  cancel?: () => void;
  submit: (mode: 'login' | 'register', username: string, password: string, confirmation: string) => Promise<boolean>;
}) {
  const { text, busy, error } = useBudgetAuth();
  const dark = useColorScheme() === 'dark';
  const color = dark ? '#F0F3FA' : '#192238';
  const borderColor = dark ? '#53617A' : '#8D9AB1';
  const [register, setRegister] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [username, setUsername] = useState(fixedUsername ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (boot !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [boot]);

  async function send() {
    const ok = await submit(register ? 'register' : 'login', username.trim(), password, confirmation);
    if (ok && register) {
      setRegister(false);
      setRegistered(true);
      setPassword('');
      setConfirmation('');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color }]}>Family Budget</Text>
            {boot === 'loading' ? <ActivityIndicator color={color} /> : boot === 'failed' ? (
              <>
                <Text style={{ color }}>{text.storageError}</Text>
                <AppButton title={text.retry} onPress={retry} />
              </>
            ) : Platform.OS === 'web' ? <Text style={{ color }}>{text.web}</Text> : (
              <>
                {registered && <Text style={{ color }}>{text.registered}</Text>}
                <TextInput accessibilityLabel={text.username} placeholder={text.username} placeholderTextColor={borderColor}
                  autoCapitalize="none" autoCorrect={false} editable={!busy && fixedUsername === undefined}
                  value={username} onChangeText={setUsername} style={[styles.input, { color, borderColor }]} />
                <TextInput accessibilityLabel={text.password} placeholder={text.password} placeholderTextColor={borderColor}
                  autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy}
                  value={password} onChangeText={setPassword} style={[styles.input, { color, borderColor }]} />
                {register && <TextInput accessibilityLabel={text.confirm} placeholder={text.confirm} placeholderTextColor={borderColor}
                  autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy}
                  value={confirmation} onChangeText={setConfirmation} style={[styles.input, { color, borderColor }]} />}
                {error && <Text accessibilityLiveRegion="polite" style={{ color }}>{error}</Text>}
                <AppButton title={register ? text.register : text.signIn} loading={busy}
                  disabled={!username.trim() || !password || (register && !confirmation)} onPress={() => void send()} />
                {cancel ? <AppButton title={text.cancel} onPress={cancel} disabled={busy} /> : (
                  <AppButton title={register ? text.signIn : text.register} disabled={busy} onPress={() => {
                    setRegister(!register);
                    setRegistered(false);
                    setPassword('');
                    setConfirmation('');
                  }} />
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: '700' },
  input: { minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
});
