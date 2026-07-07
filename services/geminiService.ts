import { Product, AnalysisResult } from '../types';
import { analyzeProductWithAi } from './apiClient';

export const analyzeProductSellPotential = async (
  product: Product,
  userStats?: { buyCost: number; profit: number; roi: number }
): Promise<AnalysisResult> => {
  try {
    return (await analyzeProductWithAi(product, userStats)) as AnalysisResult;
  } catch (error) {
    console.error('Error analyzing product:', error);
    return {
      grade: 'C',
      score: 50,
      summary: 'AI Analysis unavailable. Check connection.',
      fbaAnalysis: 'Data unavailable',
      fbmAnalysis: 'Data unavailable',
      ipRiskAssessment: 'Unknown',
      seasonalityInsight: 'Unknown',
      pros: ['Stable BSR'],
      cons: ['Analysis failed'],
      competitionLevel: 'Medium',
      demandLevel: 'Medium',
      suggestedAction: 'Check manually.'
    };
  }
};
