export interface PricePoint {
  date: string;
  price: number;
}

export interface RankPoint {
  date: string;
  rank: number;
}

export interface AnalysisResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number; // 0-100
  summary: string;
  pros: string[];
  cons: string[];
  competitionLevel: 'Low' | 'Medium' | 'High';
  demandLevel: 'Low' | 'Medium' | 'High';
  suggestedAction: string;
  fbaAnalysis: string; // Specific verdict for FBA
  fbmAnalysis: string; // Specific verdict for FBM
  ipRiskAssessment?: string; // New: AI verdict on IP risk
  seasonalityInsight?: string; // New: AI verdict on seasonality
}

export interface Product {
  id: string;
  name: string;
  brand: string; // New
  category: string;
  subCategory?: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
  trend: number; // Percentage growth
  description: string;
  
  priceHistory: PricePoint[];
  bsrHistory: RankPoint[];
  
  // Seller Amp / FBA Specifics
  asin: string;
  bsr: number;
  estimatedSales: number;
  
  // Fees Breakdown
  referralFee: number;
  fbaFee: number;
  storageFee: number; // New
  
  // Specs
  weight: string;
  dimensions: string;
  sellers: number;
  
  // Risk Flags (New)
  isHazmat: boolean;
  isIpRisk: boolean;
  isOversized: boolean;

  // Seasonality (New)
  seasonalityTags: ('Q1' | 'Q2' | 'Q3' | 'Q4' | 'Evergreen' | 'Summer' | 'Back to School')[];

  // User Specific Data (Stored locally)
  supplierUrl?: string;
  targetRoi?: number;
  notes?: string;

  analysis?: AnalysisResult;
}

export interface FilterState {
  category: string;
  subCategory: string;
  minPrice: number;
  maxPrice: number;
  minRoi: number; // New
  maxBSR: number; // New
  search: string;
  season?: string; // New
}

export type ViewMode = 'dashboard' | 'research' | 'batch' | 'watchlist' | 'settings';