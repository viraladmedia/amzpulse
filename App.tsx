import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Product, FilterState, ViewMode } from './types';
import FilterBar from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import ProductAnalysis from './components/ProductAnalysis';
import Sidebar from './components/Sidebar';
import BatchAnalysis from './components/BatchAnalysis';
import { INITIAL_PRODUCTS, generateMockProduct } from './services/mockService';

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

  // Search Logic (Mocking API fetch for single item lookup)
  useEffect(() => {
     if (filters.search && filters.search.startsWith('B0') && filters.search.length === 10) {
         // Simulate looking up a specific ASIN if not found in current list
         const exists = products.find(p => p.asin === filters.search);
         if (!exists) {
             const newProd = generateMockProduct(filters.search);
             setProducts(prev => [newProd, ...prev]);
         }
     }
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