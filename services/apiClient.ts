export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001';

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

const handle = async (resp: Response, fallbackMsg: string) => {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || fallbackMsg);
  }
  return resp.json();
};

export async function analyzeBatch(asins: string[]) {
  const resp = await fetch(`${API_BASE}/api/batch/analyze`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ asins })
  });
  return handle(resp, 'Batch analyze failed');
}

export async function fetchProduct(asin: string) {
  const resp = await fetch(`${API_BASE}/api/products/${encodeURIComponent(asin)}`, {
    headers: buildHeaders()
  });
  return handle(resp, 'Fetch product failed');
}

export async function login(email: string, password: string) {
  const resp = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handle(resp, 'Login failed');
}

export async function register(email: string, password: string, name?: string) {
  const resp = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  return handle(resp, 'Signup failed');
}

export async function me() {
  const resp = await fetch(`${API_BASE}/api/auth/me`, { headers: buildHeaders() });
  return handle(resp, 'Fetch user failed');
}

export async function getUsage() {
  const resp = await fetch(`${API_BASE}/api/billing/usage`, { headers: buildHeaders() });
  return handle(resp, 'Fetch usage failed');
}

export async function getWatchlist() {
  const resp = await fetch(`${API_BASE}/api/watchlist`, { headers: buildHeaders() });
  return handle(resp, 'Fetch watchlist failed');
}

export async function addToWatchlist(asin: string) {
  const resp = await fetch(`${API_BASE}/api/watchlist`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ asin })
  });
  return handle(resp, 'Add to watchlist failed');
}

export async function removeFromWatchlist(idOrAsin: string) {
  const resp = await fetch(`${API_BASE}/api/watchlist/${encodeURIComponent(idOrAsin)}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || 'Remove from watchlist failed');
  }
}
