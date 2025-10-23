'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import { useRouter } from 'next/navigation';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalFinalPrice: number;
  currencyCode: string;
  currencySymbol: string;
  orderedAt: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export default function NewRefundPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [reason, setReason] = useState('');
  const [reasonNote, setReasonNote] = useState('');

  useEffect(() => {
    AppBridgeHelper.closeLoader();
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      const fetchedToken = await TokenHelpers.getTokenForIframeApp();
      if (fetchedToken) {
        setToken(fetchedToken);
      }
    };
    initializePage();
  }, []);

  const searchOrders = useCallback(async () => {
    if (!token || !searchQuery.trim()) return;

    try {
      setSearching(true);
      setError(null);
      const res = await ApiRequests.ikas.getOrders(token, searchQuery);

      if (res.status === 200 && res.data?.data) {
        setSearchResults(res.data.data as Order[]);
        if (res.data.data.length === 0) {
          setError('Sipariş bulunamadı');
        }
      } else {
        setError('Sipariş arama sırasında bir hata oluştu');
      }
    } catch (err) {
      console.error('Error searching orders:', err);
      setError('Sipariş arama sırasında bir hata oluştu');
    } finally {
      setSearching(false);
    }
  }, [token, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedOrder) return;

    try {
      setLoading(true);
      setError(null);

      const data: any = {
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
      };

      if (trackingNumber.trim()) {
        data.trackingNumber = trackingNumber.trim();
      }

      if (reason) {
        data.reason = reason;
        if (reasonNote.trim()) {
          data.reasonNote = reasonNote.trim();
        }
      }

      const res = await ApiRequests.refunds.create(token, data);

      if (res.status === 200 || res.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/refunds');
        }, 2000);
      } else {
        setError('İade kaydı oluşturulurken bir hata oluştu');
      }
    } catch (err: any) {
      console.error('Error creating refund:', err);
      setError(err.response?.data?.error || 'İade kaydı oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => router.push('/refunds')}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Geri Dön
        </button>
        <h1 className="text-3xl font-bold">Yeni Manuel İade Kaydı</h1>
        <p className="text-gray-600 mt-2">İade talebi oluşturmak için sipariş bilgilerini girin</p>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">İade Kaydı Oluşturuldu!</h2>
          <p className="text-green-700">İade listesine yönlendiriliyorsunuz...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Search Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">1. Sipariş Seçimi</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sipariş Numarası veya Müşteri Bilgisi
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sipariş numarası, müşteri adı veya email ile ara..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={searching || !!selectedOrder}
                  />
                  <button
                    type="button"
                    onClick={searchOrders}
                    disabled={searching || !searchQuery.trim() || !!selectedOrder}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {searching ? 'Aranıyor...' : 'Ara'}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && !selectedOrder && (
                <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                  {searchResults.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrder(order);
                        setSearchResults([]);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          {order.customer && (
                            <div className="text-sm text-gray-600">
                              {order.customer.firstName} {order.customer.lastName} - {order.customer.email}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(order.orderedAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {order.currencySymbol}{order.totalFinalPrice.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">{order.status}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Order */}
              {selectedOrder && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">Seçili Sipariş: {selectedOrder.orderNumber}</div>
                      {selectedOrder.customer && (
                        <div className="text-sm text-gray-600">
                          {selectedOrder.customer.firstName} {selectedOrder.customer.lastName} - {selectedOrder.customer.email}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(null);
                        setSearchQuery('');
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Değiştir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Refund Details Section */}
          {selectedOrder && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">2. İade Nedeni (Opsiyonel)</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İade Nedeni
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">İade nedeni seçin (opsiyonel)</option>
                      <option value="damaged_product">Hasarlı Ürün</option>
                      <option value="wrong_product">Yanlış Ürün</option>
                      <option value="customer_request">Müşteri Talebi</option>
                      <option value="defective_product">Kusurlu Ürün</option>
                      <option value="late_delivery">Geç Teslimat</option>
                      <option value="not_as_described">Açıklamaya Uygun Değil</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>

                  {reason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İade Nedeni Notu
                      </label>
                      <textarea
                        value={reasonNote}
                        onChange={(e) => setReasonNote(e.target.value)}
                        placeholder="İade nedeni hakkında detaylı bilgi girin..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">3. Kargo Bilgileri (Opsiyonel)</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kargo Takip Numarası
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Kargo takip numarasını girin (opsiyonel)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/refunds')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedOrder}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Oluşturuluyor...' : 'İade Kaydı Oluştur'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
