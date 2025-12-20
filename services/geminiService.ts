import { GoogleGenAI, Type } from "@google/genai";
import { Product, AnalysisResult } from '../types';

// Safe initialization of GenAI client (browser env via Vite)
const getAiClient = () => {
  try {
    const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!key) {
      console.warn("Gemini API Key is missing. Set VITE_GEMINI_API_KEY.");
      return null;
    }
    return new GoogleGenAI({ apiKey: key });
  } catch (error) {
    console.error("Failed to initialize GenAI client:", error);
    return null;
  }
};

const ai = getAiClient();

export const analyzeProductSellPotential = async (product: Product, userStats?: { buyCost: number, profit: number, roi: number }): Promise<AnalysisResult> => {
  try {
    if (!ai) {
      throw new Error("Gemini API client not initialized (Missing API Key)");
    }

    // Construct specific context if user has used the calculator
    let financialContext = "";
    if (userStats) {
        financialContext = `
        User Specific Financials:
        - Buy Cost: $${userStats.buyCost}
        - Potential Profit: $${userStats.profit}
        - ROI: ${userStats.roi}%
        
        Evaluate if this ROI is sufficient given the risk profile.
        `;
    }

    const prompt = `
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'F'] },
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            fbaAnalysis: { type: Type.STRING, description: "Verdict on FBA viability" },
            fbmAnalysis: { type: Type.STRING, description: "Verdict on FBM viability" },
            ipRiskAssessment: { type: Type.STRING, description: "Analysis of brand IP risk history" },
            seasonalityInsight: { type: Type.STRING, description: "When does this sell best?" },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            competitionLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            demandLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            suggestedAction: { type: Type.STRING }
          },
          required: ['grade', 'score', 'summary', 'fbaAnalysis', 'fbmAnalysis', 'ipRiskAssessment', 'seasonalityInsight', 'pros', 'cons', 'competitionLevel', 'demandLevel', 'suggestedAction']
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("Empty response from AI");
    }
    
    const result = JSON.parse(jsonText) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Error analyzing product:", error);
    return {
      grade: 'C',
      score: 50,
      summary: "AI Analysis unavailable. Check connection.",
      fbaAnalysis: "Data unavailable",
      fbmAnalysis: "Data unavailable",
      ipRiskAssessment: "Unknown",
      seasonalityInsight: "Unknown",
      pros: ["Stable BSR"],
      cons: ["Analysis failed"],
      competitionLevel: "Medium",
      demandLevel: "Medium",
      suggestedAction: "Check manually."
    };
  }
};

export const findAlternativeSources = async (productName: string) => {
   // Placeholder for future scraping expansion
   return; 
}
