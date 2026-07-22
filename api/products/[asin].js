import { fetchAmazonProducts, HttpError, sendError, sendJson } from '../../server/amazonProvider.mjs';
import { checkRateLimit, RATE_LIMITS } from '../../server/rateLimit.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendError(res, new HttpError(405, 'Method not allowed.'));
    return;
  }

  try {
    checkRateLimit(req, RATE_LIMITS.product);
    const url = new URL(req.url || '/', 'http://localhost');
    const asinFromPath = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    const asin = Array.isArray(req.query?.asin) ? req.query.asin[0] : req.query?.asin || asinFromPath;
    const products = await fetchAmazonProducts([asin]);

    if (!products[0]) {
      throw new HttpError(404, `Amazon product not found or not accessible: ${asin}`);
    }

    sendJson(res, 200, products[0]);
  } catch (error) {
    sendError(res, error);
  }
}
