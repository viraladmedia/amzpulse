import React, { useState } from 'react';
import { Play, Download, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Product } from '../types';
import { analyzeBatch as apiAnalyzeBatch } from '../services/apiClient';
import { normalizeExternalProducts } from '../services/productMapper';

const ASIN_PATTERN = /^[A-Z0-9]{10}$/i;

const formatMoney = (product: Product) => product.priceDisplay || (product.price > 0 ? `$${product.price.toFixed(2)}` : 'N/A');

const BatchAnalysis: React.FC = () => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    setError(null);

    const parsedAsins = input.split(/[\s,]+/).map((value) => value.trim().toUpperCase()).filter(Boolean);
    const asins = Array.from(new Set<string>(parsedAsins));
    const invalidAsins = asins.filter((asin) => !ASIN_PATTERN.test(asin));

    if (invalidAsins.length > 0) {
      setError(`Invalid ASIN format: ${invalidAsins.slice(0, 5).join(', ')}`);
      setIsProcessing(false);
      return;
    }

    try {
      const backendResults = await apiAnalyzeBatch(asins);
      const mapped = normalizeExternalProducts(backendResults);
      setResults(mapped);
    } catch (err) {
      console.error('Batch analyze failed:', err);
      setError((err as Error)?.message || 'Batch analyze failed');
      setResults([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
      setResults([]);
      setInput('');
  }

  const exportCsv = () => {
    if (results.length === 0) return;

    const rows = [
      ['ASIN', 'Title', 'Category', 'Price', 'BSR', 'Estimated Sales', 'Risk', 'AI Grade', 'Suggested Action'],
      ...results.map((product) => [
        product.asin,
        product.name,
        product.category,
        product.price > 0 ? product.price.toFixed(2) : '',
        product.bsr > 0 ? String(product.bsr) : '',
        product.estimatedSales > 0 ? String(product.estimatedSales) : '',
        product.riskDataAvailable === false ? 'Unavailable' : product.isIpRisk || product.isHazmat ? 'Risk' : 'OK',
        product.analysis?.grade || '',
        product.analysis?.suggestedAction || ''
      ])
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amzpulse-batch-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
                <button onClick={exportCsv} className="text-amz-accent hover:text-white text-sm flex items-center gap-2">
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
                            <th className="p-4 font-bold border-b border-slate-700 text-right">Net After Fees</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {results.map((p, idx) => {
                            // Sell price minus Amazon's own referral/FBA fees; excludes unknown buy cost, so this is not full profit.
                            const netAfterFees = p.price - p.referralFee - p.fbaFee;
                            const hasProfitInputs = p.price > 0 && (p.referralFee > 0 || p.fbaFee > 0);
                            return (
                                <tr key={p.asin || p.id || idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded p-1 shrink-0">
                                                <img src={p.image} className="w-full h-full object-contain" loading="lazy" decoding="async" alt={p.name} />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium line-clamp-1 w-48" title={p.name}>{p.name}</div>
                                                <div className="text-slate-500 text-xs font-mono">{p.asin}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-white font-mono">{formatMoney(p)}</td>
                                    <td className="p-4 text-right text-slate-300 font-mono">{p.bsr > 0 ? `#${p.bsr.toLocaleString()}` : 'N/A'}</td>
                                    <td className="p-4 text-right text-green-400 font-mono">{p.estimatedSales > 0 ? p.estimatedSales.toLocaleString() : 'N/A'}</td>
                                    <td className="p-4 text-center">
                                        {p.riskDataAvailable === false ? (
                                            <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-700/30 px-2 py-1 rounded text-xs font-bold border border-slate-600/40">
                                                N/A
                                            </span>
                                        ) : p.isIpRisk || p.isHazmat ? (
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
                                        {hasProfitInputs ? `$${netAfterFees.toFixed(2)}` : 'N/A'}
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
