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
  const [showNewRefundModal, setShowNewRefundModal] = useState(false);

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

  // Actual refunded amount (completed refunds from our system + refunded orders from ikas)
  const completedRefundAmount = refunds
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.orderData?.totalFinalPrice || 0), 0);

  const ikasRefundedAmount = ikasRefunds
    .filter((order: any) => order.orderPaymentStatus === 'REFUNDED')
    .reduce((sum, order: any) => sum + (order.totalFinalPrice || 0), 0);

  const totalActualRefundAmount = completedRefundAmount + ikasRefundedAmount;

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

      {/* Refund Reasons & Financial Metrics Row */}
      {!loadingStats && totalRefunds > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Refund Reasons Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              İade Nedenleri Dağılımı
            </h2>

            {reasonStats.length > 0 ? (
              <div className="space-y-4">
                {reasonStats.slice(0, 5).map((stat) => (
                  <div key={stat.reason} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{stat.count}</span>
                        <span className="text-xs font-semibold text-gray-900 min-w-[3rem] text-right">
                          %{stat.percentage}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {reasonStats.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{reasonStats.length - 5} diğer sebep
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm">Henüz veri yok</p>
                </div>
              </div>
            )}
          </div>

          {/* Financial Metrics */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finansal Metrikler
            </h2>

            <div className="space-y-4">
              {/* Total Actual Refunded Amount */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Toplam İade Tutarı</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-600">
                    {currencySymbol}{totalActualRefundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                  <span>Manuel/Portal: {currencySymbol}{completedRefundAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                  <span>İKAS: {currencySymbol}{ikasRefundedAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {refunds.filter(r => r.status === 'completed').length + ikasRefunds.filter((o: any) => o.orderPaymentStatus === 'REFUNDED').length} iade tamamlandı
                </p>
              </div>

              {/* Monthly Comparison */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Bu Ay vs Geçen Ay</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    monthlyAmountChange > 0 ? 'bg-red-100 text-red-700' : monthlyAmountChange < 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {monthlyAmountChange > 0 ? '+' : ''}{monthlyAmountChange}%
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{thisMonthAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Geçen ay: {currencySymbol}{lastMonthAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Average Refund Amount */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Ortalama İade Tutarı</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{avgRefundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((avgRefundAmount / 1000) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">/ 1000{currencySymbol}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts & Performance Row */}
      {!loadingStats && totalRefunds > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Alerts/Warnings Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Uyarılar ve Dikkat Gerektiren
            </h2>
            <div className="space-y-3">
              {pendingOverSLA > 0 && (
                <Link href="/refunds?status=pending" className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-red-900">SLA Aşıldı</p>
                      <p className="text-sm text-red-700">3+ gün bekleyen iadeler</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{pendingOverSLA}</span>
                </Link>
              )}

              {missingTracking > 0 && (
                <Link href="/refunds?status=processing" className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-900">Takip Eksik</p>
                      <p className="text-sm text-orange-700">Takip numarası girilmemiş</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{missingTracking}</span>
                </Link>
              )}

              {createdToday > 0 && (
                <Link href="/refunds" className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">Bugünkü Talepler</p>
                      <p className="text-sm text-blue-700">Bugün oluşturulan iadeler</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{createdToday}</span>
                </Link>
              )}

              {pendingOverSLA === 0 && missingTracking === 0 && createdToday === 0 && (
                <div className="flex items-center justify-center p-6 text-gray-500">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Her şey yolunda!</p>
                    <p className="text-sm">Bekleyen kritik durum yok</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Performans Metrikleri
            </h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Bu Hafta vs Geçen Hafta</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    weekChange > 0 ? 'bg-green-100 text-green-700' : weekChange < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {weekChange > 0 ? '+' : ''}{weekChange}%
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{thisWeekRefunds}</span>
                  <span className="text-sm text-gray-500">/ {lastWeekRefunds} geçen hafta</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-2">Ortalama Yanıt Süresi</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{avgResponseTime.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">gün</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${avgResponseTime <= 3 ? 'bg-green-500' : avgResponseTime <= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((avgResponseTime / 7) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-2">İade Onay Oranı</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{approvalRate}%</span>
                  <span className="text-sm text-gray-500">{completedRefunds}/{totalRefunds}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{ width: `${approvalRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions & Recent Activity Row */}
      {!loadingStats && totalRefunds > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions Widget */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow p-6 border border-purple-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Hızlı İşlemler
            </h2>
            <div className="space-y-3">
              <Link
                href="/refunds?action=new"
                className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-purple-200 hover:border-purple-300"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Yeni Manuel İade</p>
                  <p className="text-xs text-gray-600">İade talebi oluştur</p>
                </div>
              </Link>

              <Link
                href="/refunds"
                className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-purple-200 hover:border-purple-300"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Tüm İadeler</p>
                  <p className="text-xs text-gray-600">İade listesini görüntüle</p>
                </div>
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-purple-200 hover:border-purple-300"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ayarlar</p>
                  <p className="text-xs text-gray-600">Portal ayarlarını düzenle</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Son Aktiviteler
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event, index) => {
                  const eventTypeIcons: Record<string, string> = {
                    created: 'M12 4v16m8-8H4',
                    status_changed: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
                    note_added: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
                    tracking_updated: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
                  };

                  const eventTypeColors: Record<string, string> = {
                    created: 'bg-blue-100 text-blue-700',
                    status_changed: 'bg-purple-100 text-purple-700',
                    note_added: 'bg-yellow-100 text-yellow-700',
                    tracking_updated: 'bg-green-100 text-green-700',
                  };

                  const icon = eventTypeIcons[event.eventType] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
                  const colorClass = eventTypeColors[event.eventType] || 'bg-gray-100 text-gray-700';

                  return (
                    <Link
                      key={event.id}
                      href={`/refunds/${event.refundRequestId}`}
                      className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition border border-gray-100"
                    >
                      <div className={`w-10 h-10 ${colorClass} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            Sipariş #{event.refundRequest.orderNumber}
                          </span>
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
                <div className="flex items-center justify-center p-8 text-gray-500">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">Henüz aktivite yok</p>
                  </div>
                </div>
              )}
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
