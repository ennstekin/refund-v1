'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RefundUploadPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [reasonData, setReasonData] = useState<any>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Get data from sessionStorage
    const storedOrder = sessionStorage.getItem('refund_order');
    const storedReason = sessionStorage.getItem('refund_reason');

    if (!storedOrder || !storedReason) {
      router.push('/portal');
      return;
    }

    const order = JSON.parse(storedOrder);
    const reason = JSON.parse(storedReason);

    // If this reason doesn't require images, redirect to complete
    if (!reason.requiresImage) {
      router.push('/portal/complete');
      return;
    }

    setOrderData(order);
    setReasonData(reason);
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 5 images
    if (images.length + files.length > 5) {
      alert('En fazla 5 fotoğraf yükleyebilirsiniz');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} bir resim dosyası değil`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert(`${file.name} dosyası çok büyük (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setImages([...images, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (images.length === 0) {
      alert('Lütfen en az 1 fotoğraf yükleyin');
      return;
    }

    // Store images as base64 in sessionStorage (for demo purposes)
    // In production, you'd upload to a storage service
    sessionStorage.setItem('refund_images', JSON.stringify(previews));
    router.push('/portal/complete');
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
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Fotoğraflar</span>
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 font-bold">
                4
              </div>
              <span className="ml-2 text-sm text-gray-500">Tamamla</span>
            </div>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Sipariş Bilgileri</h3>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Sipariş No: {orderData.orderNumber}</span>
            <span className="text-gray-900 font-medium">
              {orderData.currencySymbol}
              {orderData.totalFinalPrice?.toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            İade Nedeni: <span className="font-medium text-gray-900">{reasonData.reasonLabel}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ürün Fotoğrafları</h1>
          <p className="text-gray-600 mb-6">
            Ürünün durumunu gösteren fotoğraflar yükleyin (En az 1, en fazla 5 fotoğraf)
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Fotoğraf İpuçları</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Ürünün hasarını veya kusurunu net bir şekilde gösterin</li>
              <li>Farklı açılardan fotoğraflar çekin</li>
              <li>Fotoğrafların aydınlık ve net olmasına dikkat edin</li>
              <li>Her fotoğraf en fazla 5MB olabilir</li>
            </ul>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <label
              htmlFor="image-upload"
              className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-blue-600">Dosya seçmek için tıklayın</span> veya sürükleyin
              </p>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, JPEG (max. 5MB)</p>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={images.length >= 5}
            />
          </div>

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {(images[index].size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <p className="text-sm text-gray-600 mb-6">
              {images.length} / 5 fotoğraf yüklendi
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/portal/reason')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Geri
            </button>
            <button
              onClick={handleContinue}
              disabled={images.length === 0}
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
