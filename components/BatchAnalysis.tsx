import React, { useState } from 'react';
import { Play, Download, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Product } from '../types';
import { analyzeBatch as apiAnalyzeBatch } from '../services/apiClient';

const BatchAnalysis: React.FC = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapExternalToProduct = (data: any): Product => {
    return {
      id: data.asin || (data.id || Math.random().toString(36).slice(2)),
      asin: data.asin || data.id || '',
      name: data.title || data.name || 'Unknown Product',
      brand: data.brand || 'Unknown',
      category: data.category || 'Misc',
      subCategory: data.subCategory || undefined,
      price: Number(data.price || 0),
      image: data.image || `https://picsum.photos/400/400?random=${encodeURIComponent(data.asin || data.id || Math.random())}`,
      rating: Number(data.rating || 4.0),
      reviews: Number(data.reviews || 0),
      trend: Number(data.trend || 0),
      description: data.description || '',
      priceHistory: data.priceHistory || [],
      bsrHistory: data.bsrHistory || [],
      bsr: Number(data.bsr || data.rank || 0),
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
      analysis: data.analysis || undefined
    };
  };

  const handleProcess = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    setError(null);

    const asins = input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);

    try {
      const backendResults: any[] = await apiAnalyzeBatch(asins);
      const mapped: Product[] = backendResults.map(item => mapExternalToProduct(item));
      setResults(mapped);
    } catch (err) {
      console.error('Batch analyze failed, using fallback list:', err);
      setError((err as Error)?.message || 'Batch analyze failed');
      // Fallback minimal mapping to keep UX responsive
      const fallback: Product[] = asins.map(a => mapExternalToProduct({ asin: a, title: `Fallback ${a}`, price: 0, bsr: 0 }));
      // small delay to simulate processing
      await new Promise(r => setTimeout(r, 300));
      setResults(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
      setResults([]);
      setInput('');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Batch Analysis</h2>
        {results.length > 0 && (
            <button onClick={clearResults} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2">
                <Trash2 size={16} /> Clear Results
            </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <label className="block text-slate-300 font-medium mb-2">Enter ASINs (one per line or comma separated)</label>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-300 font-mono text-sm focus:border-amz-accent focus:ring-1 focus:ring-amz-accent outline-none"
                placeholder="B08H8K1234&#10;B09J9L5678&#10;B07K7M9012"
            />
            {error && <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-3">{error}</div>}
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleProcess}
                    disabled={isProcessing || !input}
                    className="bg-amz-accent text-slate-900 font-bold px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isProcessing ? (
                        <>Processing...</>
                    ) : (
                        <><Play size={18} /> Start Analysis</>
                    )}
                </button>
            </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <span className="text-slate-400 text-sm">Processed {results.length} ASINs</span>
                <button className="text-amz-accent hover:text-white text-sm flex items-center gap-2">
                    <Download size={16} /> Export CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800 text-xs uppercase text-slate-500">
                            <th className="p-4 font-bold border-b border-slate-700">Product</th>
                            <th className="p-4 font-bold border-b border-slate-700 text-right">Price</th>
                            <th className="p-4 font-bold border-b border-slate-700 text-right">BSR</th>
                            <th className="p-4 font-bold border-b border-slate-700 text-right">Sales/mo</th>
                            <th className="p-4 font-bold border-b border-slate-700 text-center">Risk</th>
                            <th className="p-4 font-bold border-b border-slate-700 text-center">AI</th>
                            <th className="p-4 font-bold border-b border-slate-700 text-right">Profit Est.</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {results.map((p, idx) => {
                            const profit = p.price - (p.price * 0.4) - p.referralFee - p.fbaFee; // Rough estimate
                            return (
                                <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded p-1 shrink-0"><img src={p.image} className="w-full h-full object-contain" /></div>
                                            <div>
                                                <div className="text-white font-medium line-clamp-1 w-48" title={p.name}>{p.name}</div>
                                                <div className="text-slate-500 text-xs font-mono">{p.asin}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-white font-mono">${p.price}</td>
                                    <td className="p-4 text-right text-slate-300 font-mono">#{p.bsr.toLocaleString()}</td>
                                    <td className="p-4 text-right text-green-400 font-mono">{p.estimatedSales.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        {p.isIpRisk || p.isHazmat ? (
                                            <span className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs font-bold border border-red-400/20">
                                                <AlertTriangle size={12} /> RISK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs font-bold border border-green-400/20">
                                                <CheckCircle size={12} /> OK
                                            </span>
                                        )}
                                    </td>

                                    {/* AI Column */}
                                    <td className="p-4 text-center">
                                        {p.analysis ? (
                                          <div className="flex flex-col items-center text-xs">
                                             <span className={`font-bold ${p.analysis.grade === 'A' ? 'text-green-300' : p.analysis.grade === 'B' ? 'text-green-200' : p.analysis.grade === 'C' ? 'text-yellow-200' : 'text-red-300'}`}>{p.analysis.grade}</span>
                                             <span className="text-slate-400 mt-1 max-w-[160px] line-clamp-2 text-[11px]">{p.analysis.suggestedAction || p.analysis.summary}</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-500 text-xs">No AI</span>
                                        )}
                                    </td>

                                    <td className="p-4 text-right font-bold text-slate-200">
                                        ${profit.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default BatchAnalysis;
