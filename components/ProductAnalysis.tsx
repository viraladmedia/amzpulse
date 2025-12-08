import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Activity, Copy, Save, RefreshCw, ShieldCheck, TrendingUp, Calculator, Heart, Download, ExternalLink, Truck, Package, Box, Warehouse, AlertOctagon, Flame, Calendar } from 'lucide-react';
import { Product, AnalysisResult } from '../types';
import { analyzeProductSellPotential } from '../services/geminiService';
import TrendChart from './TrendChart';
import { fetchProduct as apiFetchProduct } from '../services/apiClient';

interface ProductAnalysisProps {
  product: Product;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ product, onClose, isSaved, onToggleSave }) => {
  // State for Analysis
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(product.analysis || null);
  const [loading, setLoading] = useState(!product.analysis);
  const [activeTab, setActiveTab] = useState<'overview' | 'calculator' | 'history' | 'risks'>('overview');
  
  // State for Calculator V2
  const [fulfillmentMode, setFulfillmentMode] = useState<'FBA' | 'FBM'>('FBA');
  const [salePrice, setSalePrice] = useState<number>(product.price);
  const [buyCost, setBuyCost] = useState<number>(0);
  const [prepCost, setPrepCost] = useState<number>(0);
  const [shippingToAmz, setShippingToAmz] = useState<number>(0.50); // Default per unit inbound
  const [shippingCostFbm, setShippingCostFbm] = useState<number>(0); // Outbound for FBM
  
  const [roi, setRoi] = useState<number>(0);
  const [profit, setProfit] = useState<number>(0);
  const [margin, setMargin] = useState<number>(0);

  // Calculations
  useEffect(() => {
    let totalFees = 0;
    
    if (fulfillmentMode === 'FBA') {
        // Price - (BuyCost + Prep + ShipToAmz + Referral + FBA + Storage)
        totalFees = product.referralFee + product.fbaFee + product.storageFee + prepCost + shippingToAmz;
    } else {
        // FBM: Price - (BuyCost + Prep + Referral + OutboundShip)
        totalFees = product.referralFee + prepCost + shippingCostFbm;
    }

    const calculatedProfit = salePrice - buyCost - totalFees;
    const calculatedRoi = buyCost > 0 ? (calculatedProfit / buyCost) * 100 : 0;
    const calculatedMargin = salePrice > 0 ? (calculatedProfit / salePrice) * 100 : 0;

    setProfit(parseFloat(calculatedProfit.toFixed(2)));
    setRoi(parseFloat(calculatedRoi.toFixed(2)));
    setMargin(parseFloat(calculatedMargin.toFixed(2)));
  }, [salePrice, buyCost, prepCost, shippingToAmz, shippingCostFbm, fulfillmentMode, product]);

  // AI Fetch
  useEffect(() => {
    if (!product.analysis) {
      handleAnalysis();
    }
  }, [product]);

  const handleAnalysis = async () => {
    setLoading(true);
    const stats = buyCost > 0 ? { buyCost, profit, roi } : undefined;
    const result = await analyzeProductSellPotential(product, stats);
    setAnalysis(result);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end md:justify-center p-0 md:p-4 bg-black/90 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full h-full md:h-[90vh] md:max-w-6xl bg-slate-900 md:rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-12 h-12 bg-white rounded border border-slate-700 shrink-0 p-1">
                    <img src={product.image} className="w-full h-full object-contain" alt="Product" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">{product.name}</h2>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono bg-slate-800 px-1.5 rounded">{product.asin}</span>
                        <span className="flex items-center gap-1 text-slate-500"><Box size={12}/> {product.category}</span>
                        {product.brand && <span className="text-amz-accent font-bold">{product.brand}</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => onToggleSave(product.id)} className={`p-2 rounded-full border ${isSaved ? 'bg-pink-500 text-white border-pink-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                    <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
                </button>
                <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
            {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'calculator', label: 'Profit & ROI', icon: Calculator },
                { id: 'history', label: 'History', icon: Calendar },
                { id: 'risks', label: 'Risks & Flags', icon: AlertOctagon }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id ? 'border-amz-accent text-white bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="grid md:grid-cols-12 gap-6">
                    {/* Left Column: Key Metrics */}
                    <div className="md:col-span-4 space-y-6">
                         {/* Rank Box */}
                         <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={64} className="text-amz-accent"/>
                            </div>
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Best Sellers Rank</h3>
                            <div className="text-4xl font-black text-white mb-1">#{product.bsr.toLocaleString()}</div>
                            <div className="inline-block bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded">Top 1% Category</div>
                            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Est. Sales</span>
                                <span className="text-xl font-bold text-white">{product.estimatedSales.toLocaleString()} <span className="text-xs text-slate-500 font-normal">/mo</span></span>
                            </div>
                         </div>

                         {/* Seller Box */}
                         <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="text-slate-400 text-xs font-bold uppercase">Competition Snapshot</h3>
                                <div className={`text-xs font-bold px-2 py-1 rounded ${product.sellers > 10 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {product.sellers > 10 ? 'High' : 'Low'} Comp
                                </div>
                             </div>
                             <div className="space-y-3">
                                 <div className="flex justify-between text-sm">
                                     <span className="text-slate-400">Total Offers</span>
                                     <span className="text-white font-bold">{product.sellers}</span>
                                 </div>
                                 <div className="flex justify-between text-sm">
                                     <span className="text-slate-400">Buy Box Type</span>
                                     <span className="text-white font-bold">FBA</span>
                                 </div>
                                 <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                     <div className="bg-amz-accent h-full w-[70%]" title="70% FBA"></div>
                                 </div>
                                 <div className="flex justify-between text-[10px] text-slate-500">
                                     <span>FBA (Est 70%)</span>
                                     <span>FBM (Est 30%)</span>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* Right Column: AI Analysis */}
                    <div className="md:col-span-8 space-y-4">
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold flex items-center gap-2"><Activity className="text-amz-accent"/> Gemini Intelligence</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleAnalysis} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          setLoading(true);
                                          const data = await apiFetchProduct(product.asin);
                                          if (data && data.analysis) setAnalysis(data.analysis);
                                        } catch (e) {
                                          console.warn('Backend analysis fetch failed', e);
                                        } finally {
                                          setLoading(false);
                                        }
                                      }}
                                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 text-xs"
                                    >
                                      Get Backend Analysis
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-slate-400 text-sm animate-pulse">Analyzing market signals...</div>
                            ) : analysis ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="text-5xl font-black text-green-400">{analysis.grade}</div>
                                        <div>
                                            <div className="text-white font-bold">Confidence: {analysis.score}/100</div>
                                            <p className="text-slate-300 text-sm mt-1">{analysis.summary}</p>
                                        </div>
                                    </div>

                                    {/* NEW: Pros / Cons */}
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                            <span className="text-xs text-amz-accent font-bold uppercase">Pros</span>
                                            <ul className="mt-2 text-slate-300 text-sm list-disc list-inside">
                                                {analysis.pros?.slice(0,5).map((p, i) => <li key={i}>{p}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                            <span className="text-xs text-red-400 font-bold uppercase">Cons</span>
                                            <ul className="mt-2 text-slate-300 text-sm list-disc list-inside">
                                                {analysis.cons?.slice(0,5).map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* NEW: Signals */}
                                    <div className="grid grid-cols-3 gap-4 mt-4">
                                        <div className="bg-slate-900 p-3 rounded border border-slate-700 text-sm">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Competition</div>
                                            <div className="text-white font-bold mt-1">{analysis.competitionLevel}</div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded border border-slate-700 text-sm">
                                            <div className="text-xs text-slate-400 uppercase font-bold">Demand</div>
                                            <div className="text-white font-bold mt-1">{analysis.demandLevel}</div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded border border-slate-700 text-sm">
                                            <div className="text-xs text-slate-400 uppercase font-bold">IP Risk</div>
                                            <div className="text-white font-bold mt-1">{analysis.ipRiskAssessment}</div>
                                        </div>
                                    </div>

                                    {/* NEW: Seasonality & Suggested Action */}
                                    <div className="bg-slate-900 p-4 rounded border border-slate-700 mt-4">
                                        <div className="text-xs text-slate-400 uppercase font-bold">Seasonality</div>
                                        <div className="text-slate-200 mt-1 text-sm">{analysis.seasonalityInsight}</div>
                                        <div className="text-xs text-slate-400 uppercase font-bold mt-3">Suggested Action</div>
                                        <div className="text-amz-accent font-bold mt-1">{analysis.suggestedAction}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-red-400">Analysis unavailable.</div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(product.name)}`} target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-3 text-center text-sm font-bold text-white transition-colors">
                                Google Shop
                             </a>
                             <a href={`https://www.amazon.com/dp/${product.asin}`} target="_blank" className="bg-amz-accent/10 hover:bg-amz-accent/20 border border-amz-accent/50 rounded-lg p-3 text-center text-sm font-bold text-amz-accent transition-colors">
                                View on Amazon
                             </a>
                        </div>
                    </div>
                </div>
            )}

            {/* CALCULATOR TAB */}
            {activeTab === 'calculator' && (
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 w-fit">
                            <button onClick={() => setFulfillmentMode('FBA')} className={`px-4 py-2 text-sm font-bold rounded transition-all ${fulfillmentMode === 'FBA' ? 'bg-amz-accent text-slate-900 shadow' : 'text-slate-400'}`}>FBA Mode</button>
                            <button onClick={() => setFulfillmentMode('FBM')} className={`px-4 py-2 text-sm font-bold rounded transition-all ${fulfillmentMode === 'FBM' ? 'bg-amz-accent text-slate-900 shadow' : 'text-slate-400'}`}>FBM Mode</button>
                        </div>
                        
                        <div className="space-y-4">
                             {/* Inputs */}
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-slate-400 text-xs uppercase font-bold">Sell Price</label>
                                    <input type="number" value={salePrice} onChange={e => setSalePrice(parseFloat(e.target.value)||0)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-bold mt-1" />
                                </div>
                                <div>
                                    <label className="text-amz-accent text-xs uppercase font-bold">Buy Cost</label>
                                    <input type="number" value={buyCost} onChange={e => setBuyCost(parseFloat(e.target.value)||0)} className="w-full bg-slate-800 border border-amz-accent rounded p-2 text-white font-bold mt-1" autoFocus/>
                                </div>
                             </div>
                             
                             {/* Secondary Inputs */}
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-slate-400 text-xs uppercase font-bold">Prep / Unit</label>
                                    <input type="number" value={prepCost} onChange={e => setPrepCost(parseFloat(e.target.value)||0)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-300 text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs uppercase font-bold">{fulfillmentMode === 'FBA' ? 'Inbound Ship' : 'Outbound Ship'}</label>
                                    <input 
                                        type="number" 
                                        value={fulfillmentMode === 'FBA' ? shippingToAmz : shippingCostFbm} 
                                        onChange={e => fulfillmentMode === 'FBA' ? setShippingToAmz(parseFloat(e.target.value)||0) : setShippingCostFbm(parseFloat(e.target.value)||0)} 
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-300 text-sm mt-1" 
                                    />
                                </div>
                             </div>
                        </div>

                        {/* Breakdown */}
                        <div className="bg-slate-800 rounded-lg p-4 space-y-2 text-sm border border-slate-700">
                             <div className="flex justify-between text-slate-400"><span>Referral Fee</span> <span>-${product.referralFee.toFixed(2)}</span></div>
                             {fulfillmentMode === 'FBA' && (
                                <>
                                    <div className="flex justify-between text-slate-400"><span>FBA Fee</span> <span>-${product.fbaFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-slate-400"><span>Storage (1mo)</span> <span>-${product.storageFee.toFixed(2)}</span></div>
                                </>
                             )}
                             <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-slate-200">
                                <span>Total Fees/Costs</span>
                                <span className="text-red-400">-${(salePrice - profit - buyCost).toFixed(2)}</span>
                             </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex flex-col justify-center gap-6">
                        <div className="text-center">
                            <div className="text-sm text-slate-400 uppercase font-bold mb-1">Net Profit / Unit</div>
                            <div className={`text-5xl font-black ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>${profit.toFixed(2)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-4 rounded-xl text-center border border-slate-700">
                                <div className={`text-2xl font-bold ${roi > 30 ? 'text-green-400' : 'text-yellow-400'}`}>{roi}%</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">ROI</div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-xl text-center border border-slate-700">
                                <div className={`text-2xl font-bold ${margin > 15 ? 'text-green-400' : 'text-yellow-400'}`}>{margin}%</div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Margin</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RISKS TAB */}
            {activeTab === 'risks' && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-xl border ${product.isIpRisk ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'}`}>
                            <div className="flex items-center gap-2 font-bold mb-2">
                                <ShieldCheck size={20} /> IP Complaints
                            </div>
                            <p className="text-sm opacity-80">{product.isIpRisk ? 'Warning: Brand known for IP claims.' : 'Low Risk: No recent complaints detected.'}</p>
                        </div>

                        <div className={`p-4 rounded-xl border ${product.isHazmat ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <div className="flex items-center gap-2 font-bold mb-2">
                                <Flame size={20} /> Hazmat Status
                            </div>
                            <p className="text-sm opacity-80">{product.isHazmat ? 'Warning: Product flagged as Hazmat.' : 'Standard Product.'}</p>
                        </div>

                        <div className={`p-4 rounded-xl border ${product.isOversized ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <div className="flex items-center gap-2 font-bold mb-2">
                                <Box size={20} /> Size Tier
                            </div>
                            <p className="text-sm opacity-80">{product.isOversized ? 'Oversized: Higher FBA Fees.' : 'Standard Size.'}</p>
                        </div>
                    </div>

                    {/* Seasonality */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Calendar size={18}/> Seasonality</h3>
                        <div className="flex gap-2 mb-4">
                            {product.seasonalityTags?.map(tag => (
                                <span key={tag} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/30">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <p className="text-slate-400 text-sm">
                            Historical data suggests this product performs best during {product.seasonalityTags?.join(', ')}. Ensure stock is sent in 30 days prior.
                        </p>
                    </div>
                </div>
            )}
            
            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="h-[400px]">
                    <TrendChart priceData={product.priceHistory} bsrData={product.bsrHistory} />
                    <div className="mt-4 text-center text-xs text-slate-500">
                        Showing 90-day history. Upgrade to Pro for 365-day data.
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;