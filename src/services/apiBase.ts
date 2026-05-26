const normalizeBaseUrl = (value?: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const IS_CAPACITOR_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

export const BACKEND_UNAVAILABLE_MESSAGE = API_BASE_URL
  ? `Backend API unavailable or misconfigured at ${API_BASE_URL}`
  : 'API endpoint not configured.';

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const resolveApiAssetUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.startsWith('/api/')) return apiUrl(url);
  return url;
};

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(input), init);
  } catch (error) {
    throw new Error(`${BACKEND_UNAVAILABLE_MESSAGE}. Server-powered features require a reachable N.E.O backend.`);
  }
}


export const normalizeBackendError = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error || 'Unknown backend error');
  if (/Unexpected token\s*</i.test(raw) || /<!doctype html>/i.test(raw)) return 'Backend API unavailable or misconfigured.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return `${BACKEND_UNAVAILABLE_MESSAGE}`;
  return raw;
};
