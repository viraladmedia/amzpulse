import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Product, FilterState, ViewMode } from './types';
import FilterBar from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import ProductAnalysis from './components/ProductAnalysis';
import Sidebar from './components/Sidebar';
import BatchAnalysis from './components/BatchAnalysis';
import { INITIAL_PRODUCTS, generateMockProduct } from './services/mockService';
import { fetchProduct as apiFetchProduct } from './services/apiClient';

const App: React.FC = () => {
  // State
  const [currentView, setView] = useState<ViewMode>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    subCategory: '',
    minPrice: 0,
    maxPrice: 0,
    minRoi: 0,
    maxBSR: 0,
    search: '',
    season: ''
  });

  // Toggle Save Handler
  const handleToggleSave = (e: React.MouseEvent | string, id?: string) => {
      if (typeof e === 'object' && e !== null && 'stopPropagation' in e) {
         e.stopPropagation();
      }
      const productId = typeof e === 'string' ? e : id!;
      setSavedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(productId)) newSet.delete(productId);
          else newSet.add(productId);
          return newSet;
      });
  };

  // Search Logic: fetch real product from backend when full ASIN is typed, map many fields
  useEffect(() => {
     const tryFetch = async () => {
       if (filters.search && filters.search.startsWith('B0') && filters.search.length === 10) {
           const exists = products.find(p => p.asin === filters.search);
           if (!exists) {
               try {
                 const data = await apiFetchProduct(filters.search);
                 const newProd: Product = {
                    id: data.asin || filters.search,
                    asin: data.asin || filters.search,
                    name: data.title || `Product ${filters.search}`,
                    brand: data.brand || 'Unknown',
                    category: data.category || 'Misc',
                    subCategory: data.subCategory || undefined,
                    price: Number(data.price || 0),
                    image: data.image || `https://picsum.photos/400/400?random=${filters.search}`,
                    rating: Number(data.rating || 4.0),
                    reviews: Number(data.reviews || 0),
                    trend: Number(data.trend || 0),
                    description: data.description || '',
                    priceHistory: data.priceHistory || [],
                    bsrHistory: data.bsrHistory || [],
                    bsr: Number(data.bsr || 0),
                    estimatedSales: Number(data.estSales || data.estimatedSales || 0),
                    referralFee: Number(data.referralFee || 0),
                    fbaFee: Number(data.fbaFee || 0),
                    storageFee: Number(data.storageFee || 0.5),
                    weight: data.weight || '',
                    dimensions: data.dimensions || '',
                    sellers: Number(data.sellers || 1),
                    isHazmat: Boolean(data.isHazmat),
                    isIpRisk: Boolean(data.isIpRisk),
                    isOversized: Boolean(data.isOversized),
                    seasonalityTags: data.seasonalityTags || ['Evergreen'],
                    supplierUrl: data.supplierUrl || undefined,
                    targetRoi: data.targetRoi || undefined,
                    notes: data.notes || undefined,
                    analysis: data.analysis || undefined // <- AI analysis from backend
                 };
                 setProducts(prev => [newProd, ...prev]);
               } catch (err) {
                 console.warn('Backend fetch failed, generating local mock:', err);
                 const newProd = generateMockProduct(filters.search);
                 setProducts(prev => [newProd, ...prev]);
               }
           }
       }
     };
     tryFetch();
  }, [filters.search]);

  // Filtering Logic
  useEffect(() => {
    let result = products;

    // View specific filtering
    if (currentView === 'watchlist') {
        result = result.filter(p => savedIds.has(p.id));
    }

    // Standard Filters
    if (filters.category) result = result.filter(p => p.category === filters.category);
    if (filters.subCategory) result = result.filter(p => p.subCategory === filters.subCategory);
    if (filters.minPrice > 0) result = result.filter(p => p.price >= filters.minPrice);
    if (filters.maxPrice > 0) result = result.filter(p => p.price <= filters.maxPrice);
    if (filters.search) {
      const lowerTerm = filters.search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) || 
        p.asin.toLowerCase().includes(lowerTerm) ||
        p.brand.toLowerCase().includes(lowerTerm) ||
        p.category.toLowerCase().includes(lowerTerm)
      );
    }

    setFilteredProducts(result);
  }, [filters, products, currentView, savedIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar 
         currentView={currentView} 
         setView={setView} 
         isOpen={isSidebarOpen} 
         setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="md:ml-64 min-h-screen flex flex-col transition-all duration-300">
        
        {/* Top Header (Mobile Only mostly) */}
        <header className="bg-slate-900/50 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between md:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2">
                <Menu size={24} />
            </button>
            <span className="font-bold text-white">AmzPulse</span>
            <div className="w-8"></div> {/* Spacer */}
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8">
            
            {/* VIEW: DASHBOARD / RESEARCH / WATCHLIST */}
            {(currentView === 'dashboard' || currentView === 'research' || currentView === 'watchlist') && (
                <>
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2 capitalize">{currentView}</h2>
                        <p className="text-slate-400">
                            {currentView === 'dashboard' ? 'Market Overview & Trending Products' : 
                             currentView === 'watchlist' ? 'Your Saved Opportunities' : 
                             'Deep Dive Product Research'}
                        </p>
                    </div>

                    <FilterBar filters={filters} setFilters={setFilters} />
                    
                    <div className="mt-6">
                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                            <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                                No products found. Try adjusting filters or searching a new ASIN.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* VIEW: BATCH ANALYSIS */}
            {currentView === 'batch' && <BatchAnalysis />}
            
            {/* VIEW: SETTINGS (Placeholder) */}
            {currentView === 'settings' && (
                <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-800 rounded">
                            <span>Default ROI Target</span>
                            <span className="text-amz-accent font-bold">30%</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-800 rounded">
                            <span>Prep Cost Default</span>
                            <span className="text-amz-accent font-bold">$0.00</span>
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductAnalysis 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          isSaved={savedIds.has(selectedProduct.id)}
          onToggleSave={(id) => handleToggleSave(id, id)}
        />
      )}
    </div>
  );
};

export default App;