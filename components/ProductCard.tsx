import React from 'react';
import { TrendingUp, Star, BarChart2, Package, Heart, Diamond } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, isSaved, onToggleSave }) => {
  // Check if product matches the "Golden Opportunity" criteria
  const isRareFind = product.estimatedSales > 1000 && product.sellers <= 3;

  return (
    <div 
      onClick={() => onClick(product)}
      className={`group bg-slate-900/50 rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amz-accent/5 cursor-pointer relative flex flex-col h-full hover:-translate-y-1 ${isRareFind ? 'border-amz-accent/40 shadow-[0_0_15px_rgba(255,153,0,0.05)]' : 'border-slate-800 hover:border-amz-accent/50'}`}
    >
      {/* Image Container */}
      <div className="relative h-48 bg-white p-6 overflow-hidden flex items-center justify-center">
        <img 
          src={product.image} 
          alt={product.name} 
          className="object-contain h-full w-full group-hover:scale-110 transition-transform duration-500 mix-blend-multiply"
        />
        <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start z-10">
            <div className="flex flex-col gap-1 items-start">
                <span className="bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-slate-700">
                #{product.bsr.toLocaleString()} BSR
                </span>
                {isRareFind && (
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg animate-pulse">
                        <Diamond size={10} fill="currentColor"/> Rare Find
                    </span>
                )}
            </div>
            <div className="flex gap-1">
                <div className="bg-green-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                <TrendingUp size={10} />
                {product.trend}%
                </div>
            </div>
        </div>
        
        <button 
            onClick={(e) => onToggleSave(e, product.id)}
            className="absolute top-2 right-2 z-20 p-2 bg-slate-100/50 hover:bg-white rounded-full transition-colors shadow-sm"
        >
            <Heart size={16} className={isSaved ? "fill-pink-500 text-pink-500" : "text-slate-600"} />
        </button>
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-amz-accent text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform flex items-center gap-2">
                <BarChart2 size={16} /> Analyze
            </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow bg-slate-800/50">
        <div className="mb-2">
          <h3 className="text-slate-200 font-semibold line-clamp-2 text-sm h-10 leading-tight group-hover:text-amz-accent transition-colors">{product.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">{product.asin}</span>
            {product.subCategory && (
               <span className="text-[10px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 truncate max-w-[100px]">{product.subCategory}</span>
            )}
          </div>
        </div>
        
        <div className="mt-auto space-y-3">
            {/* Ratings & Sales */}
            <div className="flex items-center justify-between text-xs border-b border-slate-700 pb-2">
                <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-slate-300 font-medium">{product.rating}</span>
                    <span className="text-slate-500">({product.reviews})</span>
                </div>
                <div className={`font-medium flex items-center gap-1 ${isRareFind ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                    <Package size={12}/> {product.estimatedSales.toLocaleString()}/mo
                </div>
            </div>

            {/* Price & Grade */}
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">Buy Box</span>
                    <span className="text-lg font-bold text-white">${product.price}</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">Sellers</span>
                    <span className={`text-xs font-mono ${isRareFind ? 'text-green-400 font-bold' : 'text-slate-400'}`}>{product.sellers} Offers</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};