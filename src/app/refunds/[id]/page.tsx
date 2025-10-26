'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import { useParams, useRouter } from 'next/navigation';
import { BackButton } from '@/components/BackButton';

type RefundNote = {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

type TimelineEvent = {
  id: string;
  eventType: string;
  eventData: string | null;
  description: string;
  createdBy: string | null;
  createdAt: string;
};

type RefundDetail = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  reason?: string | null;
  reasonNote?: string | null;
  images?: string | null;
  createdAt: string;
  updatedAt: string;
  notes: RefundNote[];
  orderData?: {
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
    totalFinalPrice?: number;
    totalPrice?: number;
    currencyCode?: string;
    currencySymbol?: string;
    orderedAt?: string;
    orderPaymentStatus?: string;
    orderPackageStatus?: string;
    status?: string;
    note?: string;
    orderLineItems?: Array<{
      id: string;
      quantity: number;
      finalPrice: number;
      variant: {
        name: string;
        sku: string;
      };
    }>;
    shippingAddress?: {
      firstName: string;
      lastName: string;
      addressLine1: string;
      addressLine2?: string;
      city: { name: string };
      district?: { name: string };
      phone: string;
    };
    orderPackages?: Array<{
      orderPackageNumber: string;
      orderPackageFulfillStatus: string;
      trackingInfo?: {
        trackingNumber: string;
        trackingLink: string;
      };
    }>;
  } | null;
};

export default function RefundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [newStatus, setNewStatus] = useState('');
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newReasonNote, setNewReasonNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const refundReasons = [
    { value: '', label: 'Neden Seçin' },
    { value: 'damaged_product', label: 'Hasarlı Ürün' },
    { value: 'wrong_size', label: 'Yanlış Beden/Ölçü' },
    { value: 'defective', label: 'Arızalı/Kusurlu Ürün' },
    { value: 'not_as_described', label: 'Açıklamaya Uygun Değil' },
    { value: 'changed_mind', label: 'Fikir Değişikliği' },
    { value: 'late_delivery', label: 'Geç Teslimat' },
    { value: 'other', label: 'Diğer' },
  ];

  const fetchRefundDetail = useCallback(async (currentToken: string) => {
    try {
      setLoading(true);

      // Gerçek API çağrısı
      const res = await ApiRequests.refunds.get(currentToken, id);
      if (res.status === 200 && res.data?.data) {
        const refundData = res.data.data as RefundDetail;
        setRefund(refundData);
        setNewStatus(refundData.status);
        setNewTrackingNumber(refundData.trackingNumber || '');
        setNewReason(refundData.reason || '');
        setNewReasonNote(refundData.reasonNote || '');
      } else {
        setError('İade bulunamadı');
      }
    } catch (err) {
      console.error('Error fetching refund detail:', err);
      setError('İade detayı yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTimeline = useCallback(async (currentToken: string) => {
    try {
      setLoadingTimeline(true);
      const res = await ApiRequests.refunds.getTimeline(currentToken, id);
      if (res.status === 200 && res.data?.data) {
        setTimeline(res.data.data as TimelineEvent[]);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [id]);

  const handleAddNote = async () => {
    if (!token || !noteContent.trim() || !noteAuthor.trim()) return;

    try {
      setAddingNote(true);
      const response = await ApiRequests.refunds.addNote(token, id, {
        content: noteContent,
        createdBy: noteAuthor,
      });

      if (response.status === 201) {
        setNoteContent('');
        setNoteAuthor('');
        await fetchRefundDetail(token);
        alert('Not başarıyla eklendi!');
      }
    } catch (err: any) {
      console.error('Error adding note:', err);
      const errorMessage = err.response?.data?.error || 'Not eklenirken bir hata oluştu';
      alert(errorMessage);
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateRefund = async () => {
    if (!token) return;

    try {
      setUpdating(true);
      await ApiRequests.refunds.update(token, id, {
        status: newStatus,
        trackingNumber: newTrackingNumber || undefined,
        reason: newReason || undefined,
        reasonNote: newReasonNote || undefined,
      });

      await fetchRefundDetail(token);
      alert('İade güncellendi');
    } catch (err) {
      console.error('Error updating refund:', err);
      alert('İade güncellenirken bir hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const initializePage = useCallback(async () => {
    const fetchedToken = await TokenHelpers.getTokenForIframeApp();
    if (fetchedToken) {
      setToken(fetchedToken);
      await fetchRefundDetail(fetchedToken);
      await fetchTimeline(fetchedToken);
    }
  }, [fetchRefundDetail, fetchTimeline]);

  useEffect(() => {
    AppBridgeHelper.closeLoader();
  }, []);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'processing':
        return 'İşleniyor';
      case 'completed':
        return 'Tamamlandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error || 'İade bulunamadı'}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <BackButton fallbackUrl="/refunds" className="mb-4" />
        <h1 className="text-3xl font-bold">İade Detayı</h1>
        <p className="text-gray-600 mt-2">Sipariş No: {refund.orderNumber}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Refund Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">İade Durumu</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Beklemede</option>
                  <option value="processing">İşleniyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İade Nedeni
                </label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {refundReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {(newReason === 'other' || newReason === 'damaged_product') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={newReasonNote}
                    onChange={(e) => setNewReasonNote(e.target.value)}
                    placeholder="İade nedeni hakkında detaylı açıklama..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kargo Takip No
                </label>
                <input
                  type="text"
                  value={newTrackingNumber}
                  onChange={(e) => setNewTrackingNumber(e.target.value)}
                  placeholder="Takip numarası"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleUpdateRefund}
                disabled={updating}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {updating ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>

          {/* Order Details Card */}
          {refund.orderData && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Sipariş Bilgileri</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Müşteri:</span>
                    <span className="font-medium">
                      {refund.orderData.customer?.firstName} {refund.orderData.customer?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{refund.orderData.customer?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telefon:</span>
                    <span className="font-medium">{refund.orderData.customer?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Toplam Tutar:</span>
                    <span className="font-medium">
                      {refund.orderData.currencySymbol}{refund.orderData.totalFinalPrice?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ödeme Durumu:</span>
                    <span className="font-medium">{refund.orderData.orderPaymentStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kargo Durumu:</span>
                    <span className="font-medium">{refund.orderData.orderPackageStatus}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {refund.orderData.orderLineItems && refund.orderData.orderLineItems.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Ürünler</h2>
                  <div className="space-y-3">
                    {refund.orderData.orderLineItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-3">
                        <div>
                          <div className="font-medium">{item.variant.name}</div>
                          <div className="text-sm text-gray-500">SKU: {item.variant.sku}</div>
                          <div className="text-sm text-gray-500">Adet: {item.quantity}</div>
                        </div>
                        <div className="font-medium">
                          {refund.orderData?.currencySymbol}{item.finalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {refund.orderData.shippingAddress && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Teslimat Adresi</h2>
                  <div className="text-gray-700">
                    <p className="font-medium">
                      {refund.orderData.shippingAddress.firstName} {refund.orderData.shippingAddress.lastName}
                    </p>
                    <p>{refund.orderData.shippingAddress.addressLine1}</p>
                    {refund.orderData.shippingAddress.addressLine2 && (
                      <p>{refund.orderData.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {refund.orderData.shippingAddress.district?.name} / {refund.orderData.shippingAddress.city.name}
                    </p>
                    <p className="mt-2">Tel: {refund.orderData.shippingAddress.phone}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Product Images */}
          {refund.images && (() => {
            try {
              const images = JSON.parse(refund.images);
              if (Array.isArray(images) && images.length > 0) {
                return (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Müşteri Fotoğrafları</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {images.map((image: string, index: number) => (
                        <div key={index} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image}
                            alt={`Ürün fotoğrafı ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(image, '_blank')}
                          />
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            {index + 1}/{images.length}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                      Müşteri tarafından yüklenen {images.length} fotoğraf. Tıklayarak büyütebilirsiniz.
                    </p>
                  </div>
                );
              }
            } catch (e) {
              return null;
            }
            return null;
          })()}
        </div>

        {/* Right column - Notes */}
        <div className="space-y-6">
          {/* Add Note Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Not Ekle</h2>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  placeholder="Adınız"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Not yazın..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteContent.trim() || !noteAuthor.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {addingNote ? 'Ekleniyor...' : 'Not Ekle'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Süreç Takibi</h2>
            {loadingTimeline ? (
              <p className="text-gray-500 text-sm">Yükleniyor...</p>
            ) : timeline.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz timeline kaydı yok</p>
            ) : (
              <div className="relative">
                {/* Timeline çizgisi */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="relative pl-10">
                      {/* Timeline nokta */}
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                        event.eventType === 'created' ? 'bg-blue-500' :
                        event.eventType === 'status_changed' ? 'bg-green-500' :
                        event.eventType === 'note_added' ? 'bg-yellow-500' :
                        event.eventType === 'tracking_updated' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}></div>

                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-sm">{event.description}</p>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {new Date(event.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {event.createdBy && (
                          <p className="text-xs text-gray-500">
                            {event.createdBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Notlar</h2>
            {refund.notes.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz not bulunmuyor</p>
            ) : (
              <div className="space-y-4">
                {refund.notes.map((note) => (
                  <div key={note.id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{note.createdBy}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
