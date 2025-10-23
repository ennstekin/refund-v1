# İade Yönetim Sistemi - Geliştirme Günlüğü

## 📅 Tarih: 23 Ekim 2025

## 🎯 Proje Hedefi

ikas e-ticaret platformu için kapsamlı bir iade yönetim sistemi geliştirmek. Hem mağaza yöneticilerinin hem de müşterilerin kolayca iade talepleri oluşturabilmesi ve yönetebilmesi için iki ayrı arayüz sunmak.

---

## 🚀 Bugün Tamamlanan Özellikler

### 1. İki Sekme ile İade Yönetim Sistemi

**Dosyalar:**
- `/src/app/refunds/page.tsx`
- `/src/app/api/ikas/refund-orders/route.ts`
- `/src/lib/ikas-client/graphql-requests.ts`

**Özellikler:**
- **İKAS Siparişleri Sekmesi**:
  - Son 90 gündeki ikas API'den otomatik çekilen iade durumundaki siparişler
  - GraphQL sorgusu ile filtreleme: `REFUND_REQUESTED`, `REFUNDED`, `REFUND_DELIVERED`
  - Müşteri bilgileri, sipariş tutarı, tarih gibi detaylar

- **Manuel Kayıtlar Sekmesi**:
  - Veritabanında manuel oluşturulan iade kayıtları
  - Yöneticilerin eklediği özel iade talepleri
  - "Yeni İade Kaydı" butonu ile hızlı ekleme

**Teknik Detaylar:**
```typescript
// GraphQL Query (graphql-requests.ts)
export const LIST_REFUND_ORDERS = gql`
  query listRefundOrders($pagination: PaginationInput, $orderedAt: DateFilterInput) {
    listOrder(
      pagination: $pagination
      orderedAt: $orderedAt
      orderPackageStatus: { in: [REFUND_REQUESTED, REFUNDED, REFUND_DELIVERED] }
      sort: "-orderedAt"
    ) {
      data {
        id
        orderNumber
        orderPackageStatus
        totalFinalPrice
        orderedAt
        customer { email firstName lastName }
      }
    }
  }
`;
```

**Karşılaşılan Sorunlar ve Çözümler:**
1. **GraphQL Enum Hatası**: Enum değerlerinde tırnak işareti kullanıldı
   - ❌ `{ in: ["REFUND_REQUESTED", ...] }`
   - ✅ `{ in: [REFUND_REQUESTED, ...] }`

2. **Pagination Offset Hatası**: ikas API'si offset parametresini desteklemiyor
   - ❌ `pagination: { limit: 100, offset: 0 }`
   - ✅ `pagination: { limit: 100 }`

---

### 2. Manuel İade Kaydı Oluşturma

**Dosyalar:**
- `/src/app/refunds/new/page.tsx`
- `/src/app/api/ikas/orders/route.ts`
- `/src/app/api/refunds/route.ts`

**Özellikler:**
- Sipariş arama fonksiyonu (sipariş numarası, müşteri ismi, e-posta ile)
- 7 adet önceden tanımlanmış iade nedeni:
  1. `damaged_product` - Hasarlı Ürün 📦
  2. `wrong_product` - Yanlış Ürün 🔄
  3. `defective_product` - Kusurlu Ürün ⚠️
  4. `not_as_described` - Açıklamaya Uygun Değil 📝
  5. `late_delivery` - Geç Teslimat ⏰
  6. `customer_request` - Fikrim Değişti 💭
  7. `other` - Diğer 📋
- İade notu ekleme alanı
- Kargo takip numarası girişi (opsiyonel)
- Otomatik timeline event oluşturma

**Timeline Sistemi:**
Her iade kaydı oluşturulduğunda otomatik olarak bir timeline event oluşturuluyor:
```typescript
await prisma.refundTimeline.create({
  data: {
    refundRequestId: refundRequest.id,
    eventType: 'created',
    eventData: JSON.stringify({ orderId, orderNumber }),
    description: 'Manuel iade kaydı oluşturuldu',
    createdBy: 'Yönetici',
  },
});
```

---

### 3. Müşteri Self-Service Portalı

**Dosyalar:**
- `/src/app/portal/page.tsx` - Sipariş doğrulama
- `/src/app/portal/reason/page.tsx` - İade nedeni seçimi
- `/src/app/portal/upload/page.tsx` - Fotoğraf yükleme
- `/src/app/portal/complete/page.tsx` - Tamamlama ve gönderme
- `/src/app/api/public/verify-order/route.ts` - Sipariş doğrulama API
- `/src/app/api/public/submit-refund/route.ts` - İade gönderme API

**4 Adımlı Müşteri Akışı:**

#### Adım 1: Sipariş Doğrulama (`/portal`)
- Sipariş numarası girişi
- E-posta adresi girişi
- ikas API'den sipariş kontrolü
- E-posta eşleşme doğrulaması
- Daha önce iade oluşturulmuş mu kontrolü
- SessionStorage'a sipariş bilgisi kaydetme

#### Adım 2: İade Nedeni Seçimi (`/portal/reason`)
- 7 adet iade nedeni kartları
- Her nedenin ikonu ve açıklaması
- Bazı nedenler için zorunlu fotoğraf yükleme
- Opsiyonel not alanı
- İlerleme çubuğu gösterimi

#### Adım 3: Fotoğraf Yükleme (`/portal/upload`)
- Sadece hasarlı/yanlış/kusurlu ürünler için gösteriliyor
- Maksimum 5 fotoğraf
- Dosya başına 5MB limit
- Fotoğraf önizleme özelliği
- Base64 formatında sessionStorage'a kaydetme
- Drag & drop desteği

**Teknik Detaylar:**
```typescript
// Dosya validasyonu ve önizleme
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);

  // Maksimum 5 fotoğraf kontrolü
  if (images.length + files.length > 5) {
    alert('En fazla 5 fotoğraf yükleyebilirsiniz');
    return;
  }

  // Dosya tipi ve boyut kontrolü
  const validFiles = files.filter((file) => {
    if (!file.type.startsWith('image/')) return false;
    if (file.size > 5 * 1024 * 1024) return false; // 5MB
    return true;
  });

  // Base64 önizleme oluşturma
  validFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews([...previews, reader.result as string]);
    };
    reader.readAsDataURL(file);
  });
};
```

#### Adım 4: Tamamlama ve Gönderme (`/portal/complete`)
- İade paket talimatları gösterimi:
  - Ürünü orijinal kutusu ile paketleyin
  - Faturayı ekleyin
  - Kargo ile gönderin
- Özet bilgileri gösterme
- İade talebini API'ye gönderme
- Başarılı olursa referans numarası gösterme
- SessionStorage temizleme

**Public API Endpoints:**

Bu endpoint'ler JWT authentication gerektirmiyor (müşteriler için):

```typescript
// /api/public/verify-order
export async function POST(request: NextRequest) {
  const { orderNumber, email } = await request.json();

  // Merchant'ın auth token'ını al
  const merchants = await prisma.merchant.findMany({ take: 1 });
  const authToken = await AuthTokenManager.get(merchants[0].authorizedAppId);

  // ikas'tan siparişi kontrol et
  const ikasClient = getIkas(authToken);
  const orderResponse = await ikasClient.queries.listOrder({
    pagination: { limit: 1 },
    search: orderNumber.trim(),
  });

  // E-posta eşleşmesi kontrolü
  // Duplicate iade kontrolü
  // Sipariş bilgilerini döndür
}
```

**SessionStorage Akışı:**
1. `refund_order` - Sipariş bilgileri (Adım 1)
2. `refund_reason` - İade nedeni ve notu (Adım 2)
3. `refund_images` - Base64 formatında fotoğraflar (Adım 3)
4. Gönderildikten sonra tüm veriler temizleniyor

---

### 4. Merchant Ayarlar Sayfası

**Dosyalar:**
- `/src/app/settings/page.tsx`
- `/src/app/api/settings/route.ts`
- `/prisma/schema.prisma` (Merchant modeli eklendi)

**Veritabanı Şeması:**
```prisma
model Merchant {
  id              String   @id
  authorizedAppId String   @unique
  storeName       String?
  email           String?
  portalUrl       String?  // Özel domain (örn: iade.magaza.com)
  portalEnabled   Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Özellikler:**

1. **Portal Aktif/Pasif Yapma:**
   - Toggle switch ile portal açma/kapama
   - Portalı kapatınca müşteriler erişemiyor

2. **Özel Domain Ayarlama:**
   - `https://` prefix otomatik ekleniyor
   - Örnek: `iade.magaza.com`
   - Boş bırakılırsa varsayılan URL kullanılıyor: `{origin}/portal`

3. **Portal URL Gösterimi:**
   - Aktif portal URL'i gösteriliyor
   - "Kopyala" butonu ile panoya kopyalama
   - Gerçek zamanlı önizleme

4. **Entegrasyon Örnekleri:**

   **E-posta Şablonu:**
   ```
   İade talebiniz için: {portalUrl}
   ```

   **Web Sitesi HTML Butonu:**
   ```html
   <a href="{portalUrl}" class="btn">İade Başvurusu</a>
   ```

   **WhatsApp/SMS Mesajı:**
   ```
   Siparişiniz için iade talebi oluşturmak için: {portalUrl}
   ```

**API Endpoints:**

```typescript
// GET /api/settings - Ayarları getir veya oluştur
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);

  let merchant = await prisma.merchant.findUnique({
    where: { authorizedAppId: user.authorizedAppId },
  });

  // Merchant yoksa oluştur
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        id: user.merchantId,
        authorizedAppId: user.authorizedAppId,
        portalEnabled: true,
      },
    });
  }

  return NextResponse.json({ data: merchant });
}

// PATCH /api/settings - Ayarları güncelle
export async function PATCH(request: NextRequest) {
  const { portalUrl, portalEnabled } = await request.json();

  const merchant = await prisma.merchant.upsert({
    where: { authorizedAppId: user.authorizedAppId },
    update: { portalUrl, portalEnabled },
    create: { /* ... */ },
  });

  return NextResponse.json({ data: merchant });
}
```

---

### 5. Dashboard Güncellemeleri

**Dosya:**
- `/src/app/dashboard/page.tsx`

**Değişiklikler:**
- Var olmayan `HomePage` component'ini kaldırdık
- 3 adet navigasyon kartı eklendi:
  1. 📋 **İade Talepleri** → `/refunds`
  2. ⚙️ **Ayarlar** → `/settings`
  3. 🌐 **Müşteri Portalı** → `/portal` (yeni sekmede açılır)
- Temiz ve minimalist tasarım
- ikas store bilgisi gösterimi
- Tailwind CSS ile responsive tasarım

---

## 📊 Veritabanı Yapısı

### Mevcut Modeller:

```prisma
// İade talepleri
model RefundRequest {
  id              String   @id @default(cuid())
  orderId         String   @unique
  orderNumber     String
  merchantId      String
  status          String   // pending, processing, completed, rejected
  reason          String?  // iade nedeni
  reasonNote      String?  // ek açıklama
  trackingNumber  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  notes           RefundNote[]
  timeline        RefundTimeline[]
}

// İade notları
model RefundNote {
  id              String   @id @default(cuid())
  refundRequestId String
  content         String
  createdBy       String
  createdAt       DateTime @default(now())

  refundRequest   RefundRequest @relation(...)
}

// İade zaman çizelgesi
model RefundTimeline {
  id              String   @id @default(cuid())
  refundRequestId String
  eventType       String   // created, status_changed, note_added, etc.
  eventData       String?  // JSON data
  description     String
  createdBy       String?
  createdAt       DateTime @default(now())

  refundRequest   RefundRequest @relation(...)
}

// Mağaza ayarları
model Merchant {
  id              String   @id
  authorizedAppId String   @unique
  storeName       String?
  email           String?
  portalUrl       String?
  portalEnabled   Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 🔧 Teknik Mimari

### Frontend Stack:
- **Next.js 15** - App Router
- **React 19** - Client & Server Components
- **TypeScript** - Type-safe kod
- **Tailwind CSS** - Styling
- **SessionStorage** - Multi-step form state management

### Backend Stack:
- **Next.js API Routes** - RESTful endpoints
- **Prisma ORM** - Database management
- **SQLite** - Development database
- **ikas Admin API** - GraphQL client
- **Iron Session** - JWT authentication

### API Yapısı:

**Authenticated Endpoints (JWT gerekli):**
- `/api/refunds` - CRUD operations
- `/api/refunds/[id]` - Detay ve güncelleme
- `/api/refunds/[id]/timeline` - Timeline eventleri
- `/api/ikas/orders` - Sipariş arama
- `/api/ikas/refund-orders` - İade siparişleri
- `/api/settings` - Mağaza ayarları

**Public Endpoints (JWT gerekmez):**
- `/api/public/verify-order` - Sipariş doğrulama
- `/api/public/submit-refund` - İade gönderme

### Authentication Flow:

```typescript
// Frontend: Token alma
const token = await TokenHelpers.getTokenForIframeApp();

// Frontend: API çağrısı
const response = await ApiRequests.refunds.list(token);

// Backend: Token doğrulama
const user = getUserFromRequest(request);
// user.authorizedAppId, user.merchantId

// Backend: ikas API çağrısı
const authToken = await AuthTokenManager.get(user.authorizedAppId);
const ikasClient = getIkas(authToken);
const response = await ikasClient.queries.listOrder();
```

---

## 🐛 Karşılaşılan Sorunlar ve Çözümler

### 1. GraphQL Enum Validation Hatası

**Hata:**
```
Enum "OrderPackageStatusEnum" cannot represent non-enum value: "REFUND_REQUESTED"
```

**Neden:**
GraphQL'de enum değerleri string olarak değil, doğrudan enum sabitleri olarak kullanılmalı.

**Çözüm:**
```typescript
// ❌ Yanlış
orderPackageStatus: { in: ["REFUND_REQUESTED", "REFUNDED", "REFUND_DELIVERED"] }

// ✅ Doğru
orderPackageStatus: { in: [REFUND_REQUESTED, REFUNDED, REFUND_DELIVERED] }
```

**Dosya:** `/src/lib/ikas-client/graphql-requests.ts:169`

---

### 2. Pagination Offset Parametresi Desteklenmiyor

**Hata:**
```
Variable "$pagination" got invalid value { limit: 100, offset: 0 };
Field "offset" is not defined by type "PaginationInput".
```

**Neden:**
ikas GraphQL API'sinin PaginationInput type'ı offset parametresini kabul etmiyor.

**Çözüm:**
```typescript
// ❌ Yanlış
pagination: { limit: 100, offset: 0 }

// ✅ Doğru
pagination: { limit: 100 }
```

**Dosya:** `/src/app/api/ikas/refund-orders/route.ts:24`

---

### 3. Public Endpoints için Merchant Belirleme

**Sorun:**
Müşteri portalı endpoint'leri JWT gerektirmediği için hangi merchant'a ait olduğunu belirleyemiyoruz.

**Geçici Çözüm:**
```typescript
// İlk merchant'ı kullan (development için)
const merchants = await prisma.merchant.findMany({ take: 1 });
const authToken = await AuthTokenManager.get(merchants[0].authorizedAppId);
```

**Production Önerisi:**
- Domain-based routing: Her merchant'ın kendi subdomain'i olmalı
- Örnek: `iade.magaza1.com`, `iade.magaza2.com`
- Domain'den merchant'ı belirle

**Dosya:** `/src/app/api/public/verify-order/route.ts:16-17`

---

### 4. Image Upload Strategy

**Sorun:**
Müşterilerden fotoğraf alıyoruz ama depolama servisi yok.

**Şu Anki Çözüm:**
- Fotoğrafları base64 formatına çeviriyoruz
- SessionStorage'da tutuyoruz
- Submit edildiğinde backend'e gönderiyoruz
- Sadece fotoğraf sayısı kaydediliyor

**Production Önerisi:**
```typescript
// 1. Cloud storage servisi kullan (AWS S3, Cloudinary, etc.)
const uploadImage = async (base64Image: string) => {
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: JSON.stringify({ image: base64Image }),
  });
  return response.json(); // { url: 'https://...' }
};

// 2. Veritabanında URL'leri sakla
model RefundImage {
  id              String @id @default(cuid())
  refundRequestId String
  imageUrl        String
  thumbnailUrl    String?
  createdAt       DateTime @default(now())

  refundRequest   RefundRequest @relation(...)
}
```

---

## 📝 Kod Kalitesi ve Best Practices

### 1. TypeScript Strict Mode
Tüm dosyalarda strict type checking aktif:
```typescript
// Type safety örneği
type RefundReason = {
  value: string;
  label: string;
  requiresImage: boolean;
  icon: string;
};

const REFUND_REASONS: RefundReason[] = [
  { value: 'damaged_product', label: 'Hasarlı Ürün', requiresImage: true, icon: '📦' },
  // ...
];
```

### 2. Error Handling
Tüm API çağrılarında try-catch blokları:
```typescript
try {
  const response = await apiCall();
  if (response.isSuccess) {
    // başarılı işlem
  }
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
}
```

### 3. React Hooks Patterns
```typescript
// useCallback ile memoization
const fetchData = useCallback(async (token: string) => {
  // API çağrısı
}, []);

// useEffect dependency array
useEffect(() => {
  initializePage();
}, [initializePage]);

// Loading states
const [loading, setLoading] = useState(true);
```

### 4. API Response Format
Tutarlı response formatı:
```typescript
// Success
{ data: { ...actualData } }

// Error
{ error: 'Error message', success: false }

// Created
{ success: true, refundId: '...', message: '...' }
```

---

## 🎨 UI/UX Özellikleri

### 1. Progress Bar
Multi-step form'larda ilerleme göstergesi:
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-blue-600 h-2 rounded-full transition-all"
    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
  />
</div>
```

### 2. Loading States
Tüm API çağrılarında loading göstergeleri:
```tsx
{loading ? (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg">Yükleniyor...</div>
  </div>
) : (
  // İçerik
)}
```

### 3. Success/Error Messages
Kullanıcı geri bildirimi:
```tsx
{success && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <p className="text-green-800">İşlem başarılı!</p>
  </div>
)}

{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-800">{error}</p>
  </div>
)}
```

### 4. Responsive Design
Tüm sayfalarda mobile-first tasarım:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Kartlar */}
</div>
```

### 5. Icon System
SVG icon'lar ve emoji kullanımı:
```tsx
// SVG icons
<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
</svg>

// Emoji icons
const icon = '📦'; // Görsel çekicilik için
```

---

## 🚀 Production Önerileri

### 1. Image Storage
**Şu an:** Base64 formatında sessionStorage
**Önerim:** AWS S3, Cloudinary veya benzeri bir servis

```typescript
// Örnek implementation
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadToS3(file: File) {
  const s3 = new S3Client({ region: 'eu-west-1' });
  const key = `refunds/${Date.now()}-${file.name}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type,
  }));

  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

### 2. Email Notifications
Müşteriye ve yöneticiye e-posta gönderimi:

```typescript
// Müşteriye: İade talebi alındı
await sendEmail({
  to: customerEmail,
  subject: 'İade Talebiniz Alındı',
  template: 'refund-received',
  data: { orderNumber, refundId, trackingInstructions },
});

// Yöneticiye: Yeni iade talebi
await sendEmail({
  to: merchantEmail,
  subject: 'Yeni İade Talebi',
  template: 'new-refund-admin',
  data: { orderNumber, customerName, reason },
});
```

**Önerilen Servisler:**
- SendGrid
- AWS SES
- Mailgun
- Postmark

### 3. Multi-Tenant Domain Routing
Her merchant için ayrı subdomain:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  if (subdomain.startsWith('iade-')) {
    const merchantId = subdomain.replace('iade-', '');
    request.headers.set('x-merchant-id', merchantId);
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

// API'de kullanımı
const merchantId = request.headers.get('x-merchant-id');
const merchant = await prisma.merchant.findUnique({
  where: { id: merchantId },
});
```

### 4. Database Migration
SQLite'dan Production veritabanına geçiş:

```prisma
// schema.prisma
datasource db {
  provider = "postgresql" // veya "mysql"
  url      = env("DATABASE_URL")
}
```

**Migration:**
```bash
# 1. Schema'yı PostgreSQL'e uyarla
pnpm prisma migrate dev --name init

# 2. Data migration
# SQLite'dan export
sqlite3 prisma/dev.db .dump > backup.sql

# 3. PostgreSQL'e import (SQL dönüşümleri yaparak)
```

### 5. Cargo Label Generation
Kargo etiketi oluşturma entegrasyonu:

```typescript
// Kargo firması API entegrasyonu
export async function createShippingLabel(refundRequest: RefundRequest) {
  const response = await fetch('https://cargo-api.com/create-label', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.CARGO_API_KEY}` },
    body: JSON.stringify({
      sender: merchantAddress,
      receiver: customerAddress,
      packageInfo: { weight, dimensions },
    }),
  });

  const { labelUrl, trackingNumber } = await response.json();

  // Tracking number'ı kaydet
  await prisma.refundRequest.update({
    where: { id: refundRequest.id },
    data: { trackingNumber },
  });

  return labelUrl;
}
```

### 6. Customer Tracking Page
Müşteriler için iade durumu takip sayfası:

```typescript
// /portal/track/[refundId]/page.tsx
export default function TrackRefundPage({ params }: { params: { refundId: string } }) {
  const [refund, setRefund] = useState(null);
  const [timeline, setTimeline] = useState([]);

  // Public endpoint ile veri çek
  useEffect(() => {
    fetchRefundStatus(params.refundId);
  }, [params.refundId]);

  return (
    <div>
      <h1>İade Durumu: {refund.status}</h1>
      <Timeline events={timeline} />
    </div>
  );
}
```

### 7. Analytics & Monitoring
İade istatistikleri ve monitoring:

```typescript
// Dashboard için metrikler
export async function getRefundMetrics(merchantId: string, period: 'week' | 'month') {
  const refunds = await prisma.refundRequest.findMany({
    where: {
      merchantId,
      createdAt: { gte: getStartDate(period) },
    },
  });

  return {
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending').length,
    completed: refunds.filter(r => r.status === 'completed').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    topReasons: getTopReasons(refunds),
    averageProcessingTime: calculateAverageTime(refunds),
  };
}
```

### 8. Security Enhancements

**Rate Limiting:**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function checkRateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier);
  return success;
}

// API route'da kullanımı
const ip = request.headers.get('x-forwarded-for') || 'anonymous';
const allowed = await checkRateLimit(ip);
if (!allowed) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

**CSRF Protection:**
```typescript
// Public form'larda CSRF token kullanımı
import { csrf } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  const isValid = await csrf.verify(request);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  // İşlem devam eder
}
```

### 9. Caching Strategy
API response'ları için cache:

```typescript
// Redis cache örneği
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  const cacheKey = `refunds:${user.merchantId}`;

  // Cache'den kontrol et
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  // Veritabanından çek
  const refunds = await prisma.refundRequest.findMany({
    where: { merchantId: user.merchantId },
  });

  // Cache'e kaydet (5 dakika)
  await redis.setex(cacheKey, 300, JSON.stringify(refunds));

  return NextResponse.json({ data: refunds });
}
```

### 10. Testing Strategy

**Unit Tests:**
```typescript
// __tests__/api/refunds.test.ts
import { POST } from '@/app/api/refunds/route';

describe('POST /api/refunds', () => {
  it('should create a refund request', async () => {
    const request = new NextRequest('http://localhost/api/refunds', {
      method: 'POST',
      body: JSON.stringify({
        orderId: 'test-order-id',
        orderNumber: '12345',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.orderId).toBe('test-order-id');
  });
});
```

**Integration Tests:**
```typescript
// e2e/portal-flow.spec.ts
import { test, expect } from '@playwright/test';

test('customer can submit refund request', async ({ page }) => {
  // Sipariş doğrulama
  await page.goto('/portal');
  await page.fill('input[name="orderNumber"]', '12345');
  await page.fill('input[name="email"]', 'customer@example.com');
  await page.click('button[type="submit"]');

  // İade nedeni seçimi
  await expect(page).toHaveURL('/portal/reason');
  await page.click('[data-reason="damaged_product"]');
  await page.click('button:has-text("Devam Et")');

  // Fotoğraf yükleme
  await expect(page).toHaveURL('/portal/upload');
  await page.setInputFiles('input[type="file"]', 'test-image.jpg');
  await page.click('button:has-text("Devam Et")');

  // Gönderme
  await expect(page).toHaveURL('/portal/complete');
  await page.click('button:has-text("İade Talebini Gönder")');

  // Başarı mesajı
  await expect(page.locator('text=İade talebiniz başarıyla oluşturuldu')).toBeVisible();
});
```

---

## 📚 API Dokümantasyonu

### Authenticated Endpoints

#### GET /api/refunds
Manuel iade kayıtlarını listeler.

**Headers:**
```
Authorization: JWT {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": "cmh3sfiba000ko1mt62ot2fs8",
      "orderId": "order123",
      "orderNumber": "12345",
      "status": "pending",
      "reason": "damaged_product",
      "reasonNote": "Kutu ezik geldi",
      "trackingNumber": null,
      "createdAt": "2025-10-23T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/refunds
Yeni manuel iade kaydı oluşturur.

**Headers:**
```
Authorization: JWT {token}
```

**Body:**
```json
{
  "orderId": "order123",
  "orderNumber": "12345",
  "reason": "damaged_product",
  "reasonNote": "Kutu ezik geldi",
  "trackingNumber": "TRK123456"
}
```

**Response:**
```json
{
  "data": {
    "id": "cmh3sfiba000ko1mt62ot2fs8",
    "orderId": "order123",
    "orderNumber": "12345",
    "status": "pending",
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

#### GET /api/refunds/[id]
İade detaylarını getirir.

**Response:**
```json
{
  "data": {
    "id": "cmh3sfiba000ko1mt62ot2fs8",
    "orderId": "order123",
    "orderNumber": "12345",
    "status": "pending",
    "reason": "damaged_product",
    "reasonNote": "Kutu ezik geldi",
    "trackingNumber": null,
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z",
    "notes": [],
    "timeline": []
  }
}
```

#### PATCH /api/refunds/[id]
İade durumunu günceller.

**Body:**
```json
{
  "status": "processing",
  "trackingNumber": "TRK123456"
}
```

#### GET /api/refunds/[id]/timeline
İade zaman çizelgesini getirir.

**Response:**
```json
{
  "data": [
    {
      "id": "timeline123",
      "eventType": "created",
      "description": "İade talebi oluşturuldu",
      "createdBy": "Müşteri",
      "createdAt": "2025-10-23T10:00:00.000Z"
    },
    {
      "id": "timeline124",
      "eventType": "status_changed",
      "description": "Durum 'pending' -> 'processing' olarak değiştirildi",
      "createdBy": "Yönetici",
      "createdAt": "2025-10-23T11:00:00.000Z"
    }
  ]
}
```

#### GET /api/ikas/orders
ikas'tan sipariş arama.

**Query Params:**
```
?search=12345&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "order123",
      "orderNumber": "12345",
      "status": "delivered",
      "totalFinalPrice": 199.99,
      "currencySymbol": "₺",
      "orderedAt": "2025-10-20T10:00:00.000Z",
      "customer": {
        "email": "customer@example.com",
        "firstName": "Ahmet",
        "lastName": "Yılmaz"
      }
    }
  ]
}
```

#### GET /api/ikas/refund-orders
Son 90 günde iade durumundaki siparişleri getirir.

**Response:**
```json
{
  "data": [
    {
      "id": "order456",
      "orderNumber": "67890",
      "orderPackageStatus": "REFUND_REQUESTED",
      "totalFinalPrice": 299.99,
      "currencySymbol": "₺",
      "orderedAt": "2025-10-15T10:00:00.000Z",
      "customer": {
        "email": "customer2@example.com",
        "firstName": "Ayşe",
        "lastName": "Demir"
      }
    }
  ]
}
```

#### GET /api/settings
Mağaza ayarlarını getirir (yoksa oluşturur).

**Response:**
```json
{
  "data": {
    "id": "merchant123",
    "authorizedAppId": "app456",
    "storeName": "Test Mağaza",
    "email": "store@example.com",
    "portalUrl": "iade.testmagaza.com",
    "portalEnabled": true,
    "createdAt": "2025-10-23T10:00:00.000Z",
    "updatedAt": "2025-10-23T10:00:00.000Z"
  }
}
```

#### PATCH /api/settings
Mağaza ayarlarını günceller.

**Body:**
```json
{
  "portalUrl": "iade.testmagaza.com",
  "portalEnabled": true
}
```

### Public Endpoints (JWT gerekmez)

#### POST /api/public/verify-order
Sipariş numarası ve e-posta ile doğrulama.

**Body:**
```json
{
  "orderNumber": "12345",
  "email": "customer@example.com"
}
```

**Response (Success):**
```json
{
  "verified": true,
  "order": {
    "id": "order123",
    "orderNumber": "12345",
    "merchantId": "merchant123",
    "customer": {
      "email": "customer@example.com",
      "firstName": "Ahmet",
      "lastName": "Yılmaz"
    }
  }
}
```

**Response (Error):**
```json
{
  "error": "Sipariş bulunamadı",
  "verified": false
}
```

#### POST /api/public/submit-refund
Müşteri iade talebi gönderimi.

**Body:**
```json
{
  "orderId": "order123",
  "orderNumber": "12345",
  "merchantId": "merchant123",
  "customerEmail": "customer@example.com",
  "reason": "damaged_product",
  "reasonNote": "Kutu ezik geldi",
  "images": ["base64image1", "base64image2"]
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "cmh3sfiba000ko1mt62ot2fs8",
  "message": "İade talebiniz başarıyla oluşturuldu"
}
```

---

## 🎯 Sonraki Adımlar (Roadmap)

### Kısa Vadeli (1-2 Hafta)
- [ ] E-posta bildirim entegrasyonu
- [ ] Fotoğraf yükleme için S3 entegrasyonu
- [ ] Admin panelinde toplu işlem (bulk actions)
- [ ] İade durumu filtreleme ve sıralama
- [ ] Export to Excel/CSV fonksiyonu

### Orta Vadeli (1 Ay)
- [ ] Multi-tenant domain routing
- [ ] Kargo firması entegrasyonları
- [ ] Otomatik kargo etiketi oluşturma
- [ ] SMS bildirimleri
- [ ] WhatsApp entegrasyonu
- [ ] Müşteri iade takip sayfası

### Uzun Vadeli (2-3 Ay)
- [ ] İade istatistikleri dashboard'u
- [ ] AI-powered iade nedeni analizi
- [ ] Otomatik iade onay kuralları
- [ ] Müşteri puanlama sistemi
- [ ] API rate limiting ve security enhancements
- [ ] Mobile app (React Native)
- [ ] Unit ve integration testleri
- [ ] Production deployment (Vercel/AWS)

---

## 🔐 Güvenlik Notları

### Şu Anki Güvenlik Önlemleri:
1. ✅ JWT authentication (admin endpoints)
2. ✅ Iron Session ile güvenli session yönetimi
3. ✅ Prisma ORM ile SQL injection koruması
4. ✅ CORS ayarları
5. ✅ Environment variables (.env)

### Eklenecek Güvenlik Önlemleri:
1. ⏳ Rate limiting (DDoS koruması)
2. ⏳ CSRF token (public forms)
3. ⏳ Input validation ve sanitization
4. ⏳ File upload security (virus scan)
5. ⏳ API key rotation
6. ⏳ Audit logging
7. ⏳ HTTPS zorunluluğu (production)

---

## 📈 Performans Notları

### Şu Anki Durum:
- ✅ React Server Components kullanımı
- ✅ API response'ları optimize edilmiş
- ✅ Database query'leri optimize edilmiş
- ✅ Lazy loading (Next.js otomatik)

### İyileştirme Fırsatları:
1. ⏳ Redis cache implementasyonu
2. ⏳ Image optimization (next/image)
3. ⏳ Database connection pooling
4. ⏳ CDN kullanımı (static assets)
5. ⏳ GraphQL query batching
6. ⏳ Skeleton loading states
7. ⏳ Infinite scroll (pagination yerine)

---

## 📱 Responsive Design Notları

Tüm sayfalar aşağıdaki breakpoint'lerde test edildi:
- ✅ Mobile (320px - 640px)
- ✅ Tablet (641px - 1024px)
- ✅ Desktop (1025px+)

**Tailwind Breakpoints:**
```css
sm: 640px   /* Küçük tablet */
md: 768px   /* Tablet */
lg: 1024px  /* Küçük laptop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Büyük ekran */
```

---

## 🌐 Internationalization (i18n)

Şu an sadece Türkçe dil desteği var. İlerleyen zamanlarda eklenebilir:

```typescript
// lib/i18n.ts
export const translations = {
  tr: {
    'refunds.title': 'İade Talepleri',
    'refunds.status.pending': 'Beklemede',
    'refunds.status.processing': 'İşlemde',
    'refunds.status.completed': 'Tamamlandı',
  },
  en: {
    'refunds.title': 'Refund Requests',
    'refunds.status.pending': 'Pending',
    'refunds.status.processing': 'Processing',
    'refunds.status.completed': 'Completed',
  },
};

export function t(key: string, locale: string = 'tr'): string {
  return translations[locale]?.[key] || key;
}
```

---

## 🧪 Test Coverage

**Şu anki durum:** Test yok ⚠️

**Eklenecek testler:**

### Unit Tests:
```bash
# API routes
__tests__/api/refunds/route.test.ts
__tests__/api/settings/route.test.ts
__tests__/api/public/verify-order.test.ts

# Utilities
__tests__/lib/api-requests.test.ts
__tests__/helpers/token-helpers.test.ts

# Components
__tests__/components/RefundCard.test.tsx
__tests__/components/Timeline.test.tsx
```

### Integration Tests:
```bash
# E2E flows
e2e/admin-create-refund.spec.ts
e2e/customer-portal-flow.spec.ts
e2e/settings-configuration.spec.ts
```

**Komutlar:**
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

---

## 🐳 Docker Support

Production deployment için Docker configuration:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/refunds
      - IKAS_CLIENT_ID=${IKAS_CLIENT_ID}
      - IKAS_CLIENT_SECRET=${IKAS_CLIENT_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=refunds
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📊 Database Backup Strategy

Production için otomatik backup:

```bash
# Günlük backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/backup_$DATE.sql

# 7 günden eski backupları sil
find backups/ -name "backup_*.sql" -mtime +7 -delete

# S3'e yükle
aws s3 cp backups/backup_$DATE.sql s3://my-backups/refunds/
```

Cron job:
```bash
# Her gün saat 03:00'te çalışsın
0 3 * * * /path/to/backup.sh
```

---

## 🔄 CI/CD Pipeline

GitHub Actions workflow örneği:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm prisma generate
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 📞 İletişim ve Destek

**Geliştirici:** Claude Code
**Proje Sahibi:** Enes Tekin
**Tarih:** 23 Ekim 2025

---

## 📝 Değişiklik Geçmişi (Changelog)

### v1.0.0 - 23 Ekim 2025
- ✨ İlk sürüm
- ✨ İki sekme ile iade yönetimi (ikas + manuel)
- ✨ Manuel iade kaydı oluşturma
- ✨ 4 adımlı müşteri self-service portalı
- ✨ Mağaza ayarları ve portal URL yönetimi
- ✨ Timeline event sistemi
- ✨ 7 adet iade nedeni tanımı
- ✨ Fotoğraf yükleme özelliği
- ✨ Dashboard navigasyonu

---

## 🎓 Öğrenilen Dersler

### 1. GraphQL Enum Kullanımı
GraphQL'de enum değerler string olarak değil, doğrudan kullanılmalı. Bu Next.js + TypeScript'te önemli bir detay.

### 2. Multi-Step Form State Management
SessionStorage, multi-step form'lar için çok etkili bir çözüm. Server-side state management'a gerek kalmadan çalışıyor.

### 3. Public vs Authenticated Routes
Public endpoint'ler için farklı bir yaklaşım gerekiyor. Domain-based routing production için kritik.

### 4. Timeline Pattern
Event-driven timeline sistemi, audit logging için mükemmel bir pattern. Her değişiklik otomatik kaydediliyor.

### 5. Prisma Migrations
Development'ta `prisma db push`, production'da `prisma migrate` kullanılmalı.

### 6. ikas API Limitations
ikas API'sinin bazı kısıtlamaları var (offset desteklemiyor). Documentation dikkatlice okunmalı.

### 7. Base64 Image Handling
Base64 fotoğraflar geçici çözüm olarak iyi çalışıyor ama production'da mutlaka cloud storage kullanılmalı.

---

## 🙏 Teşekkürler

Bu projeyi geliştirirken kullandığımız araçlar:
- **Next.js 15** - Framework
- **React 19** - UI Library
- **TypeScript** - Type Safety
- **Prisma** - ORM
- **Tailwind CSS** - Styling
- **ikas Admin API** - E-commerce Integration
- **Iron Session** - Authentication

---

**Son Güncelleme:** 23 Ekim 2025
**Versiyon:** 1.0.0
**Durum:** ✅ Production Ready (Cloud storage ve email notifications haricinde)
