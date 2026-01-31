'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/v1/properties/${id}`);
        const data = await res.json();
        setProperty(data);
      } catch (error) {
        console.error('Error fetching property:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const handleWatchlist = async () => {
    try {
      const method = inWatchlist ? 'DELETE' : 'POST';
      await fetch(`/api/v1/users/watchlist/${id}`, { method });
      setInWatchlist(!inWatchlist);
    } catch (error) {
      console.error('Watchlist error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h1>
          <Link href="/search">
            <button className="text-blue-600 hover:underline">Back to search</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-blue-600 cursor-pointer">
              AUS Property Intelligence
            </h1>
          </Link>
          <button
            onClick={handleWatchlist}
            className={`px-4 py-2 rounded-lg font-semibold ${
              inWatchlist ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-900'
            }`}
          >
            {inWatchlist ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Property Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.canonicalAddress}</h1>
          <p className="text-xl text-gray-600 mb-6">
            {property.suburb}, {property.state} {property.postcode}
          </p>

          {/* Price and Score */}
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <p className="text-gray-600 mb-2">Current Price</p>
              <p className="text-3xl font-bold text-gray-900">
                {property.currentPrice ? `$${property.currentPrice.toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Convenience Score</p>
              <p className="text-3xl font-bold text-blue-600">
                {property.convenienceScore?.toFixed(1) || 0}/100
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Active Listings</p>
              <p className="text-3xl font-bold text-gray-900">{property.listings?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Listings</h2>
          {property.listings && property.listings.length > 0 ? (
            <div className="space-y-4">
              {property.listings.map((listing: any) => (
                <div
                  key={listing.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{listing.source}</p>
                      <p className="text-gray-600">${listing.price?.toLocaleString()}</p>
                    </div>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Listing →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active listings</p>
          )}
        </div>

        {/* Price History */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Price History</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 mb-2">Minimum</p>
              <p className="text-2xl font-bold text-gray-900">
                ${property.priceHistory?.[0]?.price?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Maximum</p>
              <p className="text-2xl font-bold text-gray-900">
                $
                {property.priceHistory?.[
                  property.priceHistory.length - 1
                ]?.price?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Average</p>
              <p className="text-2xl font-bold text-gray-900">
                $
                {property.priceHistory
                  ? (
                      property.priceHistory.reduce((sum: number, h: any) => sum + h.price, 0) /
                      property.priceHistory.length
                    ).toLocaleString('en-AU', { maximumFractionDigits: 0 })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {property.priceHistory?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
