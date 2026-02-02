'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchBar, SearchFilters } from '../../src/components';
import { Card, Button, Badge } from '../../src/components';
import {
  MapPin,
  Home,
  DollarSign,
  Bed,
  Bath,
  Calendar,
  Filter,
  SortAsc,
  Grid,
  List,
  Eye,
  Heart,
} from 'lucide-react';

interface Property {
  id: string;
  canonicalAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  currentPrice: number;
  convenienceScore: number;
  listings: any[];
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
}

export default function SearchPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('relevance');

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-6">Find Your Perfect Property</h1>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Searching...' : `${properties.length} Properties Found`}
            </h2>
            {searched && !loading && properties.length === 0 && (
              <p className="text-gray-600">Try adjusting your search filters</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="relevance">Most Relevant</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="date_new">Newest First</option>
              <option value="score">Highest Score</option>
            </select>

            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div
            className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded mb-4 w-1/2" />
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          searched ? (
            <Card className="text-center py-16">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search filters or search in a different area
              </p>
              <Button onClick={() => window.location.reload()}>Clear Filters</Button>
            </Card>
          ) : (
            <Card className="text-center py-16">
              <Home className="w-16 h-16 text-primary-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Search</h3>
              <p className="text-gray-600">
                Enter a suburb, postcode, or address above to find properties
              </p>
            </Card>
          )
        ) : (
          <div
            className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
          >
            {properties.map((property) => (
              <Card key={property.id} hover padding="none" className="overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Home className="w-16 h-16 text-white/50" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant={
                        property.propertyType === 'house'
                          ? 'success'
                          : property.propertyType === 'apartment'
                            ? 'info'
                            : 'default'
                      }
                    >
                      {property.propertyType || 'Property'}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <div
                      className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getScoreColor(property.convenienceScore)}`}
                    >
                      {property.convenienceScore?.toFixed(0)}/100
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {property.currentPrice
                          ? formatPrice(property.currentPrice)
                          : 'Price on application'}
                      </p>
                      <p className="text-gray-600 text-sm flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {property.suburb}, {property.state} {property.postcode}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 font-medium mb-4 truncate">
                    {property.canonicalAddress}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-600 pb-4 border-b border-gray-100">
                    {property.bedrooms && (
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        {property.bedrooms} bed
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        {property.bathrooms} bath
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {property.listings?.length || 0} listings
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <Link href={`/property/${property.id}`} className="flex-1">
                      <Button variant="primary" className="w-full" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
