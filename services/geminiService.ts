import { GoogleGenAI, Type } from "@google/genai";
import { Product, AnalysisResult } from '../types';

// Safe initialization of GenAI client
const getAiClient = () => {
  try {
    const key = process.env.API_KEY;
    if (!key) {
      console.warn("Gemini API Key is missing.");
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
        
        Please assume the user can source the product at $${userStats.buyCost}. Evaluate if this ROI is sufficient for the risk.
        `;
    }

    const prompt = `
      Act as an expert Amazon FBA Seller (Arbitrage & Private Label specialist). Analyze this product.
      
      Product Data:
      - Name: ${product.name}
      - Category: ${product.category}
      - ASIN: ${product.asin}
      - Buy Box Price: $${product.price}
      - Sales Rank (BSR): ${product.bsr}
      - Est. Monthly Sales: ${product.estimatedSales} units
      - Number of Sellers: ${product.sellers}
      - FBA Fees: $${product.fbaFee + product.referralFee}
      - Reviews: ${product.rating} stars (${product.reviews} count)
      - Weight/Dimensions: ${product.weight} / ${product.dimensions}
      
      ${financialContext}

      Provide a structured analysis:
      1. Competition Analysis (Is the market saturated? Is BSR ${product.bsr} good for ${product.category}?).
      2. Demand Velocity.
      3. FBA Analysis: Is FBA viable considering fees and weight?
      4. FBM Analysis: Is FBM viable considering shipping logistics vs Amazon fulfillment?
      5. Pros/Cons.
      6. Final Grade (A-F). 'A' requires high demand, good profit potential, low risk.
      7. Score (0-100).
      8. Strategy: Specific actionable advice.
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
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            competitionLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            demandLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            suggestedAction: { type: Type.STRING }
          },
          required: ['grade', 'score', 'summary', 'fbaAnalysis', 'fbmAnalysis', 'pros', 'cons', 'competitionLevel', 'demandLevel', 'suggestedAction']
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
    // Fallback mock response if API fails or key is missing
    return {
      grade: 'C',
      score: 50,
      summary: "AI Analysis unavailable. Please check your API Key configuration.",
      fbaAnalysis: "Data unavailable",
      fbmAnalysis: "Data unavailable",
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