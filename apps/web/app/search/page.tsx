'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchBar } from '../../src/components/SearchBar';
import { SearchFilters } from '../../src/components/SearchBar';

interface Property {
  id: string;
  canonicalAddress: string;
  suburb: string;
  state: string;
  currentPrice: number;
  convenienceScore: number;
  listings: any[];
}

export default function SearchPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (filters: SearchFilters) => {
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      const data = await res.json();
      setProperties(data.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/">
            <h1 className="text-2xl font-bold text-blue-600 cursor-pointer">
              AUS Property Intelligence
            </h1>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Bar */}
        <div className="mb-12">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Results */}
        <div>
          <h2 className="text-2xl font-bold mb-6">{properties.length} Properties Found</h2>

          {properties.length === 0 && !loading && searched && (
            <div className="text-center text-gray-500 py-12">
              No properties found. Try adjusting your search filters.
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property: any) => (
              <Link key={property.id} href={`/property/${property.id}`}>
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-40 flex items-center justify-center">
                    <span className="text-white text-center px-4">{property.canonicalAddress}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-600 mb-2">
                      {property.suburb}, {property.state}
                    </p>
                    {property.currentPrice && (
                      <p className="text-2xl font-bold text-gray-900 mb-3">
                        ${property.currentPrice.toLocaleString()}
                      </p>
                    )}
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Score: {property.convenienceScore?.toFixed(1)}/100</span>
                      <span>{property.listings?.length || 0} Listings</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
