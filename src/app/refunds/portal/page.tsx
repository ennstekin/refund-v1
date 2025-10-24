'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import Link from 'next/link';
import * as XLSX from 'xlsx';

type RefundWithOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  reason: string | null;
  reasonNote: string | null;
  trackingNumber: string | null;
  source: string;
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

export default function PortalRefundsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<RefundWithOrder[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const fetchRefunds = useCallback(async (currentToken: string) => {
    try {
      setLoading(true);
      const res = await ApiRequests.refunds.list(currentToken);
      if (res.status === 200 && res.data?.data) {
        // Filter only portal-sourced refunds
        const portalRefunds = (res.data.data as RefundWithOrder[]).filter(
          (refund) => refund.source === 'portal'
        );
        setRefunds(portalRefunds);
      } else {
        setRefunds([]);
      }
    } catch (err) {
      console.error('Error fetching portal refunds:', err);
      setError('Portal iade talepleri yüklenirken bir hata oluştu');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const initializePage = useCallback(async () => {
    const fetchedToken = await TokenHelpers.getTokenForIframeApp();
    if (fetchedToken) {
      setToken(fetchedToken);
      await fetchRefunds(fetchedToken);
    }
  }, [fetchRefunds]);

  // Apply filters
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

  const getReasonText = (reason: string | null) => {
    if (!reason) return '-';
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

  const handleExportToExcel = () => {
    const excelData = filteredRefunds.map((refund) => ({
      'Sipariş No': refund.orderNumber,
      'Müşteri Adı': refund.orderData?.customer
        ? `${refund.orderData.customer.firstName} ${refund.orderData.customer.lastName}`
        : '-',
      'Email': refund.orderData?.customer?.email || '-',
      'Tutar': refund.orderData?.totalFinalPrice
        ? `${refund.orderData.currencySymbol}${refund.orderData.totalFinalPrice.toFixed(2)}`
        : '-',
      'İade Sebebi': getReasonText(refund.reason),
      'Açıklama': refund.reasonNote || '-',
      'Durum': getStatusText(refund.status),
      'Kargo Takip No': refund.trackingNumber || '-',
      'Oluşturma Tarihi': new Date(refund.createdAt).toLocaleDateString('tr-TR'),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const colWidths = [
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portal İadeleri');

    const fileName = `portal-iade-raporu-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;
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
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Portal İade Talepleri</h1>
          <p className="text-gray-600 mt-2">
            Müşteriler tarafından portal üzerinden oluşturulan iade talepleri
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Toplam {refunds.length} portal iadesi {filteredRefunds.length !== refunds.length && `(${filteredRefunds.length} gösteriliyor)`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/refunds"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tüm İadeler
          </Link>
          {refunds.length > 0 && (
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

      {/* KPI Dashboard */}
      {refunds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          </div>

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
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam İade</p>
                <p className="text-3xl font-bold text-purple-600">{refunds.length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {refunds.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, müşteri, email veya takip no ile ara..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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

      {/* Content */}
      {filteredRefunds.length === 0 && refunds.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Filtre kriterlerine uygun portal iadesi bulunamadı.</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Portal İadesi Yok</h3>
            <p className="text-gray-500 mb-6">
              Müşterileriniz portal üzerinden henüz iade talebi oluşturmamış.
            </p>
            <Link
              href="/refunds"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Tüm İadelere Dön
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
                  İade Sebebi
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
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{getReasonText(refund.reason)}</div>
                    {refund.reasonNote && (
                      <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={refund.reasonNote}>
                        {refund.reasonNote}
                      </div>
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
      )}
    </div>
  );
}
