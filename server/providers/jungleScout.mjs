import { HttpError } from '../http.mjs';
import { blankProduct, toNumber, valueFromEnv } from './shared.mjs';

// https://developer.junglescout.com/api
// NOTE: Jungle Scout's public "Product Database" endpoint is documented mainly as a
// keyword/category discovery search, not a dedicated single-ASIN lookup. Sending `asins`
// as a query attribute matches the shape of its other filters (include_keywords,
// categories), but this isn't confirmed against every account tier. Verify field names
// against your account's actual API reference (developer.junglescout.com/api#endpoints)
// and adjust the request attribute / response mapping below if your plan differs.
const JUNGLE_SCOUT_BASE = 'https://developer.junglescout.com/api';

export const isConfigured = (env = process.env) =>
  Boolean(valueFromEnv(env, ['JUNGLESCOUT_KEY_NAME']) && valueFromEnv(env, ['JUNGLESCOUT_API_KEY']));

const mapResultToProduct = (entry) => {
  const asin = String(entry?.id || '').split('/').pop() || '';
  const attrs = entry?.attributes || {};

  return {
    ...blankProduct(asin),
    name: attrs.title || `Amazon product ${asin}`,
    brand: attrs.brand || 'Unknown',
    category: attrs.category || 'Amazon',
    price: toNumber(attrs.price),
    priceDisplay: attrs.price ? `$${toNumber(attrs.price).toFixed(2)}` : '',
    currency: 'USD',
    image: attrs.image_url || '',
    rating: toNumber(attrs.rating),
    reviews: toNumber(attrs.reviews),
    estimatedSales: toNumber(attrs.approximate_30_day_units_sold),
    isEstimatedSales: true,
    detailUrl: `https://www.amazon.com/dp/${asin}`,
    dataSource: 'jungle-scout',
    lastSyncedAt: new Date().toISOString()
  };
};

export const fetchProducts = async (asins, env = process.env) => {
  const keyName = valueFromEnv(env, ['JUNGLESCOUT_KEY_NAME']);
  const apiKey = valueFromEnv(env, ['JUNGLESCOUT_API_KEY']);
  if (!keyName || !apiKey) {
    throw new HttpError(503, 'Jungle Scout is not configured. Set JUNGLESCOUT_KEY_NAME and JUNGLESCOUT_API_KEY on the server.');
  }

  const marketplace = valueFromEnv(env, ['JUNGLESCOUT_MARKETPLACE']) || 'us';
  const response = await fetch(`${JUNGLE_SCOUT_BASE}/product_database_query?marketplace=${encodeURIComponent(marketplace)}`, {
    method: 'POST',
    headers: {
      Authorization: `${keyName}:${apiKey}`,
      'X-API-Type': 'junglescout',
      Accept: 'application/vnd.junglescout.v1+json',
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify({
      data: {
        type: 'product_database_query',
        attributes: { asins }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(response.status, payload?.errors?.[0]?.detail || 'Jungle Scout request failed.');
  }

  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.map(mapResultToProduct).filter((product) => product.asin);
};
