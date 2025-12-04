import React, { useState } from 'react';
import { Play, Download, Trash2, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { Product } from '../types';
import { generateMockProduct } from '../services/mockService';
import { analyzeProductSellPotential } from '../services/geminiService';

const BatchAnalysis: React.FC = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);

    // Parse input (split by newlines or commas)
    const asins = input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    // Simulate processing delay and fetching
    const newProducts: Product[] = [];
    
    // Process in chunks to simulate API work
    for (const asin of asins) {
        // Generate mock data for this ASIN
        const product = generateMockProduct(asin, { asin: asin });
        
        // Quick AI analysis (simulated or real if key exists)
        // We do this lightly here to avoid rate limits on batch
        if (Math.random() > 0.5) {
             product.analysis = await analyzeProductSellPotential(product);
        }
        
        newProducts.push(product);
        // Small delay for realism
        await new Promise(r => setTimeout(r, 300));
    }

    setResults(newProducts);
    setIsProcessing(false);
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
                            <th className="p-4 font-bold border-b border-slate-700 text-center">Profit Est.</th>
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