import { fetchAmazonProducts, HttpError, readJsonBody, sendError, sendJson } from '../../server/amazonProvider.mjs';
import { checkRateLimit, RATE_LIMITS } from '../../server/rateLimit.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendError(res, new HttpError(405, 'Method not allowed.'));
    return;
  }

  try {
    checkRateLimit(req, RATE_LIMITS.batch);
    const body = await readJsonBody(req);
    const products = await fetchAmazonProducts(body?.asins || []);
    sendJson(res, 200, products);
  } catch (error) {
    sendError(res, error);
  }
}
