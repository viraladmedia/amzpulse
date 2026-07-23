declare const __APP_API_BASE__: string | undefined;

const trimmed = (value: string | undefined | null) => (value || '').trim().replace(/\/$/, '');

const hasConfiguredBase = Boolean(trimmed(import.meta.env.VITE_API_BASE as string | undefined) || trimmed(__APP_API_BASE__));

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user?: AuthUser;
  organizationId?: string;
  role?: string;
  plan?: string;
  planRenewsAt?: string | null;
}

export interface SessionProfile {
  user?: AuthUser;
  organizationId?: string;
  role?: string;
  plan?: string;
  planRenewsAt?: string | null;
}

export interface UsageSnapshot {
  id?: string;
  organizationId?: string;
  month?: string;
  asinsAnalyzed: number;
  batchRuns: number;
  plan?: string;
  planRenewsAt?: string | null;
}

export interface WatchlistItem {
  id: string;
  productId: string;
  targetPrice?: number | null;
  targetRoi?: number | null;
  notes?: string | null;
  product?: unknown;
}

export interface WatchlistMutationResponse {
  watchlistItem?: WatchlistItem;
}

export interface BillingPlan {
  name: string;
  monthlyAsinQuota: number;
  maxBatchSize: number;
  price: number;
  description: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PasswordResetRequestResponse {
  message: string;
  resetToken?: string;
  resetUrl?: string;
}

export interface PasswordResetResponse {
  message: string;
}

const resolveApiBase = () => {
  const envBase = trimmed((import.meta.env.VITE_API_BASE as string | undefined) || __APP_API_BASE__);
  if (envBase) return envBase;

  // In dev, same-origin requests let Vite serve local product API middleware first.
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    // Helpful warning when deploying to static hosts without a backend.
    try {
      const host = new URL(origin).hostname;
      if (!hasConfiguredBase && /(?:github\.io|vercel\.app)$/i.test(host)) {
        console.warn(
          `[apiClient] No VITE_API_BASE or API_BASE set; falling back to site origin (${origin}). ` +
            'Configure an API base to avoid hitting the static host.'
        );
      }
    } catch {
      // Ignore URL parse issues and just return origin.
    }
    return origin;
  }

  return 'http://localhost:3001';
};

export const API_BASE = resolveApiBase();

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('amzpulse_token', token);
  } else {
    localStorage.removeItem('amzpulse_token');
  }
};

const buildHeaders = (extra?: Record<string, string>) => {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
};

const buildErrorMessage = (status: number, rawText: string, fallbackMsg: string) => {
  const text = (rawText || '').trim();
  const looksHtml = text.startsWith('<');
  const snippet = looksHtml ? '' : text.slice(0, 240);
  const baseHint = hasConfiguredBase || import.meta.env.DEV ? '' : ' (API base not configured; set VITE_API_BASE or API_BASE for deployments)';
  const statusPrefix = status ? `[${status}] ` : '';
  return `${statusPrefix}${snippet || fallbackMsg}${baseHint}`;
};

const handle = async <T>(resp: Response, fallbackMsg: string): Promise<T> => {
  const body = await resp.text().catch(() => '');

  if (!resp.ok) {
    throw new Error(buildErrorMessage(resp.status, body, fallbackMsg));
  }

  if (!body) return null as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    return body as T;
  }
};

export async function analyzeProductWithAi(product: Record<string, any>, userStats?: Record<string, any>) {
  const resp = await fetch(`${API_BASE}/api/analysis/product`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ product, userStats })
  });
  return handle<Record<string, any>>(resp, 'AI analysis failed');
}

export async function analyzeBatch(asins: string[]) {
  const resp = await fetch(`${API_BASE}/api/batch/analyze`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ asins })
  });
  return handle<Record<string, any>[]>(resp, 'Batch analyze failed');
}

export async function fetchProduct(asin: string) {
  const resp = await fetch(`${API_BASE}/api/products/${encodeURIComponent(asin)}`, {
    headers: buildHeaders()
  });
  return handle<Record<string, any>>(resp, 'Fetch product failed');
}

export async function getFeaturedProducts() {
  const resp = await fetch(`${API_BASE}/api/products/featured`);
  return handle<Record<string, any>[]>(resp, 'Fetch featured products failed');
}

export async function getTrendingProducts() {
  const resp = await fetch(`${API_BASE}/api/products/trending`);
  return handle<Record<string, any>[]>(resp, 'Fetch trending products failed');
}

export async function getBestSellerProducts() {
  const resp = await fetch(`${API_BASE}/api/products/bestsellers`);
  return handle<Record<string, any>[]>(resp, 'Fetch best-seller products failed');
}

export async function login(email: string, password: string) {
  const resp = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handle<AuthResponse>(resp, 'Login failed');
}

export async function register(email: string, password: string, name?: string) {
  const resp = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  return handle<AuthResponse>(resp, 'Signup failed');
}

export async function me() {
  const resp = await fetch(`${API_BASE}/api/auth/me`, { headers: buildHeaders() });
  return handle<SessionProfile>(resp, 'Fetch user failed');
}

export async function getUsage() {
  const resp = await fetch(`${API_BASE}/api/billing/usage`, { headers: buildHeaders() });
  return handle<UsageSnapshot>(resp, 'Fetch usage failed');
}

export async function getWatchlist() {
  const resp = await fetch(`${API_BASE}/api/watchlist`, { headers: buildHeaders() });
  return handle<WatchlistItem[]>(resp, 'Fetch watchlist failed');
}

export async function addToWatchlist(asin: string) {
  const resp = await fetch(`${API_BASE}/api/watchlist`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ asin })
  });
  return handle<WatchlistMutationResponse>(resp, 'Add to watchlist failed');
}

export async function getBillingPlans() {
  const resp = await fetch(`${API_BASE}/api/billing/plans`);
  return handle<BillingPlan[]>(resp, 'Fetch billing plans failed');
}

export async function createCheckoutSession() {
  const resp = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: buildHeaders()
  });
  return handle<CheckoutSessionResponse>(resp, 'Create checkout session failed');
}

export async function requestPasswordReset(email: string) {
  const resp = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return handle<PasswordResetRequestResponse>(resp, 'Forgot password failed');
}

export async function resetPassword(token: string, password: string) {
  const resp = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });
  return handle<PasswordResetResponse>(resp, 'Reset password failed');
}

export async function removeFromWatchlist(idOrAsin: string) {
  const resp = await fetch(`${API_BASE}/api/watchlist/${encodeURIComponent(idOrAsin)}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });
  await handle<null>(resp, 'Remove from watchlist failed');
}
