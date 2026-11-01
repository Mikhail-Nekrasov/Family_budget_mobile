const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (
  configuredUrl ||
  'https://morning-shelf-60131-d074f8efd00d.herokuapp.com'
).replace(/\/+$/, '');

export const API_TIMEOUT_MS = 20_000;