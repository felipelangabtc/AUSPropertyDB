'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const verifyMagicLink = async () => {
      if (!token) {
        setError('No token provided');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/verify-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          router.push('/dashboard');
        } else {
          setError(data.message || 'Invalid token');
        }
      } catch (err) {
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    verifyMagicLink();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        {loading && <p className="text-gray-600">Verifying magic link...</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  );
}
