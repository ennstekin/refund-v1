'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { BackButton } from '@/components/BackButton';

type RefundWithOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  source: string; // 'dashboard' or 'portal'
  createdAt: string;
  updatedAt: string;
  orderData?: {
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    totalFinalPrice?: number;
    currencyCode?: string;
    currencySymbol?: string;
    orderedAt?: string;
    orderPaymentStatus?: string;
    orderPackageStatus?: string;
  } | null;
};

type IkasRefundOrder = {
  id: string;
  orderNumber: string;
  status: string;
  orderPaymentStatus: string;
  orderPackageStatus: string;
  totalFinalPrice: number;
  currencyCode: string;
  currencySymbol: string;
  orderedAt: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  orderPackages?: Array<{
    orderPackageNumber: string;
    orderPackageFulfillStatus: string;
    trackingInfo?: {
      trackingNumber: string;
      trackingLink: string;
    };
  }>;
};

export default function RefundsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ikas' | 'manual' | 'portal'>('ikas');

  // Manuel iadeler
  const [refunds, setRefunds] = useState<RefundWithOrder[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // İkas iade siparişleri
  const [ikasRefunds, setIkasRefunds] = useState<IkasRefundOrder[]>([]);
  const [filteredIkasRefunds, setFilteredIkasRefunds] = useState<IkasRefundOrder[]>([]);
  const [ikasLoading, setIkasLoading] = useState(true);
  const [ikasError, setIkasError] = useState<string | null>(null);

  // Portal iadeler
  const [portalRefunds, setPortalRefunds] = useState<RefundWithOrder[]>([]);
  const [filteredPortalRefunds, setFilteredPortalRefunds] = useState<RefundWithOrder[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const fetchRefunds = useCallback(async (currentToken: string) => {
    try {
      setLoading(true);

      // Gerçek API çağrısı
      const res = await ApiRequests.refunds.list(currentToken);
      if (res.status === 200 && res.data?.data) {
        const allRefunds = res.data.data as RefundWithOrder[];
        // Manuel iade kayıtları (dashboard'dan oluşturulanlar)
        const manualRefunds = allRefunds.filter(r => r.source === 'dashboard');
        // Portal iade kayıtları
        const portalRefundsData = allRefunds.filter(r => r.source === 'portal');

        setRefunds(manualRefunds);
        setPortalRefunds(portalRefundsData);
      } else {
        // API'den veri gelmezse boş liste
        setRefunds([]);
        setPortalRefunds([]);
      }
    } catch (err) {
      console.error('Error fetching refunds:', err);
      setError('İadeler yüklenirken bir hata oluştu');
      // Hata durumunda boş liste
      setRefunds([]);
      setPortalRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIkasRefunds = useCallback(async (currentToken: string) => {
    try {
      setIkasLoading(true);
      setIkasError(null);
      const res = await ApiRequests.ikas.getRefundOrders(currentToken);
      if (res.status === 200) {
        // Handle both array and null/undefined data
        const data = res.data?.data;
        setIkasRefunds(Array.isArray(data) ? (data as IkasRefundOrder[]) : []);
      } else {
        setIkasError('İkas iade siparişleri yüklenemedi');
        setIkasRefunds([]);
      }
    } catch (err) {
      console.error('Error fetching ikas refunds:', err);
      setIkasError('İkas iade siparişleri yüklenirken bir hata oluştu');
      setIkasRefunds([]);
    } finally {
      setIkasLoading(false);
    }
  }, []);

  const initializePage = useCallback(async () => {
    const fetchedToken = await TokenHelpers.getTokenForIframeApp();
    if (fetchedToken) {
      setToken(fetchedToken);
      await Promise.all([fetchRefunds(fetchedToken), fetchIkasRefunds(fetchedToken)]);
    }
  }, [fetchRefunds, fetchIkasRefunds]);

  // Apply filters for manual refunds
  useEffect(() => {
    let filtered = [...refunds];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((refund) => {
        const orderNumber = refund.orderNumber.toLowerCase();
        const customerName = refund.orderData?.customer
          ? `${refund.orderData.customer.firstName} ${refund.orderData.customer.lastName}`.toLowerCase()
          : '';
        const email = refund.orderData?.customer?.email?.toLowerCase() || '';
        const trackingNumber = refund.trackingNumber?.toLowerCase() || '';

        return (
          orderNumber.includes(query) ||
          customerName.includes(query) ||
          email.includes(query) ||
          trackingNumber.includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((refund) => refund.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((refund) => new Date(refund.createdAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((refund) => new Date(refund.createdAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((refund) => new Date(refund.createdAt) >= filterDate);
          break;
      }
    }

    setFilteredRefunds(filtered);
  }, [refunds, searchQuery, statusFilter, dateFilter]);

  // Apply filters for ikas refunds
  useEffect(() => {
    let filtered = [...ikasRefunds];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const orderNumber = order.orderNumber.toLowerCase();
        const customerName = order.customer
          ? `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase()
          : '';
        const email = order.customer?.email?.toLowerCase() || '';
        const trackingNumber = order.orderPackages?.[0]?.trackingInfo?.trackingNumber?.toLowerCase() || '';

        return (
          orderNumber.includes(query) ||
          customerName.includes(query) ||
          email.includes(query) ||
          trackingNumber.includes(query)
        );
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((order) => new Date(order.orderedAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((order) => new Date(order.orderedAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((order) => new Date(order.orderedAt) >= filterDate);
          break;
      }
    }

    setFilteredIkasRefunds(filtered);
  }, [ikasRefunds, searchQuery, dateFilter]);

  // Apply filters for portal refunds
  useEffect(() => {
    let filtered = [...portalRefunds];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((refund) => {
        const orderNumber = refund.orderNumber.toLowerCase();
        const customerName = refund.orderData?.customer
          ? `${refund.orderData.customer.firstName} ${refund.orderData.customer.lastName}`.toLowerCase()
          : '';
        const email = refund.orderData?.customer?.email?.toLowerCase() || '';
        const trackingNumber = refund.trackingNumber?.toLowerCase() || '';

        return (
          orderNumber.includes(query) ||
          customerName.includes(query) ||
          email.includes(query) ||
          trackingNumber.includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((refund) => refund.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((refund) => new Date(refund.createdAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((refund) => new Date(refund.createdAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((refund) => new Date(refund.createdAt) >= filterDate);
          break;
      }
    }

    setFilteredPortalRefunds(filtered);
  }, [portalRefunds, searchQuery, statusFilter, dateFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
  };

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

  const handleExportToExcel = () => {
    // Excel için veri hazırlama (filtrelenmiş veriler)
    const excelData = filteredRefunds.map((refund) => ({
      'Sipariş No': refund.orderNumber,
      'Müşteri Adı': refund.orderData?.customer
        ? `${refund.orderData.customer.firstName} ${refund.orderData.customer.lastName}`
        : '-',
      'Email': refund.orderData?.customer?.email || '-',
      'Tutar': refund.orderData?.totalFinalPrice
        ? `${refund.orderData.currencySymbol}${refund.orderData.totalFinalPrice.toFixed(2)}`
        : '-',
      'Durum': getStatusText(refund.status),
      'Kargo Takip No': refund.trackingNumber || '-',
      'Oluşturma Tarihi': new Date(refund.createdAt).toLocaleDateString('tr-TR'),
    }));

    // Worksheet oluştur
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Sütun genişliklerini ayarla
    const colWidths = [
      { wch: 15 }, // Sipariş No
      { wch: 20 }, // Müşteri Adı
      { wch: 25 }, // Email
      { wch: 12 }, // Tutar
      { wch: 12 }, // Durum
      { wch: 18 }, // Kargo Takip No
      { wch: 15 }, // Tarih
    ];
    ws['!cols'] = colWidths;

    // Workbook oluştur
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'İadeler');

    // Dosya adı
    const fileName = `iade-raporu-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;

    // Excel dosyasını indir
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <BackButton fallbackUrl="/dashboard" className="mb-4" />
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">İade Talepleri</h1>
          <p className="text-gray-600 mt-2">
            {activeTab === 'ikas' ? (
              <>Toplam {ikasRefunds.length} ikas iade siparişi {filteredIkasRefunds.length !== ikasRefunds.length && `(${filteredIkasRefunds.length} gösteriliyor)`}</>
            ) : activeTab === 'portal' ? (
              <>Toplam {portalRefunds.length} portal iadesi {filteredPortalRefunds.length !== portalRefunds.length && `(${filteredPortalRefunds.length} gösteriliyor)`}</>
            ) : (
              <>Toplam {refunds.length} manuel iade {filteredRefunds.length !== refunds.length && `(${filteredRefunds.length} gösteriliyor)`}</>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'manual' && (
            <Link
              href="/refunds/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Yeni İade Kaydı
            </Link>
          )}
          {((activeTab === 'manual' && refunds.length > 0) || (activeTab === 'ikas' && ikasRefunds.length > 0)) && (
            <button
              onClick={handleExportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel İndir
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('ikas')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'ikas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            İkas İade Siparişleri
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
              {ikasRefunds.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('portal')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'portal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Portal İade Talepleri
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
              {portalRefunds.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'manual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Manuel İade Kayıtları
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
              {refunds.length}
            </span>
          </button>
        </nav>
      </div>

      {/* KPI Dashboard - Only for manual refunds */}
      {activeTab === 'manual' && refunds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Bekleyen İadeler */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bekleyen</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {refunds.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {refunds.filter(r => r.status === 'pending').some(r => {
              const daysSinceCreated = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              return daysSinceCreated > 3;
            }) && (
              <div className="mt-3 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                SLA Uyarısı: 3 günü aşan iadeler var
              </div>
            )}
          </div>

          {/* İşlenen İadeler */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">İşleniyor</p>
                <p className="text-3xl font-bold text-blue-600">
                  {refunds.filter(r => r.status === 'processing').length}
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
                  {refunds.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Tamamlanma oranı: {refunds.length > 0 ? Math.round((refunds.filter(r => r.status === 'completed').length / refunds.length) * 100) : 0}%
            </p>
          </div>

          {/* Ortalama İşlem Süresi */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ort. Süre</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(() => {
                    const completedRefunds = refunds.filter(r => r.status === 'completed');
                    if (completedRefunds.length === 0) return '0';
                    const avgDays = completedRefunds.reduce((acc, r) => {
                      const days = Math.floor((new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      return acc + days;
                    }, 0) / completedRefunds.length;
                    return avgDays.toFixed(1);
                  })()}
                  <span className="text-sm font-normal"> gün</span>
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Dashboard - Portal refunds */}
      {activeTab === 'portal' && portalRefunds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Bekleyen İadeler */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bekleyen</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {portalRefunds.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {portalRefunds.filter(r => r.status === 'pending').some(r => {
              const daysSinceCreated = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              return daysSinceCreated > 3;
            }) && (
              <div className="mt-3 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                SLA Uyarısı: 3 günü aşan iadeler var
              </div>
            )}
          </div>

          {/* İşlenen İadeler */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">İşleniyor</p>
                <p className="text-3xl font-bold text-blue-600">
                  {portalRefunds.filter(r => r.status === 'processing').length}
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
                  {portalRefunds.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Tamamlanma oranı: {portalRefunds.length > 0 ? Math.round((portalRefunds.filter(r => r.status === 'completed').length / portalRefunds.length) * 100) : 0}%
            </p>
          </div>

          {/* Ortalama İşlem Süresi */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ort. Süre</p>
                <p className="text-3xl font-bold text-purple-600">
                  {(() => {
                    const completedRefunds = portalRefunds.filter(r => r.status === 'completed');
                    if (completedRefunds.length === 0) return '0';
                    const avgDays = completedRefunds.reduce((acc, r) => {
                      const days = Math.floor((new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      return acc + days;
                    }, 0) / completedRefunds.length;
                    return avgDays.toFixed(1);
                  })()}
                  <span className="text-sm font-normal"> gün</span>
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {((activeTab === 'manual' && refunds.length > 0) || (activeTab === 'ikas' && ikasRefunds.length > 0)) && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className={activeTab === 'manual' ? 'md:col-span-2' : 'md:col-span-3'}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, müşteri, email veya takip no ile ara..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter - Only for manual refunds */}
            {activeTab === 'manual' && (
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="processing">İşleniyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </div>
            )}

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Tarihler</option>
                <option value="today">Bugün</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Son 30 Gün</option>
              </select>
            </div>
          </div>

          {/* Active Filters & Clear */}
          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Aktif Filtreler:</span>
              {searchQuery && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Arama: {searchQuery}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Durum: {getStatusText(statusFilter)}
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Tarih: {dateFilter === 'today' ? 'Bugün' : dateFilter === 'week' ? 'Son 7 Gün' : 'Son 30 Gün'}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-red-600 hover:text-red-800"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'portal' ? (
        // Portal Refunds View - Same as manual view but for portal refunds
        filteredPortalRefunds.length === 0 && portalRefunds.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Filtre kriterlerine uygun portal iadesi bulunamadı.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : portalRefunds.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Portal İadesi Yok</h3>
              <p className="text-gray-500 mb-6">
                Müşterileriniz portal üzerinden henüz iade talebi oluşturmamış.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPortalRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{refund.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {refund.orderData?.customer ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {refund.orderData.customer.firstName} {refund.orderData.customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{refund.orderData.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {refund.orderData?.totalFinalPrice ? (
                        <div className="text-sm text-gray-900">
                          {refund.orderData.currencySymbol}
                          {refund.orderData.totalFinalPrice.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(refund.status)}`}>
                        {getStatusText(refund.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(refund.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/refunds/${refund.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'manual' ? (
        // Manual Refunds View
        filteredRefunds.length === 0 && refunds.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Filtre kriterlerine uygun iade bulunamadı.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : refunds.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz İade Kaydı Yok</h3>
              <p className="text-gray-500 mb-6">
                Manuel iade kaydı oluşturarak müşteri iadelerini takip edebilirsiniz.
              </p>
              <Link
                href="/refunds/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Yeni İade Kaydı Oluştur
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{refund.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {refund.orderData?.customer ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {refund.orderData.customer.firstName} {refund.orderData.customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{refund.orderData.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {refund.orderData?.totalFinalPrice ? (
                        <div className="text-sm text-gray-900">
                          {refund.orderData.currencySymbol}
                          {refund.orderData.totalFinalPrice.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(refund.status)}`}>
                        {getStatusText(refund.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(refund.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/refunds/${refund.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // İkas Refunds View
        filteredIkasRefunds.length === 0 && ikasRefunds.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Filtre kriterlerine uygun sipariş bulunamadı.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : ikasRefunds.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Son 90 günde iade statüsünde sipariş bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paket Durumu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kargo Takip
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIkasRefunds.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.customer ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer.firstName} {order.customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{order.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.currencySymbol}
                        {order.totalFinalPrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        {order.orderPackageStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.orderedAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.orderPackages?.[0]?.trackingInfo?.trackingNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
