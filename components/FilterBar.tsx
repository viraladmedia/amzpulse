import React from 'react';
import { Search, SlidersHorizontal, Filter } from 'lucide-react';
import { FilterState } from '../types';
import { AMAZON_TAXONOMY } from '../categories';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  const numericFields = new Set(['minPrice', 'maxPrice', 'minRoi', 'maxBSR']);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue = numericFields.has(name) ? Number(value) || 0 : value;
    
    if (name === 'category') {
        // Reset subCategory when main category changes
        setFilters(prev => ({
            ...prev,
            category: nextValue as string,
            subCategory: ''
        }));
    } else {
        setFilters(prev => ({
            ...prev,
            [name]: nextValue
        }));
    }
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      subCategory: '',
      minPrice: 0,
      maxPrice: 0,
      minRoi: 0,
      maxBSR: 0,
      search: '',
      season: ''
    });
  };

  // Safely retrieve subcategories, defaulting to empty array if category is invalid/missing
  const subCategories = filters.category ? (AMAZON_TAXONOMY[filters.category] || []) : [];
  const seasons = ['Evergreen', 'Q1', 'Q2', 'Q3', 'Q4', 'Summer', 'Back to School'];

  return (
    <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 py-4 px-4 md:px-8 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        
        {/* Top Row: Search & Primary Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
                type="text"
                name="search"
                data-tour="tour-search"
                placeholder="Search ASIN, Title, Brand..."
                value={filters.search}
                onChange={handleInputChange}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-amz-accent focus:border-transparent placeholder-slate-500 text-sm"
            />
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            
            {/* Main Category Dropdown */}
            <div className="relative min-w-[160px]">
                <select
                name="category"
                value={filters.category}
                onChange={handleInputChange}
                className="w-full appearance-none bg-slate-800 text-white border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-amz-accent cursor-pointer"
                >
                <option value="">All Departments</option>
                {Object.keys(AMAZON_TAXONOMY).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <SlidersHorizontal size={14} className="text-slate-400"/>
                </div>
            </div>

            {/* Sub Category Dropdown (Conditional) */}
             <div className={`relative min-w-[160px] ${!filters.category ? 'opacity-50' : ''}`}>
                <select
                name="subCategory"
                value={filters.subCategory}
                onChange={handleInputChange}
                disabled={!filters.category}
                className="w-full appearance-none bg-slate-800 text-white border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-amz-accent cursor-pointer disabled:cursor-not-allowed"
                >
                <option value="">All Subcategories</option>
                {subCategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Filter size={14} className="text-slate-400"/>
                </div>
            </div>

            {/* Price Range */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                <span className="text-slate-400 text-xs">Price</span>
                <input
                type="number"
                name="minPrice"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={handleInputChange}
                className="w-12 bg-transparent text-white text-sm focus:outline-none border-b border-slate-600 focus:border-amz-accent text-center"
                />
                <span className="text-slate-400">-</span>
                <input
                type="number"
                name="maxPrice"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={handleInputChange}
                className="w-12 bg-transparent text-white text-sm focus:outline-none border-b border-slate-600 focus:border-amz-accent text-center"
                />
            </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
              <span className="text-slate-400 text-xs">BSR ≤</span>
              <input
                type="number"
                name="maxBSR"
                placeholder="25000"
                value={filters.maxBSR || ''}
                onChange={handleInputChange}
                className="w-24 bg-transparent text-white text-sm focus:outline-none border-b border-slate-600 focus:border-amz-accent text-center"
              />
            </div>

            <div className="relative min-w-[170px]">
              <select
                name="season"
                value={filters.season || ''}
                onChange={handleInputChange}
                className="w-full appearance-none bg-slate-800 text-white border border-slate-700 hover:border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-amz-accent cursor-pointer"
              >
                <option value="">All Seasons</option>
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Filter size={14} className="text-slate-400"/>
              </div>
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="self-start md:self-auto rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
