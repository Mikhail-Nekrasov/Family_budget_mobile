import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { apiRequest } from '@/api/api-client';
import { ApiError } from '@/api/api-error';
import { API_BASE_URL } from '@/config/api';

const scope = String(API_BASE_URL).split('').map(
  (character) => character.charCodeAt(0).toString(16).padStart(4, '0'),
).join('');
const key = `budget-profile.v1.${scope}`;
const legacyKey = `mobile-refresh.${scope}`;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export type AuthUser = { userId: string; username: string };
export type LocalProfile = { user: AuthUser; token: string | null };
type Vault = { active: LocalProfile | null; pending: string[] };

function parseUser(data: unknown): AuthUser {
  if (typeof data !== 'object' || data === null ||
      !('userId' in data) || typeof data.userId !== 'string' || !/^[1-9][0-9]*$/.test(data.userId) ||
      !('username' in data) || typeof data.username !== 'string') {
    throw new Error('Invalid user response');
  }
  return { userId: data.userId, username: data.username };
}

async function readVault(): Promise<Vault> {
  const saved = await SecureStore.getItemAsync(key, options);
  if (!saved) return { active: null, pending: [] };
  const vault = JSON.parse(saved) as Vault;
  if (vault.active) parseUser(vault.active.user);
  return vault;
}

async function saveVault(vault: Vault) {
  await SecureStore.setItemAsync(key, JSON.stringify(vault), options);
}

function requireSecureApi() {
  if (!API_BASE_URL.startsWith('https://')) throw new Error('Sign-in requires HTTPS');
}

async function csrfHeaders(): Promise<Record<string, string>> {
  const data = await apiRequest('/api/auth/csrf');
  if (typeof data !== 'object' || data === null ||
      !('headerName' in data) || typeof data.headerName !== 'string' ||
      !('token' in data) || typeof data.token !== 'string') {
    throw new Error('Invalid CSRF response');
  }
  return { [data.headerName]: data.token };
}

export async function registerUser(input: {
  username: string; password: string; passwordConfirm: string;
}): Promise<void> {
  requireSecureApi();
  await apiRequest('/api/auth/register', {
    method: 'POST',
    headers: await csrfHeaders(),
    body: JSON.stringify(input),
  });
}

export async function readLocalProfile(): Promise<LocalProfile | null> {
  return (await readVault()).active;
}

async function currentUser() {
  return parseUser(await apiRequest('/api/auth/me'));
}

let vaultTail: Promise<unknown> = Promise.resolve();

function updateVault(update: (vault: Vault) => Vault): Promise<void> {
  const next = vaultTail.then(async () => saveVault(update(await readVault())));
  vaultTail = next.catch(() => undefined);
  return next;
}

export async function restoreProfile(): Promise<AuthUser | null> {
  const vault = await readVault();
  if (!vault.active?.token) return null;
  requireSecureApi();
  try {
    await apiRequest('/api/auth/mobile/restore', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: vault.active.token }),
    });
    const user = await currentUser();
    if (user.userId !== vault.active.user.userId) {
      await clearMatchingProfileToken(vault.active);
      return null;
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearMatchingProfileToken(vault.active);
      return null;
    }
    throw error;
  }
}

function clearMatchingProfileToken(profile: LocalProfile) {
  return updateVault((vault) => {
    if (vault.active?.user.userId !== profile.user.userId ||
        vault.active?.token !== profile.token) return vault;
    return { ...vault, active: { ...vault.active, token: null } };
  });
}

export async function logIn(username: string, password: string): Promise<AuthUser> {
  requireSecureApi();
  await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: {
      ...await csrfHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ username, password }).toString(),
  });
  const user = await currentUser();
  const vault = await readVault();
  if (vault.active && user.userId !== vault.active.user.userId) {
    throw new Error('Sign in with the same profile or sign out first');
  }

  const data = await apiRequest('/api/auth/mobile/token', {
    method: 'POST',
    headers: await csrfHeaders(),
  });
  if (typeof data !== 'object' || data === null ||
      !('refreshToken' in data) || typeof data.refreshToken !== 'string') {
    throw new Error('Invalid mobile token response');
  }
  const legacy = await SecureStore.getItemAsync(legacyKey, options);
  const refreshToken = data.refreshToken;
  await updateVault((latest) => ({
    active: { user, token: refreshToken },
    pending: [...new Set([...latest.pending, latest.active?.token, legacy].filter(
      (token): token is string => Boolean(token) && token !== refreshToken,
    ))],
  }));
  await SecureStore.deleteItemAsync(legacyKey, options).catch(() => undefined);
  return user;
}

export async function lockLocalProfile(): Promise<void> {
  await updateVault((vault) => {
    const token = vault.active?.token;
    return {
      active: null,
      pending: token ? [...new Set([...vault.pending, token])] : vault.pending,
    };
  });
}

export async function flushPendingRevocations(): Promise<void> {
  const vault = await readVault();
  if (vault.pending.length === 0) return;
  requireSecureApi();
  for (const refreshToken of vault.pending) {
    await apiRequest('/api/auth/mobile/revoke', {
      method: 'POST',
      credentials: 'omit',
      body: JSON.stringify({ refreshToken }),
    });
    await updateVault((latest) => ({ ...latest, pending: latest.pending.filter((token) => token !== refreshToken) }));
  }
}

export async function closeServerSession(): Promise<void> {
  requireSecureApi();
  await apiRequest('/api/auth/logout', { method: 'POST', headers: await csrfHeaders() });
}

export async function profileDatabaseName(userId: string): Promise<string> {
  const hostKey = await digestStringAsync(CryptoDigestAlgorithm.SHA256, API_BASE_URL);
  return `family-budget-${hostKey}-user-${userId}.db`;
}
