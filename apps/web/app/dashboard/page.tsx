'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          window.location.href = '/auth/login';
          return;
        }

        const userRes = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        setUser(userData);

        const watchlistRes = await fetch('/api/v1/users/watchlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const watchlistData = await watchlistRes.json();
        setWatchlist(watchlistData.data || []);

        const alertsRes = await fetch('/api/v1/users/alerts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.data || []);
      } catch (error) {
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
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
            onClick={() => {
              localStorage.removeItem('accessToken');
              window.location.href = '/';
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Welcome */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user?.name}!</h1>
          <p className="text-gray-600">{user?.email}</p>
        </div>

        {/* Watchlist */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Watchlist</h2>
          {watchlist.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {watchlist.map((property: any) => (
                <Link key={property.id} href={`/property/${property.id}`}>
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-bold text-gray-900 mb-2">{property.canonicalAddress}</h3>
                    <p className="text-gray-600 mb-2">
                      {property.suburb}, {property.state}
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      ${property.currentPrice?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No properties in watchlist.{' '}
              <Link href="/search" className="text-blue-600 hover:underline">
                Add some now
              </Link>
            </p>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Alerts</h2>
          {alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{alert.name}</p>
                  <p className="text-gray-600 text-sm mt-1">{alert.description}</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Status: {alert.isActive ? '✓ Active' : '✗ Inactive'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No alerts created yet</p>
          )}
        </div>
      </main>
    </div>
  );
}
