'use client';

import { useState } from 'react';
import axios from 'axios';
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

type SubdomainSettingsProps = {
  token: string;
  subdomain: string | null;
  subdomainChangeCount: number;
  baseDomain: string;
  onUpdate: () => void;
};

export function SubdomainSettings({
  token,
  subdomain,
  subdomainChangeCount,
  baseDomain,
  onUpdate,
}: SubdomainSettingsProps) {
  const [newSubdomain, setNewSubdomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const portalUrl = subdomain ? `https://${subdomain}.${baseDomain}` : null;
  const canChange = subdomainChangeCount < 1;

  const checkAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }

    try {
      setChecking(true);
      setError(null);

      const res = await axios.get(`/api/settings/subdomain?check=${value}`, {
        headers: { Authorization: `JWT ${token}` },
      });

      setAvailable(res.data.available);
      if (!res.data.available && res.data.error) {
        setError(res.data.error);
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    setNewSubdomain(value.toLowerCase().trim());
    setAvailable(null);
    setError(null);

    // Debounce check
    const timeout = setTimeout(() => {
      if (value) {
        checkAvailability(value.toLowerCase().trim());
      }
    }, 500);

    return () => clearTimeout(timeout);
  };

  const handleUpdate = async () => {
    if (!newSubdomain || !available) return;

    try {
      setUpdating(true);
      setError(null);

      const res = await axios.patch(
        '/api/settings/subdomain',
        { subdomain: newSubdomain },
        {
          headers: { Authorization: `JWT ${token}` },
        }
      );

      if (res.data.success) {
        setNewSubdomain('');
        setAvailable(null);
        onUpdate();
        alert('Subdomain başarıyla güncellendi! Yeni adresiniz: https://' + newSubdomain + '.' + baseDomain);
      }
    } catch (err: any) {
      console.error('Error updating subdomain:', err);
      setError(err.response?.data?.error || 'Subdomain güncellenirken bir hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!portalUrl) return;

    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">İade Portal Adresi</h2>

      {/* Current Subdomain */}
      {subdomain ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mevcut Portal URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={portalUrl || ''}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              title="Kopyala"
            >
              {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
            </button>
            <a
              href={portalUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              title="Yeni sekmede aç"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Bu adresi müşterilerinizle paylaşarak iade taleplerini alabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Portal URL Oluşturuluyor</p>
              <p className="text-xs text-yellow-700 mt-1">
                Subdomain henüz oluşturulmadı. Lütfen sayfayı yenileyin veya destek ile iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Change Subdomain */}
      {canChange && subdomain && (
        <div className="mb-6 border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subdomain Değiştir {!canChange && '(Değişiklik hakkınız dolmuştur)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              placeholder="yeni-magaza-adi"
              disabled={!canChange || updating}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <span className="text-gray-600 whitespace-nowrap">.{baseDomain}</span>
            <button
              onClick={handleUpdate}
              disabled={!available || updating || !canChange}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition whitespace-nowrap"
            >
              {updating ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>

          {/* Availability Status */}
          {checking && (
            <p className="text-xs text-gray-500 mt-2">Kontrol ediliyor...</p>
          )}
          {available === true && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Bu subdomain kullanılabilir!
            </p>
          )}
          {available === false && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {error || 'Bu subdomain kullanılamaz'}
            </p>
          )}

          <p className="text-xs text-gray-500 mt-2">
            ⚠️ Subdomain sadece 1 kez değiştirilebilir. Değişiklik yaptıktan sonra tekrar değiştiremezsiniz.
          </p>
        </div>
      )}

      {!canChange && subdomain && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Subdomain değişiklik hakkınız dolmuştur.</span> Subdomain'inizi daha
            önce değiştirdiniz ve tekrar değiştiremezsiniz.
          </p>
        </div>
      )}

      {/* Integration Examples */}
      {subdomain && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-3">Müşterilerinizle Paylaşın</h3>

          {/* Email Template */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Şablonu
            </label>
            <textarea
              readOnly
              rows={6}
              value={`Merhaba {MÜŞTERİ_ADI},

Siparişinizle ilgili iade talebi oluşturmak isterseniz aşağıdaki linkten işleminizi başlatabilirsiniz:

${portalUrl}

İyi günler dileriz.`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
            />
          </div>

          {/* Website Button HTML */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Link Kodu (HTML)
            </label>
            <textarea
              readOnly
              rows={2}
              value={`<a href="${portalUrl}" target="_blank" class="btn">İade Talebi Oluştur</a>`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
            />
          </div>

          {/* WhatsApp Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp/SMS Mesaj Şablonu
            </label>
            <textarea
              readOnly
              rows={3}
              value={`Merhaba! Siparişiniz için iade talebinde bulunmak isterseniz:\n${portalUrl}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
