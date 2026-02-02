'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '../../../src/components/ui';
import {
  User,
  Home,
  Heart,
  Bell,
  Settings,
  LogOut,
  MapPin,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  ChevronRight,
  Eye,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface UserData {
  name: string;
  email: string;
  avatar?: string;
}

interface WatchlistItem {
  id: string;
  canonicalAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  currentPrice: number;
  convenienceScore: number;
}

interface AlertItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  type: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'watchlist' | 'alerts'>('overview');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const userRes = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        const watchlistRes = await fetch('/api/v1/users/watchlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (watchlistRes.ok) {
          const watchlistData = await watchlistRes.json();
          setWatchlist(watchlistData.data || []);
        }

        const alertsRes = await fetch('/api/v1/users/alerts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.data || []);
        }
      } catch (error) {
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Saved Properties',
      value: watchlist.length,
      icon: Heart,
      color: 'bg-red-100 text-red-600',
    },
    {
      label: 'Active Alerts',
      value: alerts.filter((a) => a.isActive).length,
      icon: Bell,
      color: 'bg-blue-100 text-blue-600',
    },
    { label: 'Searches', value: 12, icon: Search, color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, {user?.name || 'User'}!
                </h1>
                <p className="text-primary-200">{user?.email}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/search">
                <Button variant="secondary">
                  <Search className="w-4 h-4 mr-2" />
                  New Search
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="flex items-center">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${stat.color}`}
              >
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex border-b border-gray-200 -mx-4 px-4 mb-8">
          {['overview', 'watchlist', 'alerts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-4 font-medium capitalize transition-colors flex items-center ${
                activeTab === tab
                  ? 'text-primary-600 border-b-2 border-primary-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' && <Home className="w-4 h-4 mr-2" />}
              {tab === 'watchlist' && <Heart className="w-4 h-4 mr-2" />}
              {tab === 'alerts' && <Bell className="w-4 h-4 mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Watchlist</h2>
                <button
                  onClick={() => setActiveTab('watchlist')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {watchlist.length > 0 ? (
                <div className="space-y-4">
                  {watchlist.slice(0, 3).map((property) => (
                    <Link key={property.id} href={`/property/${property.id}`}>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                            <Home className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 truncate">
                              {property.canonicalAddress}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {property.suburb}, {property.state}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {formatPrice(property.currentPrice)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {property.convenienceScore?.toFixed(0)}/100
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No saved properties yet</p>
                  <Link href="/search">
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Properties
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts
                    .filter((a) => a.isActive)
                    .slice(0, 3)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <Bell className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{alert.name}</p>
                            <p className="text-sm text-gray-500">{alert.type}</p>
                          </div>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No alerts set up yet</p>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Alert
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div>
            {watchlist.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {watchlist.map((property) => (
                  <Card key={property.id} hover padding="none">
                    <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <Home className="w-16 h-16 text-white/50" />
                    </div>
                    <div className="p-5">
                      <p className="font-bold text-gray-900 mb-1">
                        {formatPrice(property.currentPrice)}
                      </p>
                      <p className="text-gray-700 text-sm mb-2 truncate">
                        {property.canonicalAddress}
                      </p>
                      <p className="text-gray-500 text-sm flex items-center mb-4">
                        <MapPin className="w-4 h-4 mr-1" />
                        {property.suburb}, {property.state}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant={property.convenienceScore >= 60 ? 'success' : 'warning'}>
                          {property.convenienceScore?.toFixed(0)}/100
                        </Badge>
                        <Link href={`/property/${property.id}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-16">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Your watchlist is empty
                </h3>
                <p className="text-gray-600 mb-6">
                  Start saving properties you like to track them here.
                </p>
                <Link href="/search">
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Browse Properties
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card key={alert.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${alert.isActive ? 'bg-blue-100' : 'bg-gray-100'}`}
                        >
                          <Bell
                            className={`w-6 h-6 ${alert.isActive ? 'text-blue-600' : 'text-gray-400'}`}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{alert.name}</p>
                          <p className="text-sm text-gray-500">{alert.description || alert.type}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Created {new Date(alert.createdAt).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={alert.isActive ? 'success' : 'default'}>
                          {alert.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-16">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No alerts configured</h3>
                <p className="text-gray-600 mb-6">
                  Create alerts to get notified about new listings and price drops.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Alert
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
