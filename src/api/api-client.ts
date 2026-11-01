import { fetch } from 'expo/fetch';

import { ApiError } from '@/api/api-error';
import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/api';

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
};

function getErrorMessage(data: unknown): string | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message;
  }

  return null;
}

export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  if (!path.startsWith('/api/')) {
    throw new Error('API path must start with /api/');
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (
    options.body !== undefined &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: options.method ?? 'GET',
        headers,
        body: options.body,
        credentials: 'include',
        signal: controller.signal,
      },
    );

    const text = await response.text();
    let data: unknown = null;

    if (text.length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        if (response.ok) {
          throw new Error('Server returned invalid JSON');
        }
      }
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        getErrorMessage(data) ??
          `Request failed: HTTP ${response.status}`,
      );
    }

    return data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}