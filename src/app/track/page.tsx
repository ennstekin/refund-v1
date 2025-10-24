'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TrackRefundPublicPage() {
  const router = useRouter();
  const [refundId, setRefundId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!refundId.trim()) {
      setError('Lütfen iade takip numarasını girin');
      return;
    }

    // Redirect to tracking page
    router.push(`/portal/track/${refundId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">İade Takip</h1>
          <p className="text-gray-600">İade takip numaranızı girerek iade durumunuzu sorgulayabilirsiniz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="refundId" className="block text-sm font-medium text-gray-700 mb-2">
              İade Takip Numarası
            </label>
            <input
              type="text"
              id="refundId"
              value={refundId}
              onChange={(e) => {
                setRefundId(e.target.value);
                setError(null);
              }}
              placeholder="Örn: clxxxxx..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            İade Durumunu Sorgula
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            İade takip numaranız yoksa,{' '}
            <a href="/portal" className="text-blue-600 hover:text-blue-800 font-medium">
              sipariş numaranız ile sorgulama yapın
            </a>
          </p>
        </div>

        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">İade takip numaranızı nerede bulabilirsiniz?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• İade talebinizi oluşturduktan sonra size gönderilen email'de</li>
            <li>• İade talebi oluşturma sayfasında gösterilen onay mesajında</li>
            <li>• İade durumu sayfasının URL'inde</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
