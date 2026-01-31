'use client';

import React, { useState } from 'react';

export default function AdminMLPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [ids, setIds] = useState('');

  async function triggerAll() {
    setStatus('Queuing full batch prediction...');
    const res = await fetch('/api/admin/ml/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const json = await res.json();
    setStatus(json?.status || 'queued');
  }

  async function triggerIds() {
    const propertyIds = ids.split(',').map((s) => s.trim()).filter(Boolean);
    if (propertyIds.length === 0) {
      setStatus('No property IDs provided');
      return;
    }
    setStatus(`Queuing prediction for ${propertyIds.length} properties...`);
    const res = await fetch('/api/admin/ml/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyIds }) });
    const json = await res.json();
    setStatus(json?.status || 'queued');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">ML - Price Predictions</h1>

      <div className="mb-4">
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={triggerAll}>
          Trigger full batch prediction
        </button>
      </div>

      <div className="mb-4">
        <label className="block mb-2">Property IDs (comma separated)</label>
        <input value={ids} onChange={(e) => setIds(e.target.value)} className="w-full p-2 border rounded" placeholder="id1,id2,..." />
        <div className="mt-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={triggerIds}>
            Trigger for IDs
          </button>
        </div>
      </div>

      <div className="mt-4">
        <strong>Status:</strong> {status ?? 'idle'}
      </div>
    </div>
  );
}
