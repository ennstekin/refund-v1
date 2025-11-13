export default function PortalNotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Portal Bulunamadı</h1>

        <p className="text-gray-600 mb-6">
          Bu iade portalı mevcut değil veya devre dışı bırakılmış.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Eğer bu sayfayı bir mağazadan geldiyseniz, lütfen mağaza ile iletişime geçin.
          </p>
        </div>

        <p className="text-xs text-gray-500">
          Portal durumu: Devre dışı veya bulunamadı
        </p>
      </div>
    </div>
  );
}
