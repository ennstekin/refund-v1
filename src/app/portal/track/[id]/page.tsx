'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

type RefundTimeline = {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  createdBy: string | null;
};

type RefundNote = {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

type RefundData = {
  id: string;
  orderNumber: string;
  status: string;
  reason: string | null;
  reasonNote: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    orderNumber: string;
    totalFinalPrice: number;
    currencySymbol: string;
    orderedAt: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
  timeline: RefundTimeline[];
  notes: RefundNote[];
};

export default function TrackRefundPage() {
  const params = useParams();
  const router = useRouter();
  const refundId = params.id as string;

  const [refund, setRefund] = useState<RefundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRefund = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/public/track-refund?refundId=${refundId}`);

        if (response.data.success) {
          setRefund(response.data.refund);
        }
      } catch (err: any) {
        console.error('Error fetching refund:', err);
        if (err.response?.status === 404) {
          setError('İade talebi bulunamadı');
        } else {
          setError('İade bilgileri yüklenirken bir hata oluştu');
        }
      } finally {
        setLoading(false);
      }
    };

    if (refundId) {
      fetchRefund();
    }
  }, [refundId]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getReasonText = (reason: string | null) => {
    if (!reason) return 'Belirtilmemiş';
    switch (reason) {
      case 'damaged_product':
        return 'Hasarlı Ürün';
      case 'wrong_size':
        return 'Yanlış Beden';
      case 'changed_mind':
        return 'Fikir Değişikliği';
      case 'defective':
        return 'Kusurlu Ürün';
      case 'not_as_described':
        return 'Açıklamaya Uygun Değil';
      case 'other':
        return 'Diğer';
      default:
        return reason;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
          <p className="text-gray-600 mb-6">İade takip numaranızı kontrol edin veya sipariş numaranız ile yeni bir sorgulama yapın.</p>
          <Link
            href="/portal"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sipariş Sorgula
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">İade Takip</h1>
              <p className="text-gray-600">İade Takip No: <span className="font-mono font-semibold">{refund.id}</span></p>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 ${getStatusColor(refund.status)}`}>
              <span className="font-semibold text-lg">{getStatusText(refund.status)}</span>
            </div>
          </div>

          {/* Order Info */}
          {refund.order && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Sipariş Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Sipariş No</p>
                  <p className="font-semibold">{refund.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tutar</p>
                  <p className="font-semibold">{refund.order.currencySymbol}{refund.order.totalFinalPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Müşteri</p>
                  <p className="font-semibold">{refund.order.customer.firstName} {refund.order.customer.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-semibold">{refund.order.customer.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Refund Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">İade Detayları</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">İade Sebebi</p>
              <p className="font-semibold">{getReasonText(refund.reason)}</p>
            </div>
            {refund.reasonNote && (
              <div>
                <p className="text-sm text-gray-600">Açıklama</p>
                <p className="text-gray-800">{refund.reasonNote}</p>
              </div>
            )}
            {refund.trackingNumber && (
              <div>
                <p className="text-sm text-gray-600">Kargo Takip Numarası</p>
                <p className="font-mono font-semibold">{refund.trackingNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Oluşturulma Tarihi</p>
              <p className="font-semibold">{new Date(refund.createdAt).toLocaleString('tr-TR')}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">İade Süreci</h2>
          <div className="space-y-4">
            {refund.timeline.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  {index !== refund.timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-semibold text-gray-900">{event.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(event.createdAt).toLocaleString('tr-TR')}
                    {event.createdBy && ` • ${event.createdBy}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {refund.notes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notlar</h2>
            <div className="space-y-3">
              {refund.notes.map((note) => (
                <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="text-gray-800">{note.content}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(note.createdAt).toLocaleString('tr-TR')} • {note.createdBy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/portal"
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors text-center"
          >
            Yeni Sorgu Yap
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
