import { Product, PricePoint, RankPoint } from '../types';

const BRANDS = ['Anker', 'Nike', 'Lego', 'Sony', 'Keurig', 'Logitech', 'Adidas', 'Instant Pot', 'Funko', 'Dove'];

// Helper: Generate History
const generateMockHistory = (basePrice: number, baseBsr: number) => {
  const priceHistory: PricePoint[] = [];
  const bsrHistory: RankPoint[] = [];
  const now = new Date();
  let currentPrice = basePrice;
  let currentBsr = baseBsr;

  for (let i = 90; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Price fluctuation +/- 5%
    const priceFluctuation = (Math.random() - 0.5) * 0.1;
    currentPrice = currentPrice * (1 + priceFluctuation);
    priceHistory.push({
      date: dateStr,
      price: parseFloat(currentPrice.toFixed(2))
    });

    // BSR inverse correlation
    const rankFluctuation = (Math.random() - 0.5) * 200; 
    if (priceFluctuation < 0) {
        currentBsr = Math.max(1, currentBsr * 0.95); 
    } else {
        currentBsr = currentBsr * 1.05;
    }
    currentBsr += rankFluctuation;
    bsrHistory.push({
        date: dateStr,
        rank: Math.max(1, Math.floor(currentBsr))
    });
  }
  return { priceHistory, bsrHistory };
};

// Generator Function
export const generateMockProduct = (asinOrId: string, overrides: Partial<Product> = {}): Product => {
    const price = overrides.price || parseFloat((Math.random() * 200 + 10).toFixed(2));
    const bsr = overrides.bsr || Math.floor(Math.random() * 50000) + 1;
    const { priceHistory, bsrHistory } = generateMockHistory(price, bsr);
    
    const weightVal = Math.random() * 5;
    const isHazmat = Math.random() > 0.95; // 5% chance
    const isIpRisk = Math.random() > 0.90; // 10% chance
    
    const category = overrides.category || 'Home & Kitchen';
    
    return {
        id: asinOrId,
        asin: asinOrId.length > 5 ? asinOrId : `B0${Math.random().toString(36).substring(7).toUpperCase()}`,
        name: overrides.name || 'Sample Product Title ' + asinOrId,
        brand: BRANDS[Math.floor(Math.random() * BRANDS.length)],
        category: category,
        subCategory: overrides.subCategory || 'General',
        price: price,
        image: overrides.image || `https://picsum.photos/400/400?random=${Math.floor(Math.random() * 1000)}`,
        rating: 4 + Math.random(),
        reviews: Math.floor(Math.random() * 5000),
        trend: Math.floor(Math.random() * 40) - 10,
        description: 'Automated mock description for ' + asinOrId,
        
        priceHistory,
        bsrHistory,
        
        bsr: bsr,
        estimatedSales: overrides.estimatedSales || Math.floor(300000 / bsr), // Rough heuristic
        
        referralFee: price * 0.15,
        fbaFee: 3 + (weightVal * 0.5),
        storageFee: 0.50,
        
        weight: `${weightVal.toFixed(1)} lbs`,
        dimensions: '10 x 8 x 4 in',
        sellers: Math.floor(Math.random() * 20) + 1,
        
        isHazmat,
        isIpRisk,
        isOversized: weightVal > 40,
        
        seasonalityTags: Math.random() > 0.7 ? ['Q4'] : ['Evergreen'],
        
        ...overrides
    };
};

// Initial Data Population
export const INITIAL_PRODUCTS: Product[] = [
  generateMockProduct('1', { name: 'Wireless Noise Cancelling Headphones', category: 'Electronics', price: 249.99, bsr: 1542, estimatedSales: 3400, sellers: 12 }),
  generateMockProduct('2', { name: 'Ergonomic Office Chair Mesh', category: 'Home & Kitchen', price: 189.00, bsr: 5200, estimatedSales: 850 }),
  generateMockProduct('3', { name: 'Organic Vitamin C Serum', category: 'Beauty & Personal Care', price: 24.50, bsr: 245, estimatedSales: 12000, sellers: 45 }),
  generateMockProduct('4', { name: 'Yoga Mat Non-Slip', category: 'Sports & Outdoors', price: 35.99, bsr: 1200, estimatedSales: 4500 }),
  generateMockProduct('5', { name: 'LEGO Star Wars Set', category: 'Toys & Games', price: 45.00, bsr: 3200, estimatedSales: 900, isIpRisk: true }),
  generateMockProduct('6', { name: 'Drill Driver Set', category: 'Tools & Home Improvement', price: 89.00, bsr: 2100, estimatedSales: 600 }),
  generateMockProduct('7', { name: 'Keto Cookies', category: 'Grocery & Gourmet Food', price: 14.99, bsr: 650, estimatedSales: 6200 }),
];