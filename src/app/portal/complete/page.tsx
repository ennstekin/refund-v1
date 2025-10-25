'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function RefundCompletePage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [reasonData, setReasonData] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refundId, setRefundId] = useState<string | null>(null);

  useEffect(() => {
    // Get all data from sessionStorage
    const storedOrder = sessionStorage.getItem('refund_order');
    const storedReason = sessionStorage.getItem('refund_reason');
    const storedImages = sessionStorage.getItem('refund_images');

    if (!storedOrder || !storedReason) {
      router.push('/portal');
      return;
    }

    setOrderData(JSON.parse(storedOrder));
    setReasonData(JSON.parse(storedReason));
    if (storedImages) {
      setImages(JSON.parse(storedImages));
    }
  }, [router]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Submit refund request
      const response = await axios.post('/api/public/submit-refund', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        merchantId: orderData.merchantId,
        customerEmail: orderData.customer.email,
        reason: reasonData.reason,
        reasonNote: reasonData.note,
        images: images, // In production, upload to storage first
      });

      if (response.data.success) {
        setRefundId(response.data.refundId);
        setSubmitted(true);

        // Clear sessionStorage
        sessionStorage.removeItem('refund_order');
        sessionStorage.removeItem('refund_reason');
        sessionStorage.removeItem('refund_images');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(error.response?.data?.error || 'İade talebi gönderilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (!orderData || !reasonData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">İade Talebiniz Alındı!</h1>

          <p className="text-gray-600 mb-8">
            İade talebiniz başarıyla oluşturuldu. Talebiniz en kısa sürede değerlendirilecek ve size email ile
            bilgilendirme yapılacaktır.
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">İade Süreci</h3>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">1. Talep Alındı</h4>
                  <p className="text-sm text-gray-600">İade talebiniz sistemimize kaydedildi</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">2. İnceleme</h4>
                  <p className="text-sm text-gray-600">Talebiniz müşteri hizmetleri tarafından incelenecek</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">3. Onay & Kargo</h4>
                  <p className="text-sm text-gray-600">Onay sonrası ürünü kargoya verebilirsiniz</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">4. İade Tamamlandı</h4>
                  <p className="text-sm text-gray-600">Ürün ulaştıktan sonra iadeniz işleme alınacak</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Sipariş No:</span> {orderData.orderNumber}
            </p>
            {refundId && (
              <div>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">İade Takip No:</span>{' '}
                  <span className="font-mono">{refundId}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Bu numarayı kullanarak iade durumunuzu takip edebilirsiniz
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {refundId && (
              <button
                onClick={() => router.push(`/portal/track/${refundId}`)}
                className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition font-medium"
              >
                İade Durumunu Görüntüle
              </button>
            )}
            <button
              onClick={() => router.push('/portal')}
              className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Yeni İade Talebi Oluştur
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="w-16 h-1 bg-green-500"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="ml-2 text-sm text-gray-600">İade Nedeni</span>
            </div>
            <div className="w-16 h-1 bg-green-500"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="ml-2 text-sm text-gray-600">Bilgiler</span>
            </div>
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Tamamla</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">İade Paketinizi Hazırlayın</h1>
          <p className="text-gray-600 mb-8">
            İade talebinizi göndermeden önce aşağıdaki talimatları okuyun
          </p>

          {/* Uploaded Images Preview */}
          {images.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Yüklenen Fotoğraflar</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`Ürün fotoğrafı ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                      {index + 1}/{images.length}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Talep Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sipariş No:</span>
                <span className="font-medium">{orderData.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">İade Nedeni:</span>
                <span className="font-medium">{reasonData.reasonLabel}</span>
              </div>
              {reasonData.note && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Not:</span>
                  <span className="font-medium max-w-xs text-right">{reasonData.note}</span>
                </div>
              )}
              {images.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fotoğraflar:</span>
                  <span className="font-medium">{images.length} adet</span>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              İade Paketleme Talimatları
            </h3>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Ürünü Orijinal Ambalajına Yerleştirin</h4>
                  <p className="text-sm text-gray-600">
                    Mümkünse ürünü orijinal kutusuna ve ambalaj malzemeleri ile birlikte yerleştirin. Tüm aksesuarların
                    ve belgelerin paket içinde olduğundan emin olun.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Güvenli Bir Şekilde Paketleyin</h4>
                  <p className="text-sm text-gray-600">
                    Ürünün nakliye sırasında zarar görmemesi için sağlam bir koli kullanın ve boşlukları dolgu
                    malzemesi ile doldurun.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">İade Kargo Talimatları</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    İadenizi aşağıdaki kargo bilgileri ile gönderebilirsiniz:
                  </p>
                  <div className="bg-white border border-blue-200 rounded p-3 text-sm">
                    <p className="font-medium text-gray-900 mb-2">📦 Kargo Gönderim Bilgileri</p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">İadenizi DHL (MNG) Kargo</span> ile gönderebilirsiniz.
                    </p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Kurumsal Kod:</span> <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">663877199</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Adres:</span> Kağıthane / İstanbul depomuza
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-medium text-orange-900 mb-1">Önemli Uyarı</h4>
                <p className="text-sm text-orange-800">
                  Lütfen iade talebiniz onaylanmadan ürünü kargoya vermeyin. Onay emaili aldıktan sonra belirtilen
                  adrese gönderin. Onaysız gönderilen ürünler işleme alınmayabilir.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (reasonData.requiresImage) {
                  router.push('/portal/upload');
                } else {
                  router.push('/portal/reason');
                }
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Geri
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  İade Talebini Gönder
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
