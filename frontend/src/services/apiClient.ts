import { authService } from './authService';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const buildUrl = (path: string) => {
  if (!API_BASE || /^https?:\/\//.test(path)) {
    return path;
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
};

const getStoredToken = () =>
  authService.getSession()?.token || authService.getAdminSession()?.token || null;

export const hasBackendJwt = () => {
  const token = getStoredToken();
  return Boolean(token && token.split('.').length === 3);
};

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = await response.clone().json();
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return { message: payload.message, payload };
    }
    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return { message: payload.error, payload };
    }
    return { message: response.statusText || 'Request failed', payload };
  } catch {
    const text = await response.text();
    return { message: text || response.statusText || 'Request failed', payload: text };
  }
};

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
): Promise<T> => {
  const headers = new Headers(init.headers || {});
  const needsJson = init.body !== undefined && !headers.has('Content-Type');

  if (needsJson) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth) {
    if (!hasBackendJwt()) {
      throw new ApiError('Current session is not using a backend JWT.', 401);
    }
    headers.set('Authorization', `Bearer ${getStoredToken()}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (options.auth && response.status === 401) {
      authService.logout();
      authService.adminLogout();
    }
    const { message, payload } = await parseErrorMessage(response);
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as T;
};
