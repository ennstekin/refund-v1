'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import Link from 'next/link';
import { BackButton } from '@/components/BackButton';

type RefundData = {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  orderNumber: string;
  trackingNumber?: string | null;
  reason?: string | null;
  orderData?: {
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    totalFinalPrice?: number;
    currencySymbol?: string;
    orderedAt?: string;
  } | null;
};

type IkasRefundOrder = {
  id: string;
  orderNumber: string;
  orderedAt: string;
  orderPaymentStatus: string;
  totalFinalPrice: number;
  currencySymbol: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export default function AllRefundsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'manual' | 'portal' | 'ikas'>('manual');

  const [manualRefunds, setManualRefunds] = useState<RefundData[]>([]);
  const [portalRefunds, setPortalRefunds] = useState<RefundData[]>([]);
  const [ikasRefunds, setIkasRefunds] = useState<IkasRefundOrder[]>([]);

  useEffect(() => {
    AppBridgeHelper.closeLoader();
  }, []);

  const fetchAllRefunds = useCallback(async (currentToken: string) => {
    try {
      setLoading(true);

      // Fetch manual and portal refunds
      const [refundsRes, ikasRes] = await Promise.all([
        ApiRequests.refunds.list(currentToken),
        ApiRequests.ikas.getRefundOrders(currentToken),
      ]);

      if (refundsRes.status === 200 && refundsRes.data?.data) {
        const allRefunds = refundsRes.data.data as RefundData[];

        // Separate manual and portal refunds
        setManualRefunds(allRefunds.filter(r => r.source === 'dashboard'));
        setPortalRefunds(allRefunds.filter(r => r.source === 'portal'));
      }

      if (ikasRes.status === 200 && ikasRes.data?.data) {
        const allIkasOrders = Array.isArray(ikasRes.data.data) ? ikasRes.data.data : [];

        // Filter iKAS orders from last 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const recentIkasRefunds = allIkasOrders.filter((order: any) => {
          const orderDate = new Date(order.orderedAt);
          return orderDate >= sixtyDaysAgo;
        });

        setIkasRefunds(recentIkasRefunds);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const initializePage = useCallback(async () => {
    const fetchedToken = await TokenHelpers.getTokenForIframeApp();
    if (fetchedToken) {
      setToken(fetchedToken);
      await fetchAllRefunds(fetchedToken);
    }
  }, [fetchAllRefunds]);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  const statusConfig = {
    pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'İşleniyor', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  };

  const ikasPaymentStatusConfig: Record<string, { label: string; color: string }> = {
    REFUNDED: { label: 'İade Edildi', color: 'bg-green-100 text-green-800' },
    PAID: { label: 'Ödendi', color: 'bg-blue-100 text-blue-800' },
    PARTIALLY_REFUNDED: { label: 'Kısmi İade', color: 'bg-orange-100 text-orange-800' },
    PENDING: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
    FAILED: { label: 'Başarısız', color: 'bg-red-100 text-red-800' },
  };

  const renderManualRefunds = () => {
    if (manualRefunds.length === 0) {
      return (
        <div className="flex items-center justify-center p-12 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">Henüz manuel iade kaydı yok</p>
            <p className="text-sm mt-2">Dashboard üzerinden manuel iade oluşturabilirsiniz</p>
          </div>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {manualRefunds.map((refund) => {
          const status = statusConfig[refund.status as keyof typeof statusConfig] || statusConfig.pending;
          const customerName = refund.orderData?.customer
            ? `${refund.orderData.customer.firstName || ''} ${refund.orderData.customer.lastName || ''}`.trim()
            : 'Müşteri';

          return (
            <Link key={refund.id} href={`/refunds/${refund.id}`} className="block p-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">Sipariş #{refund.orderNumber}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      Manuel
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {customerName}
                    </span>
                    {refund.orderData?.customer?.email && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {refund.orderData.customer.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(refund.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                {refund.orderData?.totalFinalPrice && (
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {refund.orderData.currencySymbol || '₺'}{refund.orderData.totalFinalPrice.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const renderPortalRefunds = () => {
    if (portalRefunds.length === 0) {
      return (
        <div className="flex items-center justify-center p-12 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <p className="text-lg font-medium">Henüz portal üzerinden iade talebi yok</p>
            <p className="text-sm mt-2">Müşteriler portal üzerinden iade talebi oluşturabilir</p>
          </div>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {portalRefunds.map((refund) => {
          const status = statusConfig[refund.status as keyof typeof statusConfig] || statusConfig.pending;
          const customerName = refund.orderData?.customer
            ? `${refund.orderData.customer.firstName || ''} ${refund.orderData.customer.lastName || ''}`.trim()
            : 'Müşteri';

          return (
            <Link key={refund.id} href={`/refunds/${refund.id}`} className="block p-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">Sipariş #{refund.orderNumber}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      Portal
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {customerName}
                    </span>
                    {refund.orderData?.customer?.email && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {refund.orderData.customer.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(refund.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                {refund.orderData?.totalFinalPrice && (
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {refund.orderData.currencySymbol || '₺'}{refund.orderData.totalFinalPrice.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const renderIkasRefunds = () => {
    if (ikasRefunds.length === 0) {
      return (
        <div className="flex items-center justify-center p-12 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg font-medium">Son 60 günde iKAS iade siparişi yok</p>
            <p className="text-sm mt-2">iKAS üzerinden iade edilen siparişler burada görünür</p>
          </div>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {ikasRefunds.map((order) => {
          const paymentStatus = ikasPaymentStatusConfig[order.orderPaymentStatus] || { label: order.orderPaymentStatus, color: 'bg-gray-100 text-gray-800' };
          const customerName = order.customer
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : 'Müşteri';

          return (
            <div key={order.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">Sipariş #{order.orderNumber}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatus.color}`}>
                      {paymentStatus.label}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      iKAS
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {customerName}
                    </span>
                    {order.customer?.email && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {order.customer.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(order.orderedAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {order.currencySymbol}{order.totalFinalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <BackButton fallbackUrl="/dashboard" className="mb-4" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tüm İade Talepleri</h1>
        <p className="text-gray-600 mt-2">Manuel, portal ve iKAS iade kayıtlarını görüntüleyin</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Manuel İadeler</p>
              <p className="text-3xl font-bold text-indigo-600">{manualRefunds.length}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Portal İadeleri</p>
              <p className="text-3xl font-bold text-purple-600">{portalRefunds.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">iKAS İadeleri (60 gün)</p>
              <p className="text-3xl font-bold text-blue-600">{ikasRefunds.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Manuel İadeler</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{manualRefunds.length}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'portal'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>Portal İadeleri</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">{portalRefunds.length}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ikas')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ikas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>iKAS İadeleri</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{ikasRefunds.length}</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'manual' && renderManualRefunds()}
          {activeTab === 'portal' && renderPortalRefunds()}
          {activeTab === 'ikas' && renderIkasRefunds()}
        </div>
      </div>
    </div>
  );
}
