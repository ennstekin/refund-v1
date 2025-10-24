'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenHelpers } from '@/helpers/token-helpers';
import { ApiRequests } from '@/lib/api-requests';
import { AppBridgeHelper } from '@ikas/app-helpers';
import axios from 'axios';

type MerchantSettings = {
  id: string;
  storeName: string | null;
  portalUrl: string | null;
  portalEnabled: boolean;
};

export default function SettingsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [portalUrl, setPortalUrl] = useState('');
  const [portalEnabled, setPortalEnabled] = useState(true);

  useEffect(() => {
    AppBridgeHelper.closeLoader();
  }, []);

  const fetchSettings = useCallback(async (currentToken: string) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings', {
        headers: {
          Authorization: `JWT ${currentToken}`,
        },
      });

      if (res.status === 200 && res.data?.data) {
        setSettings(res.data.data);
        setPortalUrl(res.data.data.portalUrl || '');
        setPortalEnabled(res.data.data.portalEnabled);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Ayarlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      const fetchedToken = await TokenHelpers.getTokenForIframeApp();
      if (fetchedToken) {
        setToken(fetchedToken);
        await fetchSettings(fetchedToken);
      }
    };
    initializePage();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await axios.patch(
        '/api/settings',
        {
          portalUrl: portalUrl.trim() || null,
          portalEnabled,
        },
        {
          headers: {
            Authorization: `JWT ${token}`,
          },
        }
      );

      if (res.status === 200) {
        setSuccess(true);
        setSettings(res.data.data);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.error || 'Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const getPortalFullUrl = () => {
    if (portalUrl && portalUrl.trim()) {
      return `https://${portalUrl.trim()}`;
    }

    // Portal is deployed separately on Vercel
    const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://refund-portal.vercel.app';

    // Include merchant ID in default portal URL for multi-tenant support
    if (settings?.id) {
      return `${PORTAL_BASE_URL}/portal?storeId=${settings.id}`;
    }
    return `${PORTAL_BASE_URL}/portal`;
  };

  const copyToClipboard = () => {
    const url = getPortalFullUrl();
    navigator.clipboard.writeText(url);
    alert('Portal URL kopyalandı!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-gray-600 mt-2">İade portalı ve uygulama ayarlarını yönetin</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-800">Ayarlar başarıyla kaydedildi!</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Portal Settings Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            Müşteri İade Portalı
          </h2>

          <div className="space-y-4">
            {/* Enable/Disable Portal */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Portal Durumu</h3>
                <p className="text-sm text-gray-600">Müşteriler için self-service iade portalını aktif/pasif yapın</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={portalEnabled}
                  onChange={(e) => setPortalEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Custom Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portal URL (Opsiyonel)
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                      https://
                    </span>
                    <input
                      type="text"
                      value={portalUrl}
                      onChange={(e) => setPortalUrl(e.target.value)}
                      placeholder="iade.magaza.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Özel domain kullanmak istiyorsanız buraya girin. Boş bırakırsanız varsayılan URL kullanılır.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Portal URL Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Aktif Portal URL&apos;iniz</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-blue-200 text-blue-900">
                  {getPortalFullUrl()}
                </code>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Kopyala
                </button>
              </div>
              <p className="mt-2 text-sm text-blue-800">
                Bu URL&apos;i müşterilerinizle paylaşabilir, siparişlerinizin email&apos;ine ekleyebilir veya web sitenize
                koyabilirsiniz.
              </p>
            </div>
          </div>
        </div>

        {/* Integration Examples Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Entegrasyon Örnekleri</h2>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Email Şablonu
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Sipariş onay emaillerinize iade linki ekleyin:
              </p>
              <code className="block text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                {`İade talebiniz için: ${getPortalFullUrl()}`}
              </code>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Web Sitesi Butonu
              </h3>
              <p className="text-sm text-gray-600 mb-2">HTML kodu ile web sitenize ekleyin:</p>
              <code className="block text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                {`<a href="${getPortalFullUrl()}" class="btn">İade Başvurusu</a>`}
              </code>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                WhatsApp / SMS Mesajı
              </h3>
              <p className="text-sm text-gray-600 mb-2">Müşterilere SMS veya WhatsApp ile gönderin:</p>
              <code className="block text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                {`Siparişiniz için iade talebi oluşturmak için: ${getPortalFullUrl()}`}
              </code>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
