'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button, Badge } from '../../src/components/ui';
import {
  MapPin,
  Home,
  DollarSign,
  Bed,
  Bath,
  Square,
  Calendar,
  ArrowLeft,
  Heart,
  Share2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Check,
  X,
  Eye,
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
  priceHistory: any[];
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: number;
  yearBuilt?: number;
  description?: string;
  features?: string[];
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'history'>('overview');

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Below Average';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center py-16 px-8">
          <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h1>
          <p className="text-gray-600 mb-6">
            The property you are looking for does not exist or has been removed.
          </p>
          <Link href="/search">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const priceHistory = property.priceHistory || [];
  const minPrice =
    priceHistory.length > 0
      ? Math.min(...priceHistory.map((h: any) => h.price))
      : property.currentPrice;
  const maxPrice =
    priceHistory.length > 0
      ? Math.max(...priceHistory.map((h: any) => h.price))
      : property.currentPrice;
  const avgPrice =
    priceHistory.length > 0
      ? priceHistory.reduce((sum: number, h: any) => sum + h.price, 0) / priceHistory.length
      : property.currentPrice;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/search"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">{property.propertyType || 'Property'}</Badge>
                <Badge
                  variant={inWatchlist ? 'danger' : 'default'}
                  className={inWatchlist ? '' : 'bg-white/20 text-white'}
                >
                  {inWatchlist ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{property.canonicalAddress}</h1>
              <p className="text-xl text-primary-100 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                {property.suburb}, {property.state} {property.postcode}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="secondary" onClick={handleWatchlist}>
                <Heart className="w-4 h-4 mr-2" />
                {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              </Button>
              <Button variant="secondary">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-gray-600 text-sm">Current Price</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {property.currentPrice
                      ? formatPrice(property.currentPrice)
                      : 'Price on application'}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl ${getScoreColor(property.convenienceScore)}`}>
                  <p className="text-3xl font-bold">{property.convenienceScore?.toFixed(0)}</p>
                  <p className="text-sm font-medium">{getScoreLabel(property.convenienceScore)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                {property.bedrooms && (
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                    <p className="text-2xl font-bold text-gray-900">{property.bedrooms}</p>
                    <p className="text-sm text-gray-600">Bedrooms</p>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Bath className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                    <p className="text-2xl font-bold text-gray-900">{property.bathrooms}</p>
                    <p className="text-sm text-gray-600">Bathrooms</p>
                  </div>
                )}
                {property.landSize && (
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Square className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                    <p className="text-2xl font-bold text-gray-900">{property.landSize}</p>
                    <p className="text-sm text-gray-600">sqm</p>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                    <p className="text-2xl font-bold text-gray-900">{property.yearBuilt}</p>
                    <p className="text-sm text-gray-600">Built</p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex border-b border-gray-200 -mx-6 -mt-6 px-6">
                {['overview', 'listings', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-4 font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-primary-600 border-b-2 border-primary-600 -mb-px'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="pt-6">
                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Property Description
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {property.description || 'No description available for this property.'}
                    </p>

                    {property.features && property.features.length > 0 && (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {property.features.map((feature, index) => (
                            <div key={index} className="flex items-center text-gray-600">
                              <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'listings' && (
                  <div>
                    {property.listings && property.listings.length > 0 ? (
                      <div className="space-y-4">
                        {property.listings.map((listing: any) => (
                          <div
                            key={listing.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{listing.source}</p>
                              <p className="text-2xl font-bold text-primary-600 mt-1">
                                {listing.price ? formatPrice(listing.price) : 'Contact for price'}
                              </p>
                              {listing.createdAt && (
                                <p className="text-sm text-gray-500 mt-1 flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  Listed {new Date(listing.createdAt).toLocaleDateString('en-AU')}
                                </p>
                              )}
                            </div>
                            <a
                              href={listing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
                            >
                              View Listing
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No active listings available</p>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-sm text-green-600 mb-1 flex items-center">
                          <TrendingDown className="w-4 h-4 mr-1" />
                          Minimum
                        </p>
                        <p className="text-xl font-bold text-gray-900">{formatPrice(minPrice)}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-xl">
                        <p className="text-sm text-red-600 mb-1 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Maximum
                        </p>
                        <p className="text-xl font-bold text-gray-900">{formatPrice(maxPrice)}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-600 mb-1 flex items-center">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Average
                        </p>
                        <p className="text-xl font-bold text-gray-900">{formatPrice(avgPrice)}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl">
                        <p className="text-sm text-purple-600 mb-1 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Records
                        </p>
                        <p className="text-xl font-bold text-gray-900">{priceHistory.length}</p>
                      </div>
                    </div>

                    {priceHistory.length > 0 ? (
                      <div className="space-y-3">
                        {priceHistory.map((item: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                          >
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                                <DollarSign className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {formatPrice(item.price)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(item.capturedAt).toLocaleDateString('en-AU')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No price history available</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Convenience Score</h3>
              <div className="text-center mb-4">
                <div
                  className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreColor(property.convenienceScore)}`}
                >
                  <div className="text-center">
                    <p className="text-4xl font-bold">{property.convenienceScore?.toFixed(0)}</p>
                    <p className="text-sm font-medium">out of 100</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-center mb-4">
                {getScoreLabel(property.convenienceScore)} convenience score based on local
                amenities, transport, schools, and more.
              </p>
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                View Full Report
              </Button>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="primary" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Request Inspection
                </Button>
                <Button variant="outline" className="w-full">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Calculate Mortgage
                </Button>
                <Button variant="outline" className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Properties</h3>
              <p className="text-gray-500 text-sm">No similar properties found in this area.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
