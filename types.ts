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
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
  trend: number; // Percentage growth
  size?: string;
  description: string;
  
  priceHistory: PricePoint[];
  bsrHistory: RankPoint[]; // Added for Keepa-style charts
  
  // Seller Amp / FBA Specifics
  asin: string;
  bsr: number; // Current Best Sellers Rank
  estimatedSales: number; // Monthly unit sales
  fbaFee: number;
  referralFee: number;
  weight: string;
  dimensions: string;
  sellers: number; // Number of offers

  analysis?: AnalysisResult;
}

export interface FilterState {
  category: string;
  subCategory: string;
  minPrice: number;
  maxPrice: number;
  search: string;
}