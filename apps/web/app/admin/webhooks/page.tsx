'use client';

import React, { useEffect, useState } from 'react';

type Delivery = {
  id: string;
  event: string;
  payload: any;
  target_url?: string;
  status: string;
  attempts: number;
  created_at: string;
};

export default function WebhooksAdminPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchDeliveries() {
    setLoading(true);
    const res = await fetch('/api/admin/webhooks');
    const json = await res.json();
    setDeliveries(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function retry(id: string) {
    await fetch(`/api/admin/webhooks/${id}/retry`, { method: 'POST' });
    fetchDeliveries();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Webhook Deliveries</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left">ID</th>
              <th className="text-left">Event</th>
              <th className="text-left">Target</th>
              <th className="text-left">Status</th>
              <th className="text-left">Attempts</th>
              <th className="text-left">Created</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="py-2">{d.id}</td>
                <td className="py-2">{d.event}</td>
                <td className="py-2">{d.target_url}</td>
                <td className="py-2">{d.status}</td>
                <td className="py-2">{d.attempts}</td>
                <td className="py-2">{new Date(d.created_at).toLocaleString()}</td>
                <td className="py-2">
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                    onClick={() => retry(d.id)}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
