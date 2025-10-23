'use client';

import { useEffect, useState } from 'react';
import { ApiRequests } from '@/lib/api-requests';
import Link from 'next/link';

export default function TestRefundsPage() {
  const [token, setToken] = useState('');
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creatingMock, setCreatingMock] = useState(false);

  const fetchRefunds = async () => {
    if (!token) {
      setError('Token giriniz');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await ApiRequests.refunds.list(token);
      if (res.status === 200 && res.data?.data) {
        setRefunds(res.data.data as any[]);
      }
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createMockRefunds = async () => {
    if (!token) {
      setError('Token giriniz');
      return;
    }

    try {
      setCreatingMock(true);
      setError('');
      setSuccess('');

      // İkas'tan son 5 siparişi çek
      const ordersRes = await fetch('/api/ikas/orders?limit=5', {
        headers: {
          Authorization: `JWT ${token}`,
        },
      });

      if (!ordersRes.ok) {
        throw new Error('Siparişler yüklenemedi');
      }

      const ordersData = await ordersRes.json();
      const orders = ordersData.data || [];

      if (orders.length === 0) {
        setError('Mağazada sipariş bulunamadı');
        return;
      }

      // Her sipariş için iade kaydı oluştur
      let created = 0;
      let skipped = 0;

      for (const order of orders) {
        try {
          await ApiRequests.refunds.create(token, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: ['pending', 'processing', 'completed'][Math.floor(Math.random() * 3)],
          });
          created++;
        } catch (err: any) {
          // Zaten varsa skip
          if (err.response?.status === 409) {
            skipped++;
          }
        }
      }

      setSuccess(`${created} iade oluşturuldu, ${skipped} zaten vardı`);

      // İadeleri yeniden yükle
      await fetchRefunds();
    } catch (err: any) {
      setError(err.message || 'Mock data oluşturulamadı');
    } finally {
      setCreatingMock(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">İade Test Sayfası</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">
          JWT Token (sessionStorage&apos;dan alın)
        </label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
          rows={3}
        />
        <div className="flex gap-3">
          <button
            onClick={fetchRefunds}
            disabled={loading || creatingMock}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Yükleniyor...' : 'İadeleri Getir'}
          </button>
          <button
            onClick={createMockRefunds}
            disabled={loading || creatingMock}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {creatingMock ? 'Oluşturuluyor...' : 'Mock İade Oluştur'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {refunds.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">İadeler ({refunds.length})</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(refunds, null, 2)}
          </pre>
        </div>
      )}

      {!loading && !error && refunds.length === 0 && token && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">Henüz iade kaydı yok</p>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Token nasıl alınır:</strong></p>
        <ol className="list-decimal ml-6 mt-2">
          <li>http://localhost:3001/dashboard adresine gidin</li>
          <li>Browser Console açın (F12)</li>
          <li>Şunu yazın: <code className="bg-gray-100 px-2 py-1 rounded">sessionStorage.getItem(&apos;token&apos;)</code></li>
          <li>Çıkan değeri kopyalayıp yukarıya yapıştırın</li>
        </ol>
      </div>
    </div>
  );
}
