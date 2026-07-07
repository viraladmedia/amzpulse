import React, { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, LogIn, LogOut, Menu, Shield, Sparkles, UserPlus } from 'lucide-react';
import { FilterState, Product, ViewMode } from '../types';
import FilterBar from './FilterBar';
import { ProductCard } from './ProductCard';
import Sidebar from './Sidebar';
import { normalizeExternalProduct, normalizeExternalProducts } from '../services/productMapper';
import {
  addToWatchlist,
  createCheckoutSession,
  fetchProduct as apiFetchProduct,
  getFeaturedProducts as apiGetFeaturedProducts,
  getUsage,
  getWatchlist,
  login,
  me,
  register,
  removeFromWatchlist,
  setAuthToken as setApiAuthToken,
  type UsageSnapshot,
  type WatchlistItem
} from '../services/apiClient';

const ProductAnalysis = lazy(() => import('./ProductAnalysis'));
const BatchAnalysis = lazy(() => import('./BatchAnalysis'));
const AuthModal = lazy(() => import('./AuthModal'));

type AuthMode = 'login' | 'signup';

const PLAN_LIMITS = {
  free: { monthlyAsinQuota: 300, maxBatchSize: 20 },
  pro: { monthlyAsinQuota: 5000, maxBatchSize: 100 }
};

const isAsinInput = (value: string) => /^[A-Z0-9]{10}$/i.test(value);

const AppWorkspace: React.FC = () => {
  const [currentView, setView] = useState<ViewMode>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [watchlistMap, setWatchlistMap] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [plan, setPlan] = useState<string>('free');
  const [role, setRole] = useState<string | undefined>();
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
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
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(filters.search.trim());
  const canManageBilling = role === 'owner' || role === 'admin';
  const canUseBatch = Boolean(token && canManageBilling);
  const planLimits = plan === 'pro' ? PLAN_LIMITS.pro : PLAN_LIMITS.free;

  useEffect(() => {
    const stored = localStorage.getItem('amzpulse_token');
    if (!stored) return;

    setToken(stored);
    setApiAuthToken(stored);
    void bootstrapSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFeaturedProducts = async () => {
      try {
        setIsLoadingFeatured(true);
        const featured = await apiGetFeaturedProducts();
        if (cancelled) return;

        if (Array.isArray(featured) && featured.length > 0) {
          setProducts(normalizeExternalProducts(featured));
        } else {
          setProducts([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Featured product sync failed', err);
        setProductError((err as Error)?.message || 'Unable to load featured Amazon products');
      } finally {
        if (!cancelled) {
          setIsLoadingFeatured(false);
        }
      }
    };

    void loadFeaturedProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const bootstrapSession = async () => {
    try {
      const profile = await me();
      setUserEmail(profile.user?.email || '');
      setPlan(profile.plan || 'free');
      setRole(profile.role);

      const [watchlist, usageSnapshot] = await Promise.all([getWatchlist(), getUsage()]);
      const ids = new Set<string>();
      const map: Record<string, string> = {};

      watchlist.forEach((item: WatchlistItem) => {
        ids.add(item.productId);
        map[item.productId] = item.id;
      });

      setSavedIds(ids);
      setWatchlistMap(map);
      setUsage(usageSnapshot);
      if (usageSnapshot.plan) {
        setPlan(usageSnapshot.plan);
      }
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
      const response = await action(authForm.email, authForm.password, authMode === 'signup' ? authForm.name : undefined);
      const newToken = response.token;

      setToken(newToken);
      setApiAuthToken(newToken);
      setUserEmail(response.user?.email || '');
      setPlan(response.plan || 'free');
      setRole(response.role);
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '', name: '' });

      await bootstrapSession();
    } catch (err) {
      setAuthError((err as Error)?.message || 'Auth failed');
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
    setView('dashboard');
  };

  const handleStartCheckout = async () => {
    if (!token) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    if (!canManageBilling) {
      setProductError('Only owner or admin accounts can manage billing and upgrades.');
      return;
    }

    try {
      setBillingLoading(true);
      setProductError(null);
      const session = await createCheckoutSession();
      window.location.assign(session.url);
    } catch (err) {
      setProductError((err as Error)?.message || 'Unable to start checkout');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleToggleSave = async (eventOrId: React.MouseEvent | string, id?: string) => {
    if (typeof eventOrId === 'object' && eventOrId !== null && 'stopPropagation' in eventOrId) {
      eventOrId.stopPropagation();
    }

    const productId = typeof eventOrId === 'string' ? eventOrId : id!;
    if (!token) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    const isSaved = savedIds.has(productId);
    try {
      if (isSaved) {
        const watchId = watchlistMap[productId] || productId;
        await removeFromWatchlist(watchId);

        setSavedIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });

        setWatchlistMap((current) => {
          const next = { ...current };
          delete next[productId];
          return next;
        });
      } else {
        const result = await addToWatchlist(productId);

        setSavedIds((current) => {
          const next = new Set(current);
          next.add(productId);
          return next;
        });

        if (result?.watchlistItem?.id) {
          setWatchlistMap((current) => ({ ...current, [productId]: result.watchlistItem.id }));
        }
      }
    } catch (err) {
      console.warn('Watchlist toggle failed', err);
    }
  };

  useEffect(() => {
    const searchAsin = deferredSearch.toUpperCase();
    if (!isAsinInput(searchAsin)) return;
    if (products.some((product) => product.asin.toUpperCase() === searchAsin)) return;

    let cancelled = false;

    const fetchSearchResult = async () => {
      try {
        setIsFetchingProduct(true);
        setProductError(null);
        const data = await apiFetchProduct(searchAsin);
        if (cancelled) return;

        const nextProduct = normalizeExternalProduct(data, searchAsin);
        setProducts((current) => {
          if (current.some((product) => product.asin === nextProduct.asin)) {
            return current;
          }
          return [nextProduct, ...current];
        });
      } catch (err) {
        if (cancelled) return;

        console.warn('Backend fetch failed', err);
        setProductError((err as Error)?.message || 'Failed to fetch product');
      } finally {
        if (!cancelled) {
          setIsFetchingProduct(false);
        }
      }
    };

    void fetchSearchResult();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, products]);

  const searchTerm = deferredSearch.toLowerCase();
  const filteredProducts = useMemo(() => products.filter((product) => {
    if (currentView === 'watchlist' && !savedIds.has(product.id)) {
      return false;
    }

    if (filters.category && product.category !== filters.category) return false;
    if (filters.subCategory && product.subCategory !== filters.subCategory) return false;
    if (filters.minPrice > 0 && product.price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && product.price > filters.maxPrice) return false;
    if (filters.maxBSR > 0 && product.bsr > filters.maxBSR) return false;
    if (filters.season && !product.seasonalityTags.includes(filters.season as Product['seasonalityTags'][number])) return false;

    if (!searchTerm) return true;

    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.asin.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );
  }), [currentView, filters, products, savedIds, searchTerm]);

  const renderAuthPanel = () => (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_24px_60px_rgba(2,6,23,0.28)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Shield size={18} className="text-amz-accent" />
        {token ? (
          <div>
            <div className="font-semibold text-white">{userEmail || 'Signed in'}</div>
            <div className="text-xs text-slate-400">
              {plan.toUpperCase()} plan
              {usage ? ` • ${usage.asinsAnalyzed}/${planLimits.monthlyAsinQuota} ASINs analyzed this month` : ` • ${planLimits.maxBatchSize} ASIN batch limit`}
            </div>
          </div>
        ) : (
          <div>
            <div className="font-semibold text-white">Sign in for syncing, billing, and batch analysis</div>
            <div className="text-xs text-slate-400">Create an account to keep your watchlist and unlock plan-based usage tracking.</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {token ? (
          <>
            {canManageBilling && plan !== 'pro' && (
              <button
                onClick={handleStartCheckout}
                disabled={billingLoading}
                className="flex items-center gap-2 rounded-lg bg-amz-accent px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {billingLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Upgrade to Pro
              </button>
            )}
            {canManageBilling && plan === 'pro' && (
              <button
                onClick={handleStartCheckout}
                disabled={billingLoading}
                className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {billingLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Manage Billing
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              <LogIn size={16} />
              Login
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-amz-accent px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-orange-500"
            >
              <UserPlus size={16} />
              Sign up
            </button>
          </>
        )}
      </div>
    </div>
  );

  const viewSummary =
    currentView === 'dashboard'
      ? 'Market overview, trending products, and quick signals.'
      : currentView === 'watchlist'
      ? 'Saved opportunities synced to your account.'
      : 'Deep-dive product research and opportunity analysis.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Sidebar
        currentView={currentView}
        setView={setView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isAuthenticated={Boolean(token)}
        onLogout={handleLogout}
      />

      <div className="flex min-h-screen flex-col transition-all duration-300 md:ml-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900/70 p-4 backdrop-blur md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-white">AmzPulse Workspace</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 md:p-8">
          {renderAuthPanel()}

          {(currentView === 'dashboard' || currentView === 'research' || currentView === 'watchlist') && (
            <>
              <div className="mb-6">
                <h2 className="mb-2 text-3xl font-bold capitalize text-white">{currentView}</h2>
                <p className="text-slate-400">{viewSummary}</p>
              </div>

              <FilterBar filters={filters} setFilters={setFilters} />

              {isFetchingProduct && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  Fetching live product data...
                </div>
              )}

              {isLoadingFeatured && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  Syncing featured Amazon products...
                </div>
              )}

              {productError && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{productError}</div>
              )}

              <div className="mt-6">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 py-20 text-center text-slate-500">
                    No products found. Search a live ASIN or configure `FEATURED_ASINS` in the server environment to seed the dashboard.
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'batch' &&
            (canUseBatch ? (
              <>
                <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
                  <div className="text-sm font-medium text-white">Batch access is enabled for this workspace.</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Current limit: {planLimits.maxBatchSize} ASINs per run, {planLimits.monthlyAsinQuota} ASINs per month.
                  </div>
                </div>
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                      <Loader2 className="mx-auto mb-3 animate-spin" size={20} />
                      Loading batch analysis...
                    </div>
                  }
                >
                  <BatchAnalysis />
                </Suspense>
              </>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <h3 className="text-2xl font-bold text-white">
                  {token ? 'Batch access requires an owner or admin seat' : 'Batch analysis requires a signed-in workspace'}
                </h3>
                <p className="text-slate-400">
                  {token
                    ? 'Ask your workspace owner or admin to run batches, or switch to an account with billing access.'
                    : 'Sign in to unlock watchlists, usage tracking, and batch runs.'}
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  {!token && (
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setShowAuthModal(true);
                      }}
                      className="rounded-lg bg-amz-accent px-4 py-2 font-bold text-slate-900 hover:bg-orange-500"
                    >
                      Login
                    </button>
                  )}
                  {token && !canManageBilling && (
                    <button
                      onClick={() => setView('dashboard')}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
                    >
                      Back to dashboard
                    </button>
                  )}
                </div>
              </div>
            ))}

          {currentView === 'settings' && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="mb-6 text-2xl font-bold text-white">Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-800 p-4">
                  <span>Workspace Plan</span>
                  <span className="font-bold text-amz-accent">{plan.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800 p-4">
                  <span>Monthly Quota</span>
                  <span className="font-bold text-amz-accent">{planLimits.monthlyAsinQuota.toLocaleString()} ASINs</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800 p-4">
                  <span>Max Batch Size</span>
                  <span className="font-bold text-amz-accent">{planLimits.maxBatchSize} ASINs</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {selectedProduct && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 text-slate-200">
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-6">
                <Loader2 className="animate-spin" size={18} />
                Loading product insights...
              </div>
            </div>
          }
        >
          <ProductAnalysis
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            isSaved={savedIds.has(selectedProduct.id)}
            onToggleSave={(productId) => handleToggleSave(productId)}
          />
        </Suspense>
      )}

      {showAuthModal && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 text-slate-200">
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-6">
                <Loader2 className="animate-spin" size={18} />
                Loading auth...
              </div>
            </div>
          }
        >
          <AuthModal
            authMode={authMode}
            setAuthMode={setAuthMode}
            authForm={authForm}
            setAuthForm={setAuthForm}
            authError={authError}
            authLoading={authLoading}
            onClose={() => setShowAuthModal(false)}
            onSubmit={handleAuthSubmit}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AppWorkspace;
