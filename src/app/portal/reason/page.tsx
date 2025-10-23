'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type RefundReason = {
  value: string;
  label: string;
  description: string;
  requiresImage: boolean;
  icon: string;
};

const REFUND_REASONS: RefundReason[] = [
  {
    value: 'damaged_product',
    label: 'Hasarlı Ürün',
    description: 'Ürün hasarlı veya kırık olarak geldi',
    requiresImage: true,
    icon: '📦',
  },
  {
    value: 'wrong_product',
    label: 'Yanlış Ürün',
    description: 'Sipariş ettiğim ürün gelmedi',
    requiresImage: true,
    icon: '🔄',
  },
  {
    value: 'defective_product',
    label: 'Kusurlu Ürün',
    description: 'Ürün çalışmıyor veya kusurlu',
    requiresImage: true,
    icon: '⚠️',
  },
  {
    value: 'not_as_described',
    label: 'Açıklamaya Uygun Değil',
    description: 'Ürün sitedeki açıklama ile uyuşmuyor',
    requiresImage: false,
    icon: '📝',
  },
  {
    value: 'late_delivery',
    label: 'Geç Teslimat',
    description: 'Ürün çok geç teslim edildi',
    requiresImage: false,
    icon: '⏰',
  },
  {
    value: 'customer_request',
    label: 'Fikrim Değişti',
    description: 'Ürünü istemiyorum, fikrim değişti',
    requiresImage: false,
    icon: '💭',
  },
  {
    value: 'other',
    label: 'Diğer',
    description: 'Başka bir neden',
    requiresImage: false,
    icon: '📋',
  },
];

export default function RefundReasonPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    // Get order data from sessionStorage
    const storedOrder = sessionStorage.getItem('refund_order');
    if (!storedOrder) {
      router.push('/portal');
      return;
    }
    setOrderData(JSON.parse(storedOrder));
  }, [router]);

  const handleContinue = () => {
    if (!selectedReason) return;

    const reason = REFUND_REASONS.find((r) => r.value === selectedReason);
    if (!reason) return;

    // Store reason data
    sessionStorage.setItem(
      'refund_reason',
      JSON.stringify({
        reason: selectedReason,
        reasonLabel: reason.label,
        note: note.trim(),
        requiresImage: reason.requiresImage,
      })
    );

    // Navigate based on whether images are required
    if (reason.requiresImage) {
      router.push('/portal/upload');
    } else {
      router.push('/portal/complete');
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const selectedReasonData = REFUND_REASONS.find((r) => r.value === selectedReason);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="ml-2 text-sm text-gray-600">Doğrulama</span>
            </div>
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">İade Nedeni</span>
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 font-bold">
                3
              </div>
              <span className="ml-2 text-sm text-gray-500">Tamamla</span>
            </div>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Sipariş Bilgileri</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sipariş No: {orderData.orderNumber}</span>
            <span className="text-gray-900 font-medium">
              {orderData.currencySymbol}
              {orderData.totalFinalPrice?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">İade Nedeninizi Seçin</h1>
          <p className="text-gray-600 mb-8">Ürünü neden iade etmek istediğinizi belirtin</p>

          {/* Reason Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {REFUND_REASONS.map((reason) => (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md ${
                  selectedReason === reason.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{reason.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{reason.label}</h3>
                    <p className="text-sm text-gray-600">{reason.description}</p>
                    {reason.requiresImage && (
                      <span className="inline-block mt-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        Fotoğraf gerekli
                      </span>
                    )}
                  </div>
                  {selectedReason === reason.value && (
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Note Input */}
          {selectedReason && (
            <div className="mb-6 animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ek Açıklama (Opsiyonel)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="İade nedeniniz hakkında daha fazla bilgi verebilirsiniz..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Info Box */}
          {selectedReasonData?.requiresImage && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="font-medium text-orange-900 mb-1">Fotoğraf Gerekli</h4>
                  <p className="text-sm text-orange-800">
                    Seçtiğiniz iade nedeni için ürünün fotoğraflarını yüklemeniz gerekmektedir. Bir sonraki adımda
                    fotoğraf yükleyebileceksiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/portal')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Geri
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedReason}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              Devam Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
