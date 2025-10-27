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
  orderId?: string;
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

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [portalUrl, setPortalUrl] = useState('/portal');
  const [refunds, setRefunds] = useState<RefundData[]>([]);
  const [ikasRefunds, setIkasRefunds] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  useEffect(() => {
    AppBridgeHelper.closeLoader();
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
      const [refundsRes, ikasRes, timelineRes] = await Promise.all([
        ApiRequests.refunds.list(currentToken),
        ApiRequests.ikas.getRefundOrders(currentToken),
        ApiRequests.timeline.getRecent(currentToken),
      ]);

      if (refundsRes.status === 200 && refundsRes.data?.data) {
        setRefunds(refundsRes.data.data as RefundData[]);
      }

      if (ikasRes.status === 200 && ikasRes.data?.data) {
        setIkasRefunds(Array.isArray(ikasRes.data.data) ? ikasRes.data.data : []);
      }

      if (timelineRes.status === 200 && timelineRes.data?.data) {
        setTimelineEvents(Array.isArray(timelineRes.data.data) ? timelineRes.data.data : []);
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

  // Alert calculations
  const pendingOverSLA = refunds.filter(r => {
    if (r.status !== 'pending') return false;
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreated > 3;
  }).length;

  const missingTracking = refunds.filter(r =>
    r.status === 'processing' && !r.trackingNumber
  ).length;

  const createdToday = refunds.filter(r => {
    const today = new Date();
    const created = new Date(r.createdAt);
    return created.toDateString() === today.toDateString();
  }).length;

  const pastReturnWindow = refunds.filter(r => {
    if (r.status === 'completed' || r.status === 'rejected') return false;
    if (!r.orderData?.orderedAt) return false;

    const orderDate = new Date(r.orderData.orderedAt);
    const daysSinceOrder = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceOrder > 15;
  }).length;

  // Performance metrics
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeekRefunds = refunds.filter(r => new Date(r.createdAt) >= oneWeekAgo).length;
  const lastWeekRefunds = refunds.filter(r => {
    const created = new Date(r.createdAt);
    return created >= twoWeeksAgo && created < oneWeekAgo;
  }).length;

  const weekChange = lastWeekRefunds > 0
    ? Math.round(((thisWeekRefunds - lastWeekRefunds) / lastWeekRefunds) * 100)
    : 0;

  const avgResponseTime = completedRefunds > 0
    ? refunds
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => {
          const days = Math.floor(
            (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime())
            / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / completedRefunds
    : 0;

  const approvalRate = totalRefunds > 0
    ? Math.round((completedRefunds / totalRefunds) * 100)
    : 0;

  // Refund reasons distribution
  const reasonLabels: Record<string, string> = {
    damaged_product: 'Hasarlı Ürün',
    wrong_size: 'Yanlış Beden',
    changed_mind: 'Fikir Değiştirdim',
    defective: 'Arızalı Ürün',
    not_as_described: 'Açıklamaya Uymuyor',
    other: 'Diğer',
  };

  const reasonColors: Record<string, string> = {
    damaged_product: '#ef4444',
    wrong_size: '#f59e0b',
    changed_mind: '#3b82f6',
    defective: '#ef4444',
    not_as_described: '#8b5cf6',
    other: '#6b7280',
  };

  const reasonCounts = refunds.reduce((acc, refund) => {
    const reason = refund.reason || 'other';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const reasonStats = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      label: reasonLabels[reason] || 'Bilinmeyen',
      color: reasonColors[reason] || '#6b7280',
      count,
      percentage: totalRefunds > 0 ? Math.round((count / totalRefunds) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Financial metrics
  const totalRefundAmount = refunds.reduce((sum, r) => {
    return sum + (r.orderData?.totalFinalPrice || 0);
  }, 0);

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const thisMonthRefunds = refunds.filter(r => new Date(r.createdAt) >= thisMonthStart);
  const lastMonthRefunds = refunds.filter(r => {
    const created = new Date(r.createdAt);
    return created >= lastMonthStart && created < thisMonthStart;
  });

  const thisMonthAmount = thisMonthRefunds.reduce((sum, r) => sum + (r.orderData?.totalFinalPrice || 0), 0);
  const lastMonthAmount = lastMonthRefunds.reduce((sum, r) => sum + (r.orderData?.totalFinalPrice || 0), 0);

  const monthlyAmountChange = lastMonthAmount > 0
    ? Math.round(((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100)
    : 0;

  const avgRefundAmount = totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0;
  const currencySymbol = refunds[0]?.orderData?.currencySymbol || '₺';

  // Total refunded amount: iKAS refunded orders from last 45 days
  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  const totalActualRefundAmount = ikasRefunds
    .filter((order: any) => {
      if (order.orderPaymentStatus !== 'REFUNDED') return false;
      const orderDate = new Date(order.orderedAt);
      return orderDate >= fortyFiveDaysAgo;
    })
    .reduce((sum, order: any) => sum + (order.totalFinalPrice || 0), 0);

  const ikasRefundedCount = ikasRefunds.filter((o: any) => {
    if (o.orderPaymentStatus !== 'REFUNDED') return false;
    const orderDate = new Date(o.orderedAt);
    return orderDate >= fortyFiveDaysAgo;
  }).length;

  // Pending refund amount: Orders with REFUND_REQUESTED status in iKAS
  const refundRequestedAmount = ikasRefunds
    .filter((order: any) => {
      return order.orderPackageStatus === 'REFUND_REQUESTED';
    })
    .reduce((sum, order: any) => sum + (order.totalFinalPrice || 0), 0);

  const refundRequestedCount = ikasRefunds.filter((order: any) => {
    return order.orderPackageStatus === 'REFUND_REQUESTED';
  }).length;

  // Portal and manual refunds that are not completed (pending + processing)
  const pendingManualPortalAmount = refunds
    .filter((r: RefundData) => {
      return (r.source === 'dashboard' || r.source === 'portal') &&
             (r.status === 'pending' || r.status === 'processing');
    })
    .reduce((sum, r: RefundData) => sum + (r.orderData?.totalFinalPrice || 0), 0);

  const pendingManualPortalCount = refunds.filter((r: RefundData) => {
    return (r.source === 'dashboard' || r.source === 'portal') &&
           (r.status === 'pending' || r.status === 'processing');
  }).length;

  // Loading state
  if (loadingStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="h-10 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!loadingStats && totalRefunds === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">İade Yönetim Sistemi</h1>
            {storeName && (
              <p className="text-gray-600 mt-2">Mağaza: {storeName}</p>
            )}
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            title="Ayarlar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Ayarlar</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Henüz İade Kaydı Yok</h2>
          <p className="text-gray-600 mb-6">İlk iade kaydınızı oluşturarak başlayın</p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/refunds/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Yeni Manuel İade Oluştur
            </Link>
            <Link
              href={portalUrl}
              target="_blank"
              className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-medium"
            >
              Müşteri Portalını Görüntüle
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">İade Yönetim Sistemi</h1>
          {storeName && (
            <p className="text-gray-600 mt-1">Mağaza: {storeName}</p>
          )}
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg transition-all shadow-sm hover:shadow"
          title="Ayarlar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium">Ayarlar</span>
        </Link>
      </div>

      {/* KPI Cards - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Toplam İadeler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Toplam İade</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{totalRefunds}</p>
          <p className="text-xs text-gray-500">
            Portal: {portalRefunds} • Manuel: {totalRefunds - portalRefunds}
          </p>
        </div>

        {/* Bekleyen İadeler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-600 mb-2">{pendingRefunds}</p>
          <p className="text-xs text-gray-500">
            {pendingOverSLA > 0 ? `${pendingOverSLA} SLA aşıldı` : 'Hepsi zamanında'}
          </p>
        </div>

        {/* İşlenen İadeler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">İşleniyor</p>
          <p className="text-3xl font-bold text-indigo-600 mb-2">{processingRefunds}</p>
          <p className="text-xs text-gray-500">
            {missingTracking > 0 ? `${missingTracking} takip eksik` : 'Tüm takipler mevcut'}
          </p>
        </div>

        {/* Tamamlanan İadeler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Tamamlandı</p>
          <p className="text-3xl font-bold text-green-600 mb-2">{completedRefunds}</p>
          <p className="text-xs text-gray-500">
            Onay oranı: %{approvalRate}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hızlı İşlemler - Made more prominent */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Hızlı İşlemler
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/refunds/new"
                className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition border border-white/20"
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Yeni Manuel İade</p>
                  <p className="text-sm text-blue-100">İade talebi oluştur</p>
                </div>
              </Link>

              <Link
                href="/refunds/all"
                className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition border border-white/20"
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Tüm İade Talepleri</p>
                  <p className="text-sm text-blue-100">Manuel, portal ve iKAS</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finansal Özet
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-gray-600 mb-1">Toplam İade Tutarı (Son 45 Gün)</p>
                <p className="text-2xl font-bold text-green-600">
                  {currencySymbol}{totalActualRefundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {ikasRefundedCount} iKAS iadesi tamamlandı (ödeme iade edildi)
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-600 mb-1">Ortalama İade Tutarı</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currencySymbol}{avgRefundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min((avgRefundAmount / 1000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-600">İKAS İade Talepleri</p>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                    {refundRequestedCount} sipariş
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {currencySymbol}{refundRequestedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  REFUND_REQUESTED durumunda
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-600">Bekleyen Manuel/Portal</p>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                    {pendingManualPortalCount} iade
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {currencySymbol}{pendingManualPortalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tamamlanmamış iadeler
                </p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-sm text-gray-600 mb-1">Performans Trendi</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-indigo-600">{thisWeekRefunds}</p>
                  <span className="text-sm text-gray-500">/ {lastWeekRefunds} geçen hafta</span>
                </div>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                  weekChange > 0 ? 'bg-green-100 text-green-700' : weekChange < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {weekChange > 0 ? '+' : ''}{weekChange}%
                </span>
              </div>
            </div>
          </div>

          {/* Refund Reasons Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              İade Nedenleri
            </h2>

            {reasonStats.length > 0 ? (
              <div className="space-y-3">
                {reasonStats.slice(0, 5).map((stat) => (
                  <div key={stat.reason}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{stat.count}</span>
                        <span className="text-xs font-semibold text-gray-900 min-w-[2.5rem] text-right">
                          %{stat.percentage}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">Henüz veri yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Uyarılar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Uyarılar
            </h2>
            <div className="space-y-2">
              {pastReturnWindow > 0 && (
                <Link href="/refunds" className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-red-900 text-sm">İade Süresi Geçmiş</p>
                      <p className="text-xs text-red-700">15+ gün geçti</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-red-600">{pastReturnWindow}</span>
                </Link>
              )}

              {pendingOverSLA > 0 && (
                <Link href="/refunds?status=pending" className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-900 text-sm">SLA Aşıldı</p>
                      <p className="text-xs text-orange-700">3+ gün geçti</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-orange-600">{pendingOverSLA}</span>
                </Link>
              )}

              {missingTracking > 0 && (
                <Link href="/refunds?status=processing" className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-900 text-sm">Takip Eksik</p>
                      <p className="text-xs text-yellow-700">Numara girilmemiş</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{missingTracking}</span>
                </Link>
              )}

              {createdToday > 0 && (
                <Link href="/refunds" className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">Bugünkü Talepler</p>
                      <p className="text-xs text-blue-700">Yeni oluşturuldu</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{createdToday}</span>
                </Link>
              )}

              {pastReturnWindow === 0 && pendingOverSLA === 0 && missingTracking === 0 && createdToday === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-sm">Her şey yolunda!</p>
                  <p className="text-xs">Kritik durum yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Performans
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Ortalama Yanıt Süresi</p>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    avgResponseTime <= 3 ? 'bg-green-100 text-green-700' : avgResponseTime <= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {avgResponseTime.toFixed(1)} gün
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${avgResponseTime <= 3 ? 'bg-green-500' : avgResponseTime <= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((avgResponseTime / 7) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">İade Onay Oranı</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">{approvalRate}%</span>
                  <span className="text-sm text-gray-500">{completedRefunds}/{totalRefunds}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${approvalRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Son Aktiviteler
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {timelineEvents.length > 0 ? (
                timelineEvents.slice(0, 10).map((event) => {
                  const eventTypeColors: Record<string, string> = {
                    created: 'bg-blue-100 text-blue-700',
                    status_changed: 'bg-purple-100 text-purple-700',
                    note_added: 'bg-yellow-100 text-yellow-700',
                    tracking_updated: 'bg-green-100 text-green-700',
                  };

                  const colorClass = eventTypeColors[event.eventType] || 'bg-gray-100 text-gray-700';

                  return (
                    <Link
                      key={event.id}
                      href={`/refunds/${event.refundRequestId}`}
                      className="flex gap-2 p-2 hover:bg-gray-50 rounded-lg transition"
                    >
                      <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{event.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500">#{event.refundRequest.orderNumber}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Henüz aktivite yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Refunds Table */}
      {refunds.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Son İade Talepleri</h2>
          </div>
          <div className="divide-y divide-gray-100">
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">#{refund.orderNumber}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {refund.source === 'portal' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Portal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {customerName}
                        </span>
                        {refund.orderData?.customer?.email && (
                          <>
                            <span>•</span>
                            <span>{refund.orderData.customer.email}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(refund.createdAt).toLocaleDateString('tr-TR')}</span>
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
            <div className="p-4 border-t border-gray-100 text-center bg-gray-50">
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
