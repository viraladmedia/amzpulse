import { HttpError } from '../http.mjs';
import { blankProduct, toNumber, valueFromEnv } from './shared.mjs';

// https://www.rainforestapi.com/docs/product-data-api/reference/product-request
// NOTE: this session couldn't reach docs.trajectdata.com to double-check exact field
// names, so the mapper below is written defensively (it tries a couple of plausible
// field names per value) rather than assuming one exact shape. Verify against your
// account's live response and adjust `mapResultToProduct` if a field comes back empty.
const RAINFOREST_BASE = 'https://api.rainforestapi.com/request';
const MAX_CONCURRENT_REQUESTS = 5;

export const isConfigured = (env = process.env) => Boolean(valueFromEnv(env, ['RAINFOREST_API_KEY']));

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const mapResultToProduct = (product, asin) => {
  const categories = Array.isArray(product?.categories) ? product.categories : [];
  const bestsellersRank = Array.isArray(product?.bestsellers_rank) ? product.bestsellers_rank[0] : null;
  const price = toNumber(
    product?.buybox_winner?.price?.value ?? product?.price?.value ?? product?.buybox_winner?.price ?? product?.price
  );
  const image = firstValue(product?.main_image?.link, product?.images?.[0]?.link, product?.image);

  return {
    ...blankProduct(asin),
    name: firstValue(product?.title, product?.name) || `Amazon product ${asin}`,
    brand: firstValue(product?.brand, 'Unknown'),
    category: firstValue(categories[0]?.name, categories[0], 'Amazon'),
    subCategory: firstValue(categories[categories.length - 1]?.name, categories[categories.length - 1]),
    price,
    priceDisplay: firstValue(product?.buybox_winner?.price?.raw, product?.price?.raw, price > 0 ? `$${price.toFixed(2)}` : ''),
    currency: firstValue(product?.buybox_winner?.price?.currency, product?.price?.currency, 'USD'),
    image,
    rating: toNumber(product?.rating),
    reviews: toNumber(product?.ratings_total),
    sellers: toNumber(product?.buybox_winner?.total_offers ?? product?.total_offers),
    bsr: toNumber(bestsellersRank?.rank),
    detailUrl: firstValue(product?.link, `https://www.amazon.com/dp/${asin}`),
    dataSource: 'rainforest',
    lastSyncedAt: new Date().toISOString()
  };
};

const fetchOne = async (asin, apiKey, amazonDomain) => {
  const url = `${RAINFOREST_BASE}?api_key=${encodeURIComponent(apiKey)}&type=product&amazon_domain=${encodeURIComponent(amazonDomain)}&asin=${encodeURIComponent(asin)}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.request_info?.success === false) {
    throw new HttpError(response.status || 502, payload?.request_info?.message || 'Rainforest API request failed.');
  }

  return payload?.product ? mapResultToProduct(payload.product, asin) : null;
};

export const fetchProducts = async (asins, env = process.env) => {
  const apiKey = valueFromEnv(env, ['RAINFOREST_API_KEY']);
  if (!apiKey) {
    throw new HttpError(503, 'Rainforest API is not configured. Set RAINFOREST_API_KEY on the server.');
  }

  const amazonDomain = valueFromEnv(env, ['RAINFOREST_AMAZON_DOMAIN']) || 'amazon.com';
  const products = [];
  let lastError = null;

  // Rainforest's product endpoint is one ASIN per request; cap concurrency instead of
  // firing every request at once.
  for (let index = 0; index < asins.length; index += MAX_CONCURRENT_REQUESTS) {
    const batch = asins.slice(index, index + MAX_CONCURRENT_REQUESTS);
    const results = await Promise.all(
      batch.map(async (asin) => {
        try {
          return await fetchOne(asin, apiKey, amazonDomain);
        } catch (error) {
          lastError = error;
          return null;
        }
      })
    );
    products.push(...results.filter(Boolean));
  }

  // A systemic failure (bad key, quota exhausted) looks identical to "nothing found"
  // per-ASIN; if every request failed, surface the reason instead of hiding it.
  if (products.length === 0 && lastError) {
    throw lastError;
  }

  return products;
};
