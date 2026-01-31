'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?query=${encodeURIComponent(query)}`);
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
        <form onSubmit={handleSearch} className="mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by suburb, address, or postcode..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Results */}
        <div>
          <h2 className="text-2xl font-bold mb-6">{properties.length} Properties Found</h2>

          {properties.length === 0 && !loading && query && (
            <div className="text-center text-gray-500 py-12">
              No properties found. Try a different search.
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
