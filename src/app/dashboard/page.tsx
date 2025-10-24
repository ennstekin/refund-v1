'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import Link from 'next/link';

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [portalUrl, setPortalUrl] = useState('/portal');

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

  const initializeDashboard = useCallback(async () => {
    try {
      const fetchedToken = await TokenHelpers.getTokenForIframeApp();
      setToken(fetchedToken || null);

      if (fetchedToken) {
        await fetchStoreName(fetchedToken);
      }
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }, [fetchStoreName]);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">İade Yönetim Sistemi</h1>

      {storeName && (
        <p className="text-gray-600 mb-8">Mağaza: {storeName}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Müşteri Portalı</h3>
              <p className="text-sm text-gray-600">Portal önizlemesi</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
