import { fetchAmazonProducts, getFeaturedAsins, HttpError, sendError, sendJson } from '../../server/amazonProvider.mjs';
import { checkRateLimit, RATE_LIMITS } from '../../server/rateLimit.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendError(res, new HttpError(405, 'Method not allowed.'));
    return;
  }

  try {
    checkRateLimit(req, RATE_LIMITS.featured);
    const asins = getFeaturedAsins();
    if (asins.length === 0) {
      sendJson(res, 200, []);
      return;
    }

    const products = await fetchAmazonProducts(asins);
    sendJson(res, 200, products);
  } catch (error) {
    sendError(res, error);
  }
}
