import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Activity, Copy, Save, RefreshCw, ShieldCheck, TrendingUp, Calculator, Heart, Download, ExternalLink, Truck, Package, Box, Warehouse } from 'lucide-react';
import { Product, AnalysisResult } from '../types';
import { analyzeProductSellPotential } from '../services/geminiService';
import TrendChart from './TrendChart';

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
  
  // State for Calculator
  const [fulfillmentMode, setFulfillmentMode] = useState<'FBA' | 'FBM'>('FBA');
  const [salePrice, setSalePrice] = useState<number>(product.price);
  const [buyCost, setBuyCost] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0); // For FBM
  
  const [roi, setRoi] = useState<number>(0);
  const [profit, setProfit] = useState<number>(0);
  const [margin, setMargin] = useState<number>(0);

  // Calculations
  useEffect(() => {
    let totalFees = 0;
    
    if (fulfillmentMode === 'FBA') {
        totalFees = product.fbaFee + product.referralFee;
    } else {
        // FBM: Referral Fee + User defined shipping cost
        totalFees = product.referralFee + shippingCost;
    }

    const calculatedProfit = salePrice - buyCost - totalFees;
    const calculatedRoi = buyCost > 0 ? (calculatedProfit / buyCost) * 100 : 0;
    const calculatedMargin = salePrice > 0 ? (calculatedProfit / salePrice) * 100 : 0;

    setProfit(parseFloat(calculatedProfit.toFixed(2)));
    setRoi(parseFloat(calculatedRoi.toFixed(2)));
    setMargin(parseFloat(calculatedMargin.toFixed(2)));
  }, [salePrice, buyCost, shippingCost, fulfillmentMode, product.fbaFee, product.referralFee]);

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

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400 border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.3)]';
      case 'B': return 'text-blue-400 border-blue-500 bg-blue-500/20';
      case 'C': return 'text-yellow-400 border-yellow-500 bg-yellow-500/20';
      case 'D': return 'text-orange-400 border-orange-500 bg-orange-500/20';
      default: return 'text-red-400 border-red-500 bg-red-500/20';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    const csvContent = `data:text/csv;charset=utf-8,Product,ASIN,Method,Buy Cost,Sale Price,Shipping(FBM),Profit,ROI,Margin,Grade,FBA Verdict,FBM Verdict\n"${product.name}",${product.asin},${fulfillmentMode},${buyCost},${salePrice},${fulfillmentMode === 'FBM' ? shippingCost : 'N/A'},${profit},${roi}%,${margin}%,${analysis?.grade || 'N/A'},"${analysis?.fbaAnalysis || ''}","${analysis?.fbmAnalysis || ''}"`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${product.asin}_analysis.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl bg-slate-900 md:rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        
        {/* Top Bar */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-start shrink-0">
            <div className="flex gap-4 w-full pr-10">
                <div className="w-12 h-12 bg-white rounded-md shrink-0 overflow-hidden p-1">
                    <img src={product.image} className="w-full h-full object-contain" alt="Product" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-sm md:text-lg truncate">{product.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="bg-slate-700 px-2 py-0.5 rounded text-slate-200 font-mono select-all flex items-center gap-1 cursor-pointer hover:bg-slate-600" onClick={() => copyToClipboard(product.asin)}>
                            {product.asin} <Copy size={10} />
                        </span>
                        <button 
                            onClick={() => onToggleSave(product.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${isSaved ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-slate-700 border-transparent text-slate-300 hover:border-slate-500'}`}
                        >
                            <Heart size={10} fill={isSaved ? "currentColor" : "none"}/> {isSaved ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white transition-colors">
              <X size={20} />
            </button>
        </div>

        {/* Main Grid Scrollable */}
        <div className="flex-1 overflow-y-auto md:grid md:grid-cols-12 md:auto-rows-min">
            
            {/* Left Panel: Quick Info (Col 1-3) */}
            <div className="md:col-span-3 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-700 p-4 space-y-6">
                
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-400 text-xs font-bold uppercase">Sales Rank</h3>
                        <TrendingUp size={14} className="text-amz-accent"/>
                    </div>
                    <div className="text-3xl font-black text-white">#{product.bsr.toLocaleString()}</div>
                    <div className="text-green-400 text-xs font-semibold mt-1">Top 1% in {product.category}</div>
                    <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm">
                        <span className="text-slate-400">Est. Sales</span>
                        <span className="text-white font-bold">{product.estimatedSales.toLocaleString()}/mo</span>
                    </div>
                </div>

                <div className="space-y-2">
                     <div className="flex items-center gap-3 bg-green-900/20 border border-green-900/50 p-3 rounded-lg">
                        <CheckCircleIcon />
                        <div>
                            <div className="text-green-400 text-sm font-bold">Eligible to Sell</div>
                            <div className="text-green-600 text-xs">Ungated</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-900/50 p-3 rounded-lg">
                        <ShieldCheck className="text-blue-500" size={18} />
                        <div>
                            <div className="text-blue-400 text-sm font-bold">IP Analysis</div>
                            <div className="text-blue-600 text-xs">No known complaints</div>
                        </div>
                     </div>
                </div>

                 <div className="text-xs text-slate-400 space-y-2 p-2 border-t border-slate-800 mt-4">
                    <div className="flex justify-between"><span>Weight:</span> <span className="text-slate-200">{product.weight}</span></div>
                    <div className="flex justify-between"><span>Dimensions:</span> <span className="text-slate-200">{product.dimensions}</span></div>
                    <div className="flex justify-between"><span>Sellers:</span> <span className="text-slate-200">{product.sellers} (2 FBA)</span></div>
                </div>
            </div>

            {/* Center Panel: Calculator (Col 4-7) */}
            <div className="md:col-span-4 bg-slate-800/30 border-b md:border-b-0 md:border-r border-slate-700 p-4 md:p-6">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Calculator size={18} className="text-amz-accent"/> Profit Calculator
                    </h3>
                    {/* FBA / FBM Toggle */}
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setFulfillmentMode('FBA')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${fulfillmentMode === 'FBA' ? 'bg-amz-accent text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            FBA
                        </button>
                        <button 
                            onClick={() => setFulfillmentMode('FBM')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${fulfillmentMode === 'FBM' ? 'bg-amz-accent text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            FBM
                        </button>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Sale Price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <input 
                                    type="number" 
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-7 pr-2 text-white font-bold focus:border-amz-accent focus:ring-1 focus:ring-amz-accent outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-amz-accent text-xs font-bold mb-1 uppercase">Cost Price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <input 
                                    type="number" 
                                    value={buyCost}
                                    onChange={(e) => setBuyCost(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-amz-accent rounded-lg py-2 pl-7 pr-2 text-white font-bold focus:ring-1 focus:ring-amz-accent outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner">
                        <div className="text-center border-r border-slate-700">
                            <div className={`text-lg font-black ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>${profit}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Profit</div>
                        </div>
                         <div className="text-center border-r border-slate-700">
                            <div className={`text-lg font-black ${roi > 30 ? 'text-green-400' : roi > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{roi}%</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">ROI</div>
                        </div>
                         <div className="text-center">
                            <div className={`text-lg font-black ${margin > 15 ? 'text-green-400' : margin > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{margin}%</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Margin</div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-700/50">
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Referral Fee (15%)</span>
                            <span>-${product.referralFee.toFixed(2)}</span>
                        </div>
                        
                        {fulfillmentMode === 'FBA' ? (
                            <div className="flex justify-between text-sm text-slate-400">
                                <span className="flex items-center gap-1"><Package size={12} /> FBA Fee</span>
                                <span>-${product.fbaFee.toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center text-sm text-slate-400">
                                <span className="flex items-center gap-1"><Truck size={12} /> Shipping Cost</span>
                                <div className="relative w-20">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <input 
                                        type="number"
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded py-0.5 pl-5 pr-1 text-right text-xs text-white focus:border-amz-accent outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between text-sm text-slate-400 pt-2 border-t border-slate-700/30">
                            <span>Total Fees</span>
                            <span className="text-red-400">
                                -${(fulfillmentMode === 'FBA' 
                                    ? product.referralFee + product.fbaFee 
                                    : product.referralFee + shippingCost
                                ).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4">
                        <h4 className="text-slate-500 text-xs font-bold uppercase mb-3">Reverse Sourcing</h4>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-xs transition-colors">
                                <ShoppingCart size={14} /> Google
                             </a>
                             <a href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-800/50 rounded-lg text-xs transition-colors">
                                <ExternalLink size={14} /> eBay
                             </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <a href={`https://www.walmart.com/search?q=${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-800/50 rounded-lg text-xs transition-colors">
                                <ExternalLink size={14} /> Walmart
                             </a>
                             <button onClick={handleExport} className="flex items-center justify-center gap-2 p-2 bg-green-700/20 hover:bg-green-700/30 text-green-400 border border-green-800 rounded-lg text-xs transition-colors">
                                <Download size={14} /> Export CSV
                             </button>
                        </div>
                    </div>
                 </div>
            </div>

            {/* Right Panel: Gemini Analysis (Col 8-12) */}
            <div className="md:col-span-5 p-4 md:p-6 space-y-6">
                 <div className="flex justify-between items-center">
                     <h3 className="text-white font-bold flex items-center gap-2">
                        <Activity className="text-amz-accent" size={18} /> AI Analysis
                     </h3>
                     <button onClick={handleAnalysis} className="text-slate-400 hover:text-white">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                     </button>
                 </div>

                 {loading ? (
                     <div className="h-64 flex flex-col items-center justify-center space-y-4 border border-slate-700 border-dashed rounded-xl">
                         <div className="w-8 h-8 border-2 border-amz-accent border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-slate-500 text-sm animate-pulse">Analyzing marketplace data...</p>
                     </div>
                 ) : analysis ? (
                     <div className="space-y-4">
                         <div className="flex gap-4 items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                             <div className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 text-3xl font-black shadow-lg ${getGradeColor(analysis.grade)}`}>
                                {analysis.grade}
                             </div>
                             <div>
                                 <div className="text-white font-bold mb-1">Confidence Score: {analysis.score}/100</div>
                                 <div className="text-slate-400 text-xs leading-relaxed line-clamp-2">{analysis.summary}</div>
                             </div>
                         </div>

                         {/* FBA / FBM Split Analysis */}
                         <div className="grid grid-cols-2 gap-3">
                             <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="text-xs text-amz-accent uppercase font-bold mb-1 flex items-center gap-1"><Warehouse size={12}/> FBA Verdict</div>
                                <div className="text-slate-200 text-xs">{analysis.fbaAnalysis}</div>
                            </div>
                             <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="text-xs text-blue-400 uppercase font-bold mb-1 flex items-center gap-1"><Truck size={12}/> FBM Verdict</div>
                                <div className="text-slate-200 text-xs">{analysis.fbmAnalysis}</div>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Verdict</div>
                                <div className="text-white text-sm font-semibold">{analysis.suggestedAction}</div>
                            </div>
                             <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Competition</div>
                                <div className={`text-sm font-semibold ${analysis.competitionLevel === 'High' ? 'text-red-400' : 'text-green-400'}`}>{analysis.competitionLevel}</div>
                            </div>
                         </div>
                        
                        {/* Dual Axis Chart */}
                         <div className="w-full mt-4">
                             <TrendChart priceData={product.priceHistory} bsrData={product.bsrHistory} />
                         </div>
                     </div>
                 ) : (
                     <div className="text-red-400 text-sm">Analysis failed.</div>
                 )}
            </div>

        </div>
      </div>
    </div>
  );
};

// Helper component for check icon
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default ProductAnalysis;