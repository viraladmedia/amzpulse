import { HttpError, readJsonBody, sendError, sendJson } from './http.mjs';
import { checkRateLimit, RATE_LIMITS } from './rateLimit.mjs';
import { ASIN_PATTERN, valueFromEnv } from './providers/shared.mjs';
import * as paapiProvider from './providers/paapi.mjs';
import * as spapiProvider from './providers/spapi.mjs';
import * as keepaProvider from './providers/keepa.mjs';
import * as rainforestProvider from './providers/rainforest.mjs';
import * as jungleScoutProvider from './providers/jungleScout.mjs';

export { HttpError, readJsonBody, sendError, sendJson };

const MAX_BATCH_ITEMS = 100;

// Providers are tried in this order; each one only runs if its own env vars are set.
// For any ASIN a provider doesn't return, the next configured provider is tried for just
// that ASIN, so a partial PA-API outage (or PA-API being unconfigured/deprecated) doesn't
// take down the whole lookup.
const PROVIDERS = {
  paapi: paapiProvider,
  spapi: spapiProvider,
  keepa: keepaProvider,
  rainforest: rainforestProvider,
  junglescout: jungleScoutProvider
};

const resolveProviderOrder = (env) => {
  const configuredOrder = valueFromEnv(env, ['PRODUCT_DATA_PROVIDERS']);
  const order = configuredOrder ? configuredOrder.split(',').map((name) => name.trim().toLowerCase()) : Object.keys(PROVIDERS);
  return order.filter((name) => PROVIDERS[name]);
};

export const normalizeAsins = (values) => {
  const raw = Array.isArray(values) ? values : String(values || '').split(/[\s,]+/);
  const normalized = raw.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean);
  return [...new Set(normalized)];
};

const validateAsins = (asins, maxItems = MAX_BATCH_ITEMS) => {
  if (asins.length === 0) {
    throw new HttpError(400, 'Provide at least one ASIN.');
  }
  if (asins.length > maxItems) {
    throw new HttpError(413, `Too many ASINs. The maximum batch size is ${maxItems}.`);
  }

  const invalid = asins.filter((asin) => !ASIN_PATTERN.test(asin));
  if (invalid.length > 0) {
    throw new HttpError(400, `Invalid ASIN format: ${invalid.slice(0, 5).join(', ')}`);
  }
};

export const fetchAmazonProducts = async (values, env = process.env) => {
  const asins = normalizeAsins(values);
  validateAsins(asins);

  const providerOrder = resolveProviderOrder(env);
  const configuredProviders = providerOrder.filter((name) => PROVIDERS[name].isConfigured(env));

  if (configuredProviders.length === 0) {
    throw new HttpError(
      503,
      'No product data provider is configured. Set credentials for at least one of: AMAZON_PAAPI_* (PA-API), ' +
        'SPAPI_CLIENT_ID/SPAPI_CLIENT_SECRET/SPAPI_REFRESH_TOKEN (Amazon SP-API), KEEPA_API_KEY (Keepa), ' +
        'RAINFOREST_API_KEY (Rainforest), or JUNGLESCOUT_KEY_NAME/JUNGLESCOUT_API_KEY (Jungle Scout).'
    );
  }

  const found = new Map();
  let remaining = asins;
  const errors = [];

  for (const name of configuredProviders) {
    if (remaining.length === 0) break;

    try {
      const products = await PROVIDERS[name].fetchProducts(remaining, env);
      for (const product of products) {
        if (!found.has(product.asin)) found.set(product.asin, product);
      }
      remaining = remaining.filter((asin) => !found.has(asin));
    } catch (error) {
      // A provider being unconfigured/down shouldn't fail the whole lookup while other
      // providers can still cover these ASINs; only surface it if nothing succeeds.
      errors.push(`${name}: ${error?.message || 'request failed'}`);
    }
  }

  if (found.size === 0) {
    throw new HttpError(502, errors.length > 0 ? `All product data providers failed. ${errors.join(' | ')}` : 'No products available.');
  }

  // Preserve the caller's requested ASIN order.
  return asins.map((asin) => found.get(asin)).filter(Boolean);
};

export const getFeaturedAsins = (env = process.env) =>
  normalizeAsins(valueFromEnv(env, ['FEATURED_ASINS', 'AMAZON_FEATURED_ASINS']));

export const handleAmazonApiRequest = async (req, res, env = process.env) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/api/products/featured') {
      checkRateLimit(req, RATE_LIMITS.featured);
      const asins = getFeaturedAsins(env);
      if (asins.length === 0) {
        sendJson(res, 200, []);
        return true;
      }

      const products = await fetchAmazonProducts(asins, env);
      sendJson(res, 200, products);
      return true;
    }

    const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
    if (req.method === 'GET' && productMatch) {
      checkRateLimit(req, RATE_LIMITS.product);
      const asin = decodeURIComponent(productMatch[1] || '');
      const products = await fetchAmazonProducts([asin], env);
      if (!products[0]) {
        throw new HttpError(404, `Amazon product not found or not accessible: ${asin}`);
      }

      sendJson(res, 200, products[0]);
      return true;
    }

    if (req.method === 'POST' && path === '/api/batch/analyze') {
      checkRateLimit(req, RATE_LIMITS.batch);
      const body = await readJsonBody(req);
      const products = await fetchAmazonProducts(body?.asins || [], env);
      sendJson(res, 200, products);
      return true;
    }

    if (path === '/api/products/featured' || path.startsWith('/api/products/') || path === '/api/batch/analyze') {
      throw new HttpError(405, 'Method not allowed.');
    }
  } catch (error) {
    sendError(res, error);
    return true;
  }

  return false;
};
