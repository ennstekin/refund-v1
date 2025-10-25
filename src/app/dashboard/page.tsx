'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import Link from 'next/link';

type RefundData = {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  orderNumber: string;
  orderData?: {
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    totalFinalPrice?: number;
    currencySymbol?: string;
  } | null;
};

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [portalUrl, setPortalUrl] = useState('/portal');
  const [refunds, setRefunds] = useState<RefundData[]>([]);
  const [ikasRefunds, setIkasRefunds] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    AppBridgeHelper.closeLoader();
    // Set portal URL on client side to avoid hydration mismatch
    setPortalUrl(`${window.location.origin}/portal`);
  }, []);

  const fetchStoreName = useCallback(async (currentToken: string) => {
    try {
      const res = await ApiRequests.ikas.getMerchant(currentToken);
      if (res.status === 200 && res.data?.data?.merchantInfo?.storeName) {
        setStoreName(res.data.data.merchantInfo.storeName);
      }
    } catch (error) {
      console.error('Error fetching store name:', error);
    }
  }, []);

  const fetchRefundStats = useCallback(async (currentToken: string) => {
    try {
      setLoadingStats(true);
      const [refundsRes, ikasRes] = await Promise.all([
        ApiRequests.refunds.list(currentToken),
        ApiRequests.ikas.getRefundOrders(currentToken),
      ]);

      if (refundsRes.status === 200 && refundsRes.data?.data) {
        setRefunds(refundsRes.data.data as RefundData[]);
      }

      if (ikasRes.status === 200 && ikasRes.data?.data) {
        setIkasRefunds(Array.isArray(ikasRes.data.data) ? ikasRes.data.data : []);
      }
    } catch (error) {
      console.error('Error fetching refund stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const initializeDashboard = useCallback(async () => {
    try {
      const fetchedToken = await TokenHelpers.getTokenForIframeApp();
      setToken(fetchedToken || null);

      if (fetchedToken) {
        await Promise.all([
          fetchStoreName(fetchedToken),
          fetchRefundStats(fetchedToken),
        ]);
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }, [fetchStoreName, fetchRefundStats]);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  const totalRefunds = refunds.length;
  const pendingRefunds = refunds.filter(r => r.status === 'pending').length;
  const processingRefunds = refunds.filter(r => r.status === 'processing').length;
  const completedRefunds = refunds.filter(r => r.status === 'completed').length;
  const portalRefunds = refunds.filter(r => r.source === 'portal').length;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">İade Yönetim Sistemi</h1>

      {storeName && (
        <p className="text-gray-600 mb-8">Mağaza: {storeName}</p>
      )}

      {/* KPI Dashboard */}
      {!loadingStats && totalRefunds > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Genel İstatistikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Toplam İadeler */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam İade</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {totalRefunds}
                  </p>
                </div>
                <div className="bg-gray-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Portal: {portalRefunds} | Manuel: {totalRefunds - portalRefunds}
              </p>
            </div>

            {/* Bekleyen İadeler */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bekleyen</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {pendingRefunds}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* İşlenen İadeler */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">İşleniyor</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {processingRefunds}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tamamlanan İadeler */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tamamlandı</p>
                  <p className="text-3xl font-bold text-green-600">
                    {completedRefunds}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* İkas İade Siparişleri */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">İkas İadeler</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {ikasRefunds.length}
                  </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Son 90 günlük
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Hızlı Erişim</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/refunds" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">İade Talepleri</h3>
              <p className="text-sm text-gray-600">Tüm iade taleplerini görüntüle</p>
            </div>
          </div>
        </Link>

        <Link href="/settings" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ayarlar</h3>
              <p className="text-sm text-gray-600">Portal ve uygulama ayarları</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      {!loadingStats && refunds.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Son İade Talepleri</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {refunds.slice(0, 5).map((refund) => {
              const statusConfig = {
                pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
                processing: { label: 'İşleniyor', color: 'bg-blue-100 text-blue-800' },
                completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
                rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
              };

              const status = statusConfig[refund.status as keyof typeof statusConfig] || statusConfig.pending;
              const customerName = refund.orderData?.customer
                ? `${refund.orderData.customer.firstName || ''} ${refund.orderData.customer.lastName || ''}`.trim()
                : 'Müşteri';

              return (
                <Link key={refund.id} href={`/refunds/${refund.id}`} className="block p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">Sipariş #{refund.orderNumber}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {refund.source === 'portal' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Portal
                          </span>
                        )}
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
          {refunds.length > 5 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <Link href="/refunds" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                Tümünü Görüntüle ({refunds.length} iade)
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
