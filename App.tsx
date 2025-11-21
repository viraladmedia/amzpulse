import React, { useState, useEffect } from 'react';
import { Zap, Info, BarChart3, Heart, LayoutGrid, Bell, X, TrendingUp } from 'lucide-react';
import { Product, FilterState, PricePoint, RankPoint } from './types';
import FilterBar from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import ProductAnalysis from './components/ProductAnalysis';

// --- Mock Data Generation ---
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

    // BSR usually inversely correlates with price (Lower price -> Better/Lower Rank)
    // Adding some randomness to simulate organic rank changes
    const rankFluctuation = (Math.random() - 0.5) * 200; 
    // If price dropped, rank improves (lowers)
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

// Helper to create products with consistent history
const createProduct = (data: Partial<Product> & { id: string, price: number, bsr: number }): Product => {
    const { priceHistory, bsrHistory } = generateMockHistory(data.price, data.bsr);
    return {
        ...data,
        priceHistory,
        bsrHistory
    } as Product;
}

const MOCK_PRODUCTS: Product[] = [
  createProduct({
    id: '1',
    name: 'Wireless Noise Cancelling Headphones',
    category: 'Electronics',
    subCategory: 'Headphones',
    price: 249.99,
    image: 'https://picsum.photos/400/400?random=1',
    rating: 4.5,
    reviews: 1250,
    trend: 15,
    description: 'High fidelity audio with active noise cancellation.',
    asin: 'B08H8K1234',
    bsr: 1542,
    estimatedSales: 3400,
    fbaFee: 8.50,
    referralFee: 37.50,
    weight: '0.8 lbs',
    dimensions: '8 x 7 x 3 in',
    sellers: 12
  }),
  createProduct({
    id: '2',
    name: 'Ergonomic Office Chair Mesh',
    category: 'Home & Kitchen',
    subCategory: 'Furniture',
    price: 189.00,
    image: 'https://picsum.photos/400/400?random=2',
    rating: 4.2,
    reviews: 850,
    trend: 8,
    description: 'Breathable mesh chair with lumbar support.',
    asin: 'B09J9L5678',
    bsr: 5200,
    estimatedSales: 850,
    fbaFee: 24.00,
    referralFee: 28.35,
    weight: '35 lbs',
    dimensions: '24 x 24 x 40 in',
    sellers: 5
  }),
  createProduct({
    id: '3',
    name: 'Organic Vitamin C Serum',
    category: 'Beauty & Personal Care',
    subCategory: 'Skin Care',
    price: 24.50,
    image: 'https://picsum.photos/400/400?random=3',
    rating: 4.8,
    reviews: 3400,
    trend: 22,
    description: 'Anti-aging serum with hyaluronic acid.',
    asin: 'B07K7M9012',
    bsr: 245,
    estimatedSales: 12000,
    fbaFee: 4.20,
    referralFee: 3.68,
    weight: '0.2 lbs',
    dimensions: '2 x 2 x 4 in',
    sellers: 45
  }),
  createProduct({
    id: '4',
    name: 'Yoga Mat Non-Slip Extra Thick',
    category: 'Sports & Outdoors',
    subCategory: 'Sports & Fitness',
    price: 35.99,
    image: 'https://picsum.photos/400/400?random=4',
    rating: 4.6,
    reviews: 2100,
    trend: 12,
    description: 'Eco-friendly TPE material yoga mat.',
    asin: 'B06X6N3456',
    bsr: 1200,
    estimatedSales: 4500,
    fbaFee: 6.50,
    referralFee: 5.40,
    weight: '2.5 lbs',
    dimensions: '24 x 6 x 6 in',
    sellers: 18
  }),
  createProduct({
    id: '5',
    name: 'Smart LED Strip Lights RGB',
    category: 'Smart Home',
    subCategory: 'Smart Home Lighting',
    price: 19.99,
    image: 'https://picsum.photos/400/400?random=5',
    rating: 4.3,
    reviews: 5600,
    trend: 45,
    description: 'App controlled LED lights for home decoration.',
    asin: 'B05W5Y7890',
    bsr: 89,
    estimatedSales: 25000,
    fbaFee: 4.50,
    referralFee: 3.00,
    weight: '0.5 lbs',
    dimensions: '6 x 6 x 1 in',
    sellers: 60
  }),
  createProduct({
    id: '6',
    name: 'Cordless Stick Vacuum Cleaner',
    category: 'Home & Kitchen',
    subCategory: 'Vacuums & Floor Care',
    price: 129.99,
    image: 'https://picsum.photos/400/400?random=6',
    rating: 4.1,
    reviews: 900,
    trend: 30,
    description: 'Lightweight cordless vacuum for hard floors.',
    asin: 'B04V4U1234',
    bsr: 8500,
    estimatedSales: 1100,
    fbaFee: 15.80,
    referralFee: 19.50,
    weight: '5.2 lbs',
    dimensions: '10 x 10 x 45 in',
    sellers: 22
  }),
  createProduct({
    id: '7',
    name: 'Men\'s Running Shoes',
    category: 'Fashion',
    subCategory: 'Men\'s Shoes',
    price: 59.99,
    image: 'https://picsum.photos/400/400?random=7',
    rating: 4.4,
    reviews: 150,
    trend: 5,
    description: 'Breathable sneakers for daily jogging.',
    asin: 'B03T3S5678',
    bsr: 15000,
    estimatedSales: 300,
    fbaFee: 9.00,
    referralFee: 9.00,
    weight: '1.5 lbs',
    dimensions: '12 x 8 x 5 in',
    sellers: 8
  }),
  createProduct({
    id: '8',
    name: 'LEGO Star Wars Set',
    category: 'Toys & Games',
    subCategory: 'Building Toys',
    price: 45.00,
    image: 'https://picsum.photos/400/400?random=8',
    rating: 4.9,
    reviews: 450,
    trend: 18,
    description: 'Collectible building kit.',
    asin: 'B02R2Q9012',
    bsr: 3200,
    estimatedSales: 900,
    fbaFee: 7.50,
    referralFee: 6.75,
    weight: '3.0 lbs',
    dimensions: '10 x 10 x 4 in',
    sellers: 15
  }),
  createProduct({
    id: '9',
    name: 'Whey Protein Powder 2lb',
    category: 'Health & Household',
    subCategory: 'Sports Nutrition',
    price: 29.95,
    image: 'https://picsum.photos/400/400?random=9',
    rating: 4.7,
    reviews: 5100,
    trend: 10,
    description: 'Chocolate flavor grass-fed whey.',
    asin: 'B01M123456',
    bsr: 450,
    estimatedSales: 9500,
    fbaFee: 6.20,
    referralFee: 4.50,
    weight: '2.2 lbs',
    dimensions: '6 x 6 x 10 in',
    sellers: 3
  }),
  createProduct({
    id: '10',
    name: 'Drill Driver Set',
    category: 'Tools & Home Improvement',
    subCategory: 'Power & Hand Tools',
    price: 89.00,
    image: 'https://picsum.photos/400/400?random=10',
    rating: 4.6,
    reviews: 230,
    trend: 4,
    description: '20V Cordless drill with bit set.',
    asin: 'B09Z998877',
    bsr: 2100,
    estimatedSales: 600,
    fbaFee: 12.50,
    referralFee: 13.35,
    weight: '4.5 lbs',
    dimensions: '12 x 10 x 4 in',
    sellers: 7
  }),
  createProduct({
    id: '11',
    name: 'Keto Chocolate Chip Cookies',
    category: 'Grocery & Gourmet Food',
    subCategory: 'Snack Foods',
    price: 14.99,
    image: 'https://picsum.photos/400/400?random=11',
    rating: 4.3,
    reviews: 2800,
    trend: 35,
    description: 'Low carb, sugar free cookies.',
    asin: 'B0AA112233',
    bsr: 650,
    estimatedSales: 6200,
    fbaFee: 3.50,
    referralFee: 2.25,
    weight: '0.4 lbs',
    dimensions: '6 x 4 x 2 in',
    sellers: 4
  }),
  createProduct({
    id: '12',
    name: 'Atomic Habits',
    category: 'Books',
    subCategory: 'Self-Help',
    price: 13.99,
    image: 'https://picsum.photos/400/400?random=12',
    rating: 4.9,
    reviews: 85000,
    trend: 50,
    description: 'Tiny Changes, Remarkable Results.',
    asin: 'B07D23CFGR',
    bsr: 1,
    estimatedSales: 45000,
    fbaFee: 3.00,
    referralFee: 2.10,
    weight: '0.9 lbs',
    dimensions: '9 x 6 x 1 in',
    sellers: 150
  }),
  createProduct({
    id: '13',
    name: 'Digital Clip-On Guitar Tuner',
    category: 'Musical Instruments',
    subCategory: 'Guitars',
    price: 12.50,
    image: 'https://picsum.photos/400/400?random=13',
    rating: 4.6,
    reviews: 4200,
    trend: 5,
    description: 'Accurate chromatic tuner for guitar, bass, ukulele.',
    asin: 'B01X2Y3Z45',
    bsr: 550,
    estimatedSales: 5200,
    fbaFee: 3.20,
    referralFee: 1.85,
    weight: '0.1 lbs',
    dimensions: '2 x 1 x 1 in',
    sellers: 25
  })
];

const App: React.FC = () => {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'market' | 'saved' | 'alerts'>('market');
  
  // Alert System State
  const [alertProducts, setAlertProducts] = useState<Product[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    subCategory: '',
    minPrice: 0,
    maxPrice: 0,
    search: ''
  });

  // Check for Alerts on Load
  useEffect(() => {
    const opportunities = products.filter(p => p.estimatedSales > 1000 && p.sellers <= 3);
    setAlertProducts(opportunities);
    
    if (opportunities.length > 0) {
        setShowToast(true);
        const timer = setTimeout(() => setShowToast(false), 6000);
        return () => clearTimeout(timer);
    }
  }, [products]);

  // Toggle Save Handler
  const handleToggleSave = (e: React.MouseEvent | string, id?: string) => {
      if (typeof e === 'object' && e !== null && 'stopPropagation' in e) {
         e.stopPropagation();
      }
      
      const productId = typeof e === 'string' ? e : id!;
      
      setSavedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(productId)) {
              newSet.delete(productId);
          } else {
              newSet.add(productId);
          }
          return newSet;
      });
  };

  // Filtering Logic
  useEffect(() => {
    let result = products;

    // 1. Tab Filter
    if (activeTab === 'saved') {
        result = result.filter(p => savedIds.has(p.id));
    } else if (activeTab === 'alerts') {
        result = alertProducts;
    }

    // 2. Standard Filters (Only apply on Market, but optional on others)
    if (activeTab === 'market' || activeTab === 'saved') {
        if (filters.category) {
        result = result.filter(p => p.category === filters.category);
        }

        if (filters.subCategory) {
        result = result.filter(p => p.subCategory === filters.subCategory);
        }

        if (filters.minPrice > 0) {
        result = result.filter(p => p.price >= filters.minPrice);
        }

        if (filters.maxPrice > 0) {
        result = result.filter(p => p.price <= filters.maxPrice);
        }

        if (filters.search) {
        const lowerTerm = filters.search.toLowerCase();
        result = result.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            p.asin.toLowerCase().includes(lowerTerm) ||
            p.category.toLowerCase().includes(lowerTerm) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(lowerTerm))
        );
        }
    }

    setFilteredProducts(result);
  }, [filters, products, activeTab, savedIds, alertProducts]);

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('market')}>
             <div className="bg-gradient-to-br from-amz-accent to-orange-600 p-2 rounded-lg shadow-lg shadow-amz-accent/20">
                <Zap className="text-white" size={24} fill="currentColor" />
             </div>
             <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Amz<span className="text-amz-accent">Pulse</span></h1>
                <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-bold">Seller Intelligence</p>
             </div>
          </div>
          
          <nav className="flex items-center gap-4 md:gap-6">
             <button 
                onClick={() => setActiveTab('market')}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === 'market' ? 'text-amz-accent' : 'text-slate-400 hover:text-white'}`}
             >
                <LayoutGrid size={18} /> <span className="hidden md:inline">Market</span>
             </button>
             <button 
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === 'saved' ? 'text-amz-accent' : 'text-slate-400 hover:text-white'}`}
             >
                <Heart size={18} className={activeTab === 'saved' ? 'fill-current' : ''} /> <span className="hidden md:inline">Saved</span>
                {savedIds.size > 0 && <span className="bg-slate-800 px-2 rounded text-xs">{savedIds.size}</span>}
             </button>
             <button 
                onClick={() => setActiveTab('alerts')}
                className={`relative flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === 'alerts' ? 'text-amz-accent' : 'text-slate-400 hover:text-white'}`}
             >
                <Bell size={18} className={activeTab === 'alerts' ? 'fill-current' : ''} /> <span className="hidden md:inline">Alerts</span>
                {alertProducts.length > 0 && (
                    <span className="absolute -top-2 -right-2 md:static md:top-auto md:right-auto bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full animate-pulse">
                        {alertProducts.length}
                    </span>
                )}
             </button>
          </nav>
        </div>
      </header>

      {/* Filter Bar - Only show on Market tab */}
      {activeTab === 'market' && <FilterBar filters={filters} setFilters={setFilters} />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Stats Header */}
        <div className="flex justify-between items-end mb-6">
           <div>
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {activeTab === 'market' ? <BarChart3 className="text-amz-accent" /> : 
                 activeTab === 'saved' ? <Heart className="text-pink-500 fill-pink-500" /> :
                 <Bell className="text-red-500 fill-red-500" />
                }
                {activeTab === 'market' ? 'Market Opportunities' : 
                 activeTab === 'saved' ? 'Watchlist' : 'Golden Alerts'}
             </h2>
             <p className="text-slate-400 text-sm">
                {activeTab === 'market' ? 'Live analysis of trending FBA products.' : 
                 activeTab === 'saved' ? 'Track your potential winning products.' :
                 'High demand (>1k sales) with low competition (≤3 sellers).'}
             </p>
           </div>
           <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-700">
              {filteredProducts.length} Items
           </span>
        </div>

        {/* Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={setSelectedProduct}
                isSaved={savedIds.has(product.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
            <Info size={48} className="mb-4 opacity-50" />
            <p>
                {activeTab === 'market' ? 'No products match your filters.' : 
                 activeTab === 'saved' ? 'Your watchlist is empty.' :
                 'No alerts active right now.'}
            </p>
            {activeTab === 'market' && (
                <button 
                onClick={() => setFilters({ category: '', subCategory: '', minPrice: 0, maxPrice: 0, search: '' })}
                className="mt-4 text-amz-accent hover:underline"
                >
                Reset Filters
                </button>
            )}
             {(activeTab === 'saved' || activeTab === 'alerts') && (
                <button 
                onClick={() => setActiveTab('market')}
                className="mt-4 text-amz-accent hover:underline"
                >
                Browse Market
                </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-800 py-8 text-center">
        <p className="text-slate-500 text-sm">© 2024 AmzPulse. Powered by Gemini 2.5 Flash.</p>
      </footer>

      {/* Analysis Modal */}
      {selectedProduct && (
        <ProductAnalysis 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          isSaved={savedIds.has(selectedProduct.id)}
          onToggleSave={(id) => handleToggleSave(id, id)}
        />
      )}

      {/* Alert Toast Notification */}
      {showToast && alertProducts.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
             <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-amz-accent text-white p-4 rounded-lg shadow-2xl shadow-amz-accent/20 flex items-center gap-4 max-w-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-amz-accent"></div>
                <div className="bg-amz-accent/20 p-2 rounded-full">
                    <TrendingUp size={20} className="text-amz-accent" />
                </div>
                <div>
                    <h4 className="font-bold text-sm">High Potential Alert!</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Found {alertProducts.length} items with &gt;1k sales &amp; low competition.</p>
                    <button 
                        onClick={() => { setActiveTab('alerts'); setShowToast(false); }}
                        className="text-xs text-amz-accent font-bold mt-2 hover:underline"
                    >
                        View Opportunities &rarr;
                    </button>
                </div>
                <button 
                    onClick={() => setShowToast(false)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-white"
                >
                    <X size={14} />
                </button>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;