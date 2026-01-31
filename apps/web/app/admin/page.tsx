'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [queues, setQueues] = useState<any>(null);
  const [mergeReviews, setMergeReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          window.location.href = '/';
          return;
        }

        const metricsRes = await fetch('/api/v1/admin/metrics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);

        const queuesRes = await fetch('/api/v1/admin/queue/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const queuesData = await queuesRes.json();
        setQueues(queuesData);

        const mergesRes = await fetch('/api/v1/admin/merge-reviews', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const mergesData = await mergesRes.json();
        setMergeReviews(mergesData.data || []);
      } catch (error) {
        console.error('Admin error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-blue-600 cursor-pointer">Admin Dashboard</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Metrics */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Total Properties</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.overview?.totalProperties?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Total Listings</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.overview?.totalListings?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.overview?.totalUsers?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Active Alerts</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.overview?.activeAlerts?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm">Recent Listings (24h)</p>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.overview?.recentListings?.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Queues */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Queues</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {queues &&
              Object.entries(queues).map(([name, queue]: any) => (
                <div key={name} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 capitalize">{name}</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">Waiting: {queue.counts?.waiting || 0}</p>
                    <p className="text-gray-600">Active: {queue.counts?.active || 0}</p>
                    <p className="text-gray-600">Failed: {queue.recentFailed || 0}</p>
                    <p className="text-gray-600">Completed: {queue.recentCompleted || 0}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Merge Reviews */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Merges</h2>
          {mergeReviews.length > 0 ? (
            <div className="space-y-4">
              {mergeReviews.map((merge: any) => (
                <div key={merge.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 mb-2">
                    {merge.sourceProperty?.canonicalAddress} →{' '}
                    {merge.targetProperty?.canonicalAddress}
                  </p>
                  <p className="text-gray-600 text-sm mb-3">
                    Score: {(merge.matchScore * 100).toFixed(1)}%
                  </p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Approve
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No pending merges</p>
          )}
        </div>
      </main>
    </div>
  );
}
