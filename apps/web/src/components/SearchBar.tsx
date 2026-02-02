'use client';

import React, { useState, useCallback } from 'react';
import { Search, MapPin, DollarSign, Sliders } from 'lucide-react';

export interface SearchFilters {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  type?: string;
  suburb?: string;
  radius?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'date_new' | 'date_old';
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
  suggestions?: string[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  loading = false,
  suggestions = [],
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = useCallback(() => {
    onSearch({ ...filters, query });
    setShowSuggestions(false);
  }, [query, filters, onSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-3">
            <Search size={20} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search properties, suburbs, postcodes..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-10">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center text-gray-700"
                >
                  <MapPin size={16} className="mr-2 text-gray-400" />
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Sliders size={20} />
          Filters
        </button>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {showFilters && (
        <div className="border-t border-gray-200 pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Min Price</label>
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <DollarSign size={16} className="text-gray-400 mr-1" />
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'minPrice',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Max Price</label>
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <DollarSign size={16} className="text-gray-400 mr-1" />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'maxPrice',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bedrooms</label>
            <select
              value={filters.minBeds || ''}
              onChange={(e) =>
                handleFilterChange('minBeds', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
            <select
              value={filters.minBaths || ''}
              onChange={(e) =>
                handleFilterChange(
                  'minBaths',
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none"
            >
              <option value="">All Types</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="unit">Unit</option>
              <option value="land">Land</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
            <select
              value={filters.sortBy || 'price_asc'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="date_new">Newest</option>
              <option value="date_old">Oldest</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({});
                setQuery('');
              }}
              className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
