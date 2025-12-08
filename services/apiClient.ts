export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001';

export async function analyzeBatch(asins: string[]) {
  const resp = await fetch(`${API_BASE}/api/batch/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asins })
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function fetchProduct(asin: string) {
  const resp = await fetch(`${API_BASE}/api/products/${encodeURIComponent(asin)}`);
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}
