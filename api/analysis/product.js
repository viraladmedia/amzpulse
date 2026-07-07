import { HttpError, readJsonBody, sendError, sendJson } from '../../server/http.mjs';
import { analyzeProduct } from '../../server/geminiProvider.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendError(res, new HttpError(405, 'Method not allowed.'));
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (!body?.product) {
      throw new HttpError(400, 'Provide a product to analyze.');
    }

    const result = await analyzeProduct(body.product, body.userStats);
    sendJson(res, 200, result);
  } catch (error) {
    sendError(res, error);
  }
}
