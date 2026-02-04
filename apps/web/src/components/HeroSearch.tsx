'use client';

import React from 'react';
import Link from 'next/link';
import { Search, MapPin } from 'lucide-react';
import { Button } from './ui/Button';

interface HeroSearchProps {
  className?: string;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 max-w-4xl mx-auto ${className}`}>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="Search by suburb, postcode, or address..."
            aria-label="Search location"
            className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
          />
        </div>
        <Link href="/search" className="block">
          <Button
            size="lg"
            className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow text-sm sm:text-base"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Search
          </Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4 justify-center items-center">
        <span className="text-xs sm:text-sm text-gray-500">Popular:</span>
        {['Sydney', 'Melbourne', 'Brisbane', 'Perth'].map((city) => (
          <Link
            key={city}
            href={`/search?q=${city}`}
            className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-md hover:bg-primary-50 transition-colors"
          >
            {city}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HeroSearch;
