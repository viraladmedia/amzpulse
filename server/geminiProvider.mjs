import { GoogleGenAI, Type } from '@google/genai';
import { HttpError, readJsonBody, sendError, sendJson } from './http.mjs';
import { checkRateLimit, RATE_LIMITS } from './rateLimit.mjs';

const valueFromEnv = (env, keys) => {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const getAiClient = (env) => {
  const apiKey = valueFromEnv(env, ['GEMINI_API_KEY']);
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const buildPrompt = (product, userStats) => {
  let financialContext = '';
  if (userStats) {
    financialContext = `
    User Specific Financials:
    - Buy Cost: $${userStats.buyCost}
    - Potential Profit: $${userStats.profit}
    - ROI: ${userStats.roi}%

    Evaluate if this ROI is sufficient given the risk profile.
    `;
  }

  return `
    Act as an expert Amazon FBA Seller (Arbitrage & Private Label specialist). Analyze this product.

    Product Data:
    - Name: ${product.name}
    - Brand: ${product.brand}
    - Category: ${product.category}
    - ASIN: ${product.asin}
    - Buy Box Price: $${product.price}
    - Sales Rank (BSR): ${product.bsr}
    - Est. Monthly Sales: ${product.estimatedSales} units
    - Number of Sellers: ${product.sellers}
    - FBA Fees: $${product.fbaFee + product.referralFee}
    - Reviews: ${product.rating} stars (${product.reviews} count)
    - Weight: ${product.weight}
    - Hazmat Flag: ${product.isHazmat}
    - IP Risk Flag: ${product.isIpRisk}

    ${financialContext}

    Provide a structured analysis:
    1. Competition Analysis (Is the market saturated?).
    2. Demand Velocity & Seasonality.
    3. FBA vs FBM viability.
    4. Risk Assessment (IP, Hazmat, Returns).
    5. Final Grade (A-F).
    6. Score (0-100).
  `;
};

export const analyzeProduct = async (product, userStats, env = process.env) => {
  const ai = getAiClient(env);
  if (!ai) {
    throw new HttpError(503, 'AI analysis is not configured. Set GEMINI_API_KEY on the server.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildPrompt(product, userStats),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          grade: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'F'] },
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          fbaAnalysis: { type: Type.STRING, description: 'Verdict on FBA viability' },
          fbmAnalysis: { type: Type.STRING, description: 'Verdict on FBM viability' },
          ipRiskAssessment: { type: Type.STRING, description: 'Analysis of brand IP risk history' },
          seasonalityInsight: { type: Type.STRING, description: 'When does this sell best?' },
          pros: { type: Type.ARRAY, items: { type: Type.STRING } },
          cons: { type: Type.ARRAY, items: { type: Type.STRING } },
          competitionLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
          demandLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
          suggestedAction: { type: Type.STRING }
        },
        required: [
          'grade',
          'score',
          'summary',
          'fbaAnalysis',
          'fbmAnalysis',
          'ipRiskAssessment',
          'seasonalityInsight',
          'pros',
          'cons',
          'competitionLevel',
          'demandLevel',
          'suggestedAction'
        ]
      }
    }
  });

  const jsonText = response.text;
  if (!jsonText) {
    throw new HttpError(502, 'Empty response from AI');
  }

  return JSON.parse(jsonText);
};

export const handleGeminiApiRequest = async (req, res, env = process.env) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  if (path !== '/api/analysis/product') return false;

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed.');
    }

    checkRateLimit(req, RATE_LIMITS.analysis);
    const body = await readJsonBody(req);
    if (!body?.product) {
      throw new HttpError(400, 'Provide a product to analyze.');
    }

    const result = await analyzeProduct(body.product, body.userStats, env);
    sendJson(res, 200, result);
  } catch (error) {
    sendError(res, error);
  }

  return true;
};
