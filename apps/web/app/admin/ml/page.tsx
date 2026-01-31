'use client';

import React, { useState } from 'react';

export default function AdminMLPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [ids, setIds] = useState('');
  const [trainingLimit, setTrainingLimit] = useState(1000);
  const [trainingResult, setTrainingResult] = useState<any>(null);

  async function trainModel() {
    setStatus('Training ML model...');
    setTrainingResult(null);
    try {
      const res = await fetch(`/api/admin/ml/train?limit=${trainingLimit}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      setTrainingResult(json);
      setStatus(`Training completed: ${json.propertiesUsed} properties used`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function triggerAll() {
    setStatus('Queuing full batch prediction...');
    const res = await fetch('/api/admin/ml/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setStatus(json?.status || 'queued');
  }

  async function triggerIds() {
    const propertyIds = ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (propertyIds.length === 0) {
      setStatus('No property IDs provided');
      return;
    }
    setStatus(`Queuing prediction for ${propertyIds.length} properties...`);
    const res = await fetch('/api/admin/ml/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyIds }),
    });
    const json = await res.json();
    setStatus(json?.status || 'queued');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">ML - Price Predictions</h1>

      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Train ML Model</h2>
        <div className="mb-4">
          <label className="block mb-2">Max properties for training</label>
          <input
            type="number"
            value={trainingLimit}
            onChange={(e) => setTrainingLimit(parseInt(e.target.value))}
            className="w-full p-2 border rounded"
            min="100"
            max="5000"
          />
        </div>
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          onClick={trainModel}
        >
          Train Model
        </button>
        {trainingResult && (
          <div className="mt-4 p-3 bg-blue-100 rounded text-sm">
            <pre>{JSON.stringify(trainingResult, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Batch Predictions</h2>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={triggerAll}
        >
          Trigger full batch prediction
        </button>
      </div>

      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Specific Properties</h2>
        <label className="block mb-2">Property IDs (comma separated)</label>
        <input
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          placeholder="id1,id2,..."
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={triggerIds}
        >
          Trigger for IDs
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border rounded">
        <strong>Status:</strong> {status ?? 'idle'}
      </div>
    </div>
  );
}
