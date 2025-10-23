# Multi-Tenant İade Yönetim Sistemi - Yol Haritası

## 🎯 Hedef

Her merchant'ın:
- Kendi ikas app'i olacak
- Kendi müşteri portalı olacak
- Veriler birbirinden izole olacak
- Tek bir uygulama üzerinden tüm merchant'lar yönetilecek

---

## 📋 Mevcut Durum vs İstenilen Durum

### Şu Anki Durum (Development)
```
┌─────────────────────────────────────┐
│   Tek Merchant (Test Mağaza)        │
│                                      │
│   - authorizedAppId: xxx            │
│   - Portal: localhost:3001/portal   │
│   - Admin: ikas iframe              │
└─────────────────────────────────────┘
```

### İstenilen Durum (Production)
```
┌──────────────────────────────────────────────────────────┐
│              Ana Uygulama (refund-v1)                     │
│         Domain: refund-app.vercel.app                     │
└──────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Merchant A │  │  Merchant B │  │  Merchant C │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ ikas Admin  │  │ ikas Admin  │  │ ikas Admin  │
│ (iframe)    │  │ (iframe)    │  │ (iframe)    │
│             │  │             │  │             │
│ Portal:     │  │ Portal:     │  │ Portal:     │
│ iade.magA.  │  │ iade.magB.  │  │ iade.magC.  │
│ com         │  │ com         │  │ com         │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🔄 Kurulum Akışı

### Adım 1: Merchant App'i ikas'a Yükler

```
1. ikas Developer Console'da app oluşturur
2. App bilgileri:
   - App Name: "İade Yönetimi"
   - Redirect URL: https://refund-app.vercel.app/api/oauth/callback/ikas
   - Scopes: order.read, order.write
3. Client ID ve Client Secret alır
```

### Adım 2: Merchant App'i Store'una Kurar

```
1. Merchant ikas admin'de "Uygulamalar" > "Yükle" tıklar
2. OAuth ekranı açılır
3. "Yetkilendir" tıklar
4. Callback URL'e yönlendirilir
```

### Adım 3: OAuth Callback İşlemi

```javascript
// /api/oauth/callback/ikas

1. Authorization code alınır
2. Token exchange yapılır
3. Merchant bilgileri ikas'tan çekilir:
   - merchantId
   - storeName
   - email
4. Veritabanına kaydedilir:
   - AuthToken (OAuth tokens)
   - Merchant (merchant info)
5. Session oluşturulur
6. ikas admin'e redirect edilir
```

### Adım 4: Merchant Portal URL'ini Ayarlar

```
1. Merchant ikas admin'de app'i açar (iframe)
2. "Ayarlar" sayfasına gider
3. Portal URL'ini girer: iade.magazam.com
4. DNS ayarlarını yapar (CNAME)
5. Portal aktif olur
```

---

## 🏗️ Teknik Mimari

### 1. Domain Yapısı

#### Ana Uygulama
```
Domain: refund-app.vercel.app
Kullanım:
- ikas OAuth callback
- ikas iframe admin panel
- API endpoints
```

#### Merchant Portals
```
Option 1: Subdomain Pattern (Kolay)
- Merchant A: magaza-a.refund-portal.com
- Merchant B: magaza-b.refund-portal.com
- DNS: *.refund-portal.com -> refund-app.vercel.app

Option 2: Custom Domain Pattern (Profesyonel)
- Merchant A: iade.magazaa.com
- Merchant B: iade.magazab.com
- DNS: Her merchant CNAME ekler
```

### 2. Middleware ile Domain Routing

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Ana uygulama
  if (hostname === 'refund-app.vercel.app') {
    return NextResponse.next();
  }

  // Portal domain'leri
  if (hostname.includes('refund-portal.com') ||
      hostname.startsWith('iade.')) {

    // Merchant'ı domain'den belirle
    const merchantDomain = hostname;

    // Merchant bilgisini header'a ekle
    request.headers.set('x-merchant-domain', merchantDomain);

    // Portal sayfalarına yönlendir
    return NextResponse.rewrite(
      new URL(`/portal${request.nextUrl.pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 3. Merchant Belirleme

```typescript
// lib/merchant-helpers.ts

export async function getMerchantFromDomain(domain: string) {
  // Custom domain'den merchant bul
  const merchant = await prisma.merchant.findFirst({
    where: {
      OR: [
        { portalUrl: domain },
        { subdomain: domain.split('.')[0] }, // magaza-a.refund-portal.com
      ],
    },
  });

  return merchant;
}

export async function getMerchantFromRequest(request: NextRequest) {
  const domain = request.headers.get('x-merchant-domain');

  if (!domain) {
    return null;
  }

  return getMerchantFromDomain(domain);
}
```

### 4. Public API Güncellemesi

```typescript
// /api/public/verify-order/route.ts

export async function POST(request: NextRequest) {
  // Domain'den merchant belirle
  const merchant = await getMerchantFromRequest(request);

  if (!merchant) {
    return NextResponse.json(
      { error: 'Geçersiz portal' },
      { status: 400 }
    );
  }

  // Merchant'ın token'ını al
  const authToken = await AuthTokenManager.get(merchant.authorizedAppId);

  // İKAS API'yi çağır
  const ikasClient = getIkas(authToken);
  // ...
}
```

---

## 📊 Veritabanı Değişiklikleri

### Mevcut Schema
```prisma
model Merchant {
  id              String   @id
  authorizedAppId String   @unique
  storeName       String?
  email           String?
  portalUrl       String?  // iade.magazam.com
  portalEnabled   Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Güncellenmiş Schema
```prisma
model Merchant {
  id              String   @id
  authorizedAppId String   @unique
  storeName       String?
  email           String?

  // Portal Settings
  portalEnabled   Boolean  @default(true)
  portalUrl       String?  @unique // Custom domain: iade.magazam.com
  subdomain       String?  @unique // Subdomain: magaza-a (for magaza-a.refund-portal.com)

  // App Installation
  installedAt     DateTime @default(now())
  isActive        Boolean  @default(true)

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  refunds         RefundRequest[]
}

model RefundRequest {
  id              String   @id @default(cuid())
  orderId         String   @unique
  orderNumber     String
  merchantId      String
  status          String
  reason          String?
  reasonNote      String?
  trackingNumber  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  merchant        Merchant @relation(fields: [merchantId], references: [id])
  notes           RefundNote[]
  timeline        RefundTimeline[]

  @@index([merchantId])
  @@index([status])
}
```

---

## 🚀 Deployment Süreci

### 1. Vercel'e Deploy

```bash
# 1. GitHub'a push et
git push origin main

# 2. Vercel'de proje oluştur
# - Import repository: ennstekin/refund-v1
# - Framework Preset: Next.js
# - Root Directory: ./
# - Environment Variables: (aşağıda)

# 3. Deploy!
```

### 2. Environment Variables (Vercel)

```env
# ikas OAuth
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin
NEXT_PUBLIC_CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# App URL
NEXT_PUBLIC_DEPLOY_URL=https://refund-app.vercel.app

# Session Secret
SECRET_COOKIE_PASSWORD=your-32-character-random-string

# Database (PostgreSQL on Vercel)
DATABASE_URL=postgresql://user:pass@host:5432/refunddb?schema=public

# Portal Domain (Wildcard)
NEXT_PUBLIC_PORTAL_DOMAIN=refund-portal.com
```

### 3. Database Migration

```bash
# Development'tan Production'a geçiş

# 1. PostgreSQL database oluştur (Vercel Postgres)
# 2. DATABASE_URL'i güncelle
# 3. Prisma schema'yı güncelle

# prisma/schema.prisma
datasource db {
  provider = "postgresql"  // SQLite'dan değiştir
  url      = env("DATABASE_URL")
}

# 4. Migration oluştur
npx prisma migrate dev --name init

# 5. Production'a deploy
npx prisma migrate deploy
```

### 4. DNS Ayarları

#### Option 1: Wildcard Subdomain (Kolay)
```
DNS Records (CloudFlare/Route53):
┌──────────────────────────────────────────┐
│ Type  │ Name  │ Value                    │
├──────────────────────────────────────────┤
│ CNAME │ *     │ refund-app.vercel.app   │
│ CNAME │ @     │ refund-app.vercel.app   │
└──────────────────────────────────────────┘

Bu sayede:
- magaza-a.refund-portal.com
- magaza-b.refund-portal.com
- magaza-c.refund-portal.com
hepsi otomatik çalışır!
```

#### Option 2: Custom Domain (Her merchant ayrı)
```
Merchant A DNS:
┌──────────────────────────────────────────┐
│ Type  │ Name  │ Value                    │
├──────────────────────────────────────────┤
│ CNAME │ iade  │ refund-app.vercel.app   │
└──────────────────────────────────────────┘
Sonuç: iade.magazaa.com -> Portal

Merchant B DNS:
┌──────────────────────────────────────────┐
│ Type  │ Name  │ Value                    │
├──────────────────────────────────────────┤
│ CNAME │ iade  │ refund-app.vercel.app   │
└──────────────────────────────────────────┘
Sonuç: iade.magazab.com -> Portal
```

### 5. Vercel Domain Ayarları

```bash
# Vercel Dashboard'da:
1. Domains sekmesine git
2. "Add Domain" tıkla
3. İki seçenek:

Option 1: Wildcard subdomain
- Domain: *.refund-portal.com
- refund-portal.com domain'ini Vercel'e ver
- Otomatik SSL

Option 2: Custom domains
- Her merchant için domain ekle
- iade.magazaa.com
- iade.magazab.com
- Manuel SSL (Let's Encrypt)
```

---

## 🔐 Güvenlik ve İzolasyon

### 1. Data İzolasyonu

```typescript
// Tüm API'lerde merchant filtresi
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);

  // Admin endpoints: JWT'den merchant
  const refunds = await prisma.refundRequest.findMany({
    where: {
      merchantId: user.merchantId, // ✅ Sadece kendi verileri
    },
  });

  // Public endpoints: Domain'den merchant
  const merchant = await getMerchantFromRequest(request);
  const refunds = await prisma.refundRequest.findMany({
    where: {
      merchantId: merchant.id, // ✅ Sadece bu merchant'ın verileri
    },
  });
}
```

### 2. Rate Limiting (Per Merchant)

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';

export async function checkRateLimit(merchantId: string, endpoint: string) {
  const identifier = `${merchantId}:${endpoint}`;

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
  });

  const { success } = await ratelimit.limit(identifier);
  return success;
}
```

### 3. CORS Ayarları

```typescript
// Her merchant kendi domain'inden çağırabilir
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const merchant = await getMerchantFromDomain(origin);

  if (merchant) {
    return NextResponse.next({
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      },
    });
  }
}
```

---

## 📱 Merchant Onboarding Akışı

### 1. İlk Kurulum (Merchant Perspektifi)

```
┌─────────────────────────────────────────────────┐
│ Merchant'ın Yapacakları:                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ 1. ikas Admin → Uygulamalar → "İade Yönetimi"  │
│    "Yükle" butonuna tıkla                       │
│                                                  │
│ 2. OAuth ekranı açılır:                          │
│    ✓ Sipariş okuma yetkisi                      │
│    ✓ Sipariş yazma yetkisi                      │
│    "Yetkilendir" tıkla                          │
│                                                  │
│ 3. App yüklendi! ikas admin'de görünür          │
│    Tıklayınca iframe'de admin panel açılır      │
│                                                  │
│ 4. "Ayarlar" sekmesine git                       │
│    Portal URL'i ayarla:                          │
│    - Seçenek A: magaza-a.refund-portal.com      │
│    - Seçenek B: iade.kendi-domain.com           │
│                                                  │
│ 5. (Seçenek B için) DNS ayarları yap:           │
│    CNAME: iade → refund-app.vercel.app          │
│                                                  │
│ 6. Portal aktif! ✅                              │
│    Müşterilere link paylaş                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2. Sistem Arkası (Otomatik)

```
┌─────────────────────────────────────────────────┐
│ Sistem'in Yaptıkları:                            │
├─────────────────────────────────────────────────┤
│                                                  │
│ 1. OAuth callback geldi                          │
│    → Authorization code al                       │
│    → Token exchange yap                          │
│    → Access & Refresh token kaydet               │
│                                                  │
│ 2. Merchant bilgilerini ikas'tan çek:           │
│    → getMerchant query                           │
│    → storeName, email, merchantId al             │
│                                                  │
│ 3. Veritabanına kaydet:                          │
│    → AuthToken tablosuna token kaydet            │
│    → Merchant tablosuna merchant kaydet          │
│    → Default subdomain oluştur                   │
│      (storeName'den: "Test Store" → "test-store")│
│                                                  │
│ 4. Session oluştur:                              │
│    → JWT token oluştur                           │
│    → merchantId ve authorizedAppId içerir        │
│    → 7 gün geçerli                               │
│                                                  │
│ 5. ikas admin'e redirect et:                     │
│    → Token'ı query param'da gönder               │
│    → iframe'de admin panel açılır                │
│                                                  │
│ 6. Portal otomatik aktif:                        │
│    → {subdomain}.refund-portal.com çalışır       │
│    → Custom domain eklenirse o da çalışır        │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Test Senaryosu

### Merchant A Kurulumu

```bash
# 1. ikas'ta app yükle
https://test-store-a.myikas.com/admin/apps/install?app_id=xxx

# 2. OAuth callback
https://refund-app.vercel.app/api/oauth/callback/ikas?code=xxx&state=xxx

# 3. Database'de kayıt oluştu
Merchant {
  id: "merchant-a-uuid"
  authorizedAppId: "auth-a-uuid"
  storeName: "Test Store A"
  subdomain: "test-store-a"
  portalUrl: null
}

# 4. Admin panel erişim
https://refund-app.vercel.app/?authorizedAppId=auth-a-uuid&merchantId=merchant-a-uuid

# 5. Portal otomatik aktif
https://test-store-a.refund-portal.com
```

### Merchant B Kurulumu

```bash
# 1. ikas'ta app yükle
https://test-store-b.myikas.com/admin/apps/install?app_id=xxx

# 2. OAuth callback
https://refund-app.vercel.app/api/oauth/callback/ikas?code=yyy&state=yyy

# 3. Database'de ayrı kayıt
Merchant {
  id: "merchant-b-uuid"
  authorizedAppId: "auth-b-uuid"
  storeName: "Test Store B"
  subdomain: "test-store-b"
  portalUrl: null
}

# 4. Admin panel erişim (iframe)
https://refund-app.vercel.app/?authorizedAppId=auth-b-uuid&merchantId=merchant-b-uuid

# 5. Portal otomatik aktif
https://test-store-b.refund-portal.com
```

### Data İzolasyonu Testi

```bash
# Merchant A'nın portalı
https://test-store-a.refund-portal.com
→ Sadece Merchant A'nın siparişlerini görebilir
→ Sadece Merchant A'nın iadelerini oluşturabilir

# Merchant B'nin portalı
https://test-store-b.refund-portal.com
→ Sadece Merchant B'nin siparişlerini görebilir
→ Sadece Merchant B'nin iadelerini oluşturabilir

# Cross-merchant access: İMKANSIZ ✅
```

---

## 📋 Checklist: Production'a Geçiş

### Kod Değişiklikleri

- [ ] Prisma schema'yı güncelle (subdomain field ekle)
- [ ] Middleware oluştur (domain routing)
- [ ] getMerchantFromRequest helper ekle
- [ ] Public API'leri güncelle (domain'den merchant belirle)
- [ ] Admin API'leri güncelle (merchantId filtreleme)
- [ ] Settings sayfasına subdomain seçeneği ekle
- [ ] OAuth callback'de subdomain oluştur

### Veritabanı

- [ ] SQLite'dan PostgreSQL'e geç
- [ ] Migration dosyaları oluştur
- [ ] Backup stratejisi kur
- [ ] Connection pooling ayarla

### Deployment

- [ ] Vercel'de proje oluştur
- [ ] Environment variables ekle
- [ ] Domain ayarları yap (wildcard veya custom)
- [ ] SSL sertifikalarını kontrol et
- [ ] Database migrate et

### Güvenlik

- [ ] Rate limiting ekle (per merchant)
- [ ] CORS ayarları yap
- [ ] Input validation ekle (zod)
- [ ] SQL injection koruması (Prisma otomatik)
- [ ] XSS koruması ekle

### Test

- [ ] 2+ merchant ile test et
- [ ] Data izolasyonu test et
- [ ] Portal domain routing test et
- [ ] OAuth flow test et
- [ ] Error handling test et

### Dokümantasyon

- [ ] Merchant onboarding guide yaz
- [ ] DNS setup guide yaz
- [ ] API documentation hazırla
- [ ] Troubleshooting guide yaz

---

## 💡 Önemli Notlar

### Domain Seçimi: Subdomain vs Custom Domain

**Subdomain Pattern (Önerilen Başlangıç)**
```
✅장점:
- Tek DNS ayarı (wildcard)
- Otomatik SSL
- Kolay setup
- Merchant için kolay

❌ Dezavantajı:
- Branded domain değil
- SEO için daha az avantaj
```

**Custom Domain Pattern (Profesyonel)**
```
✅장점:
- Her merchant kendi domain'ini kullanır
- Brand identity
- SEO friendly
- Profesyonel görünüm

❌ Dezavantajı:
- Her merchant DNS ayarı yapmalı
- Manual SSL management
- Teknik destek gerekebilir
```

**Önerim:** İkisini birden destekle!
- Default: {subdomain}.refund-portal.com
- Optional: Custom domain (iade.kendi-domain.com)

### Maliyet Hesabı

```
Vercel Pro Plan: $20/mo
- Unlimited deployments
- Custom domains
- Team collaboration

Vercel Postgres: ~$20/mo
- 60GB storage
- 100 hours compute

Toplam: ~$40/mo başlangıç
(1000 merchant'a kadar yeterli)
```

### Performans

```
- Database indexing: merchantId, status
- Connection pooling: 10-20 connections
- Caching: Redis (Upstash) - $10/mo
- CDN: Vercel Edge Network (included)
```

---

## 🎬 Hemen Başlamak İçin

### 1. Schema Güncellemesi
```bash
# prisma/schema.prisma'ya subdomain field ekle
pnpm prisma db push
```

### 2. Middleware Ekle
```bash
# src/middleware.ts oluştur
# Domain routing logic ekle
```

### 3. Test Et
```bash
# Development'ta test
# localhost:3001 (admin)
# merchant-a.localhost:3001 (portal A)
# merchant-b.localhost:3001 (portal B)
```

### 4. Deploy Et
```bash
git push origin main
# Vercel otomatik deploy eder
```

---

**Sonraki Adım:** Hangi kısımdan başlamak istersin?
1. Schema güncelleme ve migration
2. Middleware ve domain routing
3. Public API güncellemeleri
4. Vercel deployment setup
