import React, { useState, useEffect } from 'react';
import { Menu, LogIn, UserPlus, Loader2, Shield, LogOut } from 'lucide-react';
import { Product, FilterState, ViewMode } from './types';
import FilterBar from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import ProductAnalysis from './components/ProductAnalysis';
import Sidebar from './components/Sidebar';
import BatchAnalysis from './components/BatchAnalysis';
import { INITIAL_PRODUCTS, generateMockProduct } from './services/mockService';
import {
  fetchProduct as apiFetchProduct,
  login,
  register,
  me,
  getUsage,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  setAuthToken as setApiAuthToken
} from './services/apiClient';

type AuthMode = 'login' | 'signup';

const App: React.FC = () => {
  // Navigation state
  const [currentView, setView] = useState<ViewMode>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Product state
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [watchlistMap, setWatchlistMap] = useState<Record<string, string>>({});

  // Auth + plan state
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [plan, setPlan] = useState<string>('free');
  const [role, setRole] = useState<string | undefined>();
  const [usage, setUsage] = useState<any | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form state
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
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

  // UX state
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const canUseBatch = Boolean(token && plan === 'pro');

  // Persisted session
  useEffect(() => {
    const stored = localStorage.getItem('amzpulse_token');
    if (stored) {
      setToken(stored);
      setApiAuthToken(stored);
      bootstrapSession(stored);
    }
  }, []);

  const bootstrapSession = async (activeToken: string) => {
    try {
      const profile = await me();
      setUserEmail(profile.user?.email || '');
      setPlan(profile.plan || 'free');
      setRole(profile.role);
      const w = await getWatchlist();
      const ids = new Set<string>();
      const map: Record<string, string> = {};
      w.forEach((item: any) => {
        ids.add(item.productId);
        map[item.productId] = item.id;
      });
      setSavedIds(ids);
      setWatchlistMap(map);
      const u = await getUsage();
      setUsage(u);
    } catch (err) {
      console.warn('Session bootstrap failed', err);
      handleLogout();
    }
  };

  const handleAuthSubmit = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const action = authMode === 'login' ? login : register;
      const resp = await action(authForm.email, authForm.password, authMode === 'signup' ? authForm.name : undefined);
      const newToken = resp.token;
      setToken(newToken);
      setApiAuthToken(newToken);
      setUserEmail(resp.user?.email || '');
      setPlan(resp.plan || 'free');
      setRole(resp.role);
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '', name: '' });
      await bootstrapSession(newToken);
    } catch (err: any) {
      setAuthError(err?.message || 'Auth failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setApiAuthToken(null);
    setUserEmail('');
    setPlan('free');
    setRole(undefined);
    setSavedIds(new Set());
    setWatchlistMap({});
    setUsage(null);
  };

  // Toggle Save Handler (now wired to backend)
  const handleToggleSave = async (e: React.MouseEvent | string, id?: string) => {
    if (typeof e === 'object' && e !== null && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    const productId = typeof e === 'string' ? e : id!;
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    const isSaved = savedIds.has(productId);
    try {
      if (isSaved) {
        const watchId = watchlistMap[productId] || productId;
        await removeFromWatchlist(watchId);
        const next = new Set(savedIds);
        next.delete(productId);
        setSavedIds(next);
      } else {
        const res = await addToWatchlist(productId);
        const next = new Set(savedIds);
        next.add(productId);
        setSavedIds(next);
        if (res?.watchlistItem?.id) {
          setWatchlistMap((prev) => ({ ...prev, [productId]: res.watchlistItem.id }));
        }
      }
    } catch (err) {
      console.warn('Watchlist toggle failed', err);
    }
  };

  // Search Logic: fetch real product from backend when full ASIN is typed, map many fields
  useEffect(() => {
    const tryFetch = async () => {
      if (filters.search && filters.search.startsWith('B0') && filters.search.length === 10) {
        const exists = products.find((p) => p.asin === filters.search);
        if (!exists) {
          try {
            setIsFetchingProduct(true);
            setProductError(null);
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
            setProducts((prev) => [newProd, ...prev]);
          } catch (err: any) {
            console.warn('Backend fetch failed, generating local mock:', err);
            setProductError(err?.message || 'Failed to fetch product');
            const newProd = generateMockProduct(filters.search);
            setProducts((prev) => [newProd, ...prev]);
          } finally {
            setIsFetchingProduct(false);
          }
        }
      }
    };
    tryFetch();
  }, [filters.search, products]);

  // Filtering Logic
  useEffect(() => {
    let result = products;

    // View specific filtering
    if (currentView === 'watchlist') {
      result = result.filter((p) => savedIds.has(p.id));
    }

    // Standard Filters
    if (filters.category) result = result.filter((p) => p.category === filters.category);
    if (filters.subCategory) result = result.filter((p) => p.subCategory === filters.subCategory);
    if (filters.minPrice > 0) result = result.filter((p) => p.price >= filters.minPrice);
    if (filters.maxPrice > 0) result = result.filter((p) => p.price <= filters.maxPrice);
    if (filters.search) {
      const lowerTerm = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerTerm) ||
          p.asin.toLowerCase().includes(lowerTerm) ||
          p.brand.toLowerCase().includes(lowerTerm) ||
          p.category.toLowerCase().includes(lowerTerm)
      );
    }

    setFilteredProducts(result);
  }, [filters, products, currentView, savedIds]);

  const renderAuthPanel = () => (
    <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-3">
        <Shield size={18} className="text-amz-accent" />
        {token ? (
          <div>
            <div className="text-white font-semibold">{userEmail || 'Signed in'}</div>
            <div className="text-xs text-slate-400">Plan: {plan?.toUpperCase()} {plan !== 'pro' && '(upgrade for batch)'}</div>
          </div>
        ) : (
          <div>
            <div className="text-white font-semibold">Sign in for syncing & batch analysis</div>
            <div className="text-xs text-slate-400">Keep your watchlist across devices and unlock higher limits.</div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {token ? (
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 flex items-center gap-2 text-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 flex items-center gap-2 text-sm"
            >
              <LogIn size={16} /> Login
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="px-3 py-2 rounded-lg bg-amz-accent text-slate-900 font-bold flex items-center gap-2 text-sm hover:bg-orange-500"
            >
              <UserPlus size={16} /> Sign up
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} setView={setView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="md:ml-64 min-h-screen flex flex-col transition-all duration-300">
        {/* Top Header (Mobile Only mostly) */}
        <header className="bg-slate-900/50 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2">
            <Menu size={24} />
          </button>
          <span className="font-bold text-white">AmzPulse</span>
          <div className="w-8"></div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8">
          {renderAuthPanel()}

          {/* VIEW: DASHBOARD / RESEARCH / WATCHLIST */}
          {(currentView === 'dashboard' || currentView === 'research' || currentView === 'watchlist') && (
            <>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-2 capitalize">{currentView}</h2>
                <p className="text-slate-400">
                  {currentView === 'dashboard'
                    ? 'Market Overview & Trending Products'
                    : currentView === 'watchlist'
                    ? 'Your Saved Opportunities'
                    : 'Deep Dive Product Research'}
                </p>
              </div>

              <FilterBar filters={filters} setFilters={setFilters} />

              {isFetchingProduct && (
                <div className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Fetching live product data...
                </div>
              )}
              {productError && <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-3">{productError}</div>}

              <div className="mt-6">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
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
          {currentView === 'batch' &&
            (canUseBatch ? (
              <BatchAnalysis />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
                <h3 className="text-2xl font-bold text-white mb-2">Batch Analysis requires Pro + login</h3>
                <p className="text-slate-400">
                  Sign in to your workspace and upgrade to Pro to unlock larger batch runs and usage tracking.
                </p>
                <div className="flex justify-center gap-3 mt-4">
                  {!token && (
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setShowAuthModal(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-amz-accent text-slate-900 font-bold hover:bg-orange-500"
                    >
                      Login
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500"
                  >
                    Upgrade / Signup
                  </button>
                </div>
              </div>
            ))}

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

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md relative">
            <button className="absolute top-3 right-3 text-slate-500 hover:text-white" onClick={() => setShowAuthModal(false)}>
              ✕
            </button>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{authMode === 'login' ? 'Login' : 'Create account'}</h3>
              <button
                className="text-xs text-amz-accent hover:text-white"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              >
                {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
              </button>
            </div>
            <div className="space-y-3">
              {authMode === 'signup' && (
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amz-accent"
                  placeholder="Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
                />
              )}
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amz-accent"
                placeholder="Email"
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amz-accent"
                placeholder="Password"
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
              />
              {authError && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{authError}</div>}
              <button
                onClick={handleAuthSubmit}
                disabled={authLoading}
                className="w-full mt-2 bg-amz-accent text-slate-900 font-bold py-2 rounded-lg hover:bg-orange-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {authLoading && <Loader2 size={16} className="animate-spin" />}
                {authMode === 'login' ? 'Login' : 'Sign up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
