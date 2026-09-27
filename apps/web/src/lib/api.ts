/**
 * Unified API Client & Global Fetch Interceptor for Badminton Live
 * Handles automatic JWT authorization headers, 401 detection,
 * token refreshing via /api/v1/auth/refresh, and single-retry progression.
 */

declare global {
  interface Window {
    __originalFetch?: typeof window.fetch;
    __badmintonFetchIntercepted?: boolean;
  }
}

type TokenListener = (token: string | null) => void;
const tokenListeners = new Set<TokenListener>();

export function onTokenRefreshed(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

function notifyTokenListeners(token: string | null) {
  tokenListeners.forEach((fn) => {
    try {
      fn(token);
    } catch (e) {
      console.error('[API] Error in token listener:', e);
    }
  });
}

let activeRefreshPromise: Promise<string | null> | null = null;

function clearAuthAndRedirect() {
  localStorage.removeItem('badminton_access_token');
  localStorage.removeItem('badminton_refresh_token');
  notifyTokenListeners(null);

  if (
    typeof window !== 'undefined' &&
    window.location &&
    !window.location.pathname.includes('/login') &&
    (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/scorer'))
  ) {
    window.location.href = '/login?expired=1';
  }
}

/**
 * Deduplicated token refresh request using POST /api/v1/auth/refresh
 */
export async function requestTokenRefresh(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('badminton_refresh_token');
      if (!refreshToken) {
        clearAuthAndRedirect();
        return null;
      }

      // Use raw original fetch to prevent recursion
      const rawFetch = window.__originalFetch || window.fetch;
      const res = await rawFetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuthAndRedirect();
        return null;
      }

      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('badminton_access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('badminton_refresh_token', data.refreshToken);
        }
        notifyTokenListeners(data.accessToken);
        return data.accessToken as string;
      }

      clearAuthAndRedirect();
      return null;
    } catch (err) {
      console.warn('[API] Refresh request failed:', err);
      clearAuthAndRedirect();
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Authenticated fetch helper with automatic 401 token refresh and single retry
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit & { _retry?: boolean } = {}
): Promise<Response> {
  const rawFetch = window.__originalFetch || window.fetch;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  const isAuthEndpoint = url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh');

  const headers = new Headers(init.headers || (typeof input === 'object' && 'headers' in input ? (input as any).headers : {}));
  const currentToken = localStorage.getItem('badminton_access_token');

  // Attach token if present and not calling login/refresh
  if (currentToken && !headers.has('Authorization') && !isAuthEndpoint) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const { _retry, ...fetchInit } = init;
  const response = await rawFetch(input, { ...fetchInit, headers });

  // Handle 401: Refresh and retry original request ONCE via rawFetch
  if (response.status === 401 && !_retry && !isAuthEndpoint) {
    const newToken = await requestTokenRefresh();
    if (newToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      return rawFetch(input, {
        ...fetchInit,
        headers: retryHeaders,
      });
    }
  }

  return response;
}

/**
 * Installs global window.fetch interceptor once on application startup
 */
export function setupFetchInterceptor() {
  if (typeof window === 'undefined' || window.__badmintonFetchIntercepted) {
    return;
  }

  window.__originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return fetchWithAuth(input, init);
  };
  window.__badmintonFetchIntercepted = true;
  console.log('[API] Global fetch interceptor active with auto-refresh on 401.');
}
