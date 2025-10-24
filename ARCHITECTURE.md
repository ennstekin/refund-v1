# Architecture - Dual Deployment Strategy

Bu proje **hybrid deployment** mimarisi kullanır:
- **ikas App** → ikas platformuna build edilir (Dashboard sayfaları)
- **Portal App** → Vercel'e deploy edilir (Public portal + API)

## 📐 Mimari Diyagram

```
┌─────────────────────────────────────────────────────┐
│                 İKAS PLATFORM                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  ikas App (Static Export)                    │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  📄 Pages:                                    │  │
│  │  - /dashboard                                 │  │
│  │  - /refunds, /refunds/[id], /refunds/new    │  │
│  │  - /settings                                  │  │
│  │  - /authorize-store, /callback               │  │
│  │  - /test-refunds                              │  │
│  │                                                │  │
│  │  🔗 API Calls → Vercel URL                   │  │
│  │  (NEXT_PUBLIC_API_BASE_URL kullanarak)      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓
                    HTTPS API Calls
                         ↓
┌─────────────────────────────────────────────────────┐
│             VERCEL DEPLOYMENT                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  Full Next.js App                             │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  📄 Portal Pages:                             │  │
│  │  - /portal                                    │  │
│  │  - /portal/reason                             │  │
│  │  - /portal/upload                             │  │
│  │  - /portal/complete                           │  │
│  │                                                │  │
│  │  🔌 API Routes:                               │  │
│  │  - /api/ikas/* (Dashboard için)              │  │
│  │  - /api/public/* (Portal için)               │  │
│  │  - /api/refunds/* (Her ikisi için)           │  │
│  │  - /api/settings (Dashboard için)            │  │
│  │  - /api/oauth/* (Dashboard için)             │  │
│  │                                                │  │
│  │  🗄️  Database: Vercel Postgres               │  │
│  │                                                │  │
│  │  🌍 Custom Domains:                           │  │
│  │  - iade.magaza1.com → Portal (merchantId=1)  │  │
│  │  - iade.magaza2.com → Portal (merchantId=2)  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 🎯 Build Komutları

### 1. Vercel Deployment (Portal + API)

```bash
# Development
pnpm dev

# Production build
pnpm build:vercel

# Deployment
pnpm vercel:deploy
```

**Ne içerir:**
- ✅ Tüm portal sayfaları (`/portal/*`)
- ✅ Tüm API routes (`/api/*`)
- ✅ Vercel Postgres bağlantısı
- ✅ Custom domain support

**Environment Variables (Vercel):**
```bash
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin
NEXT_PUBLIC_CLIENT_ID=<ikas_client_id>
CLIENT_SECRET=<ikas_client_secret>
NEXT_PUBLIC_DEPLOY_URL=https://your-app.vercel.app
SECRET_COOKIE_PASSWORD=<32_char_random>
DATABASE_URL=postgresql://...
```

### 2. ikas App Build (Dashboard Only)

```bash
# ikas için static export
VERCEL_URL=https://your-app.vercel.app pnpm build:ikas
```

**Ne içerir:**
- ✅ Sadece dashboard sayfaları (static HTML/CSS/JS)
- ✅ API çağrıları Vercel URL'ine gider
- ❌ API routes yok (static export)
- ❌ Database bağlantısı yok (API üzerinden)

**Environment Variables (ikas Build):**
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
# Diğer NEXT_PUBLIC_ değişkenler aynı
```

**Build Output:**
```
out/ikas/
├── dashboard.html
├── refunds.html
├── refunds/
│   ├── [id].html
│   └── new.html
├── settings.html
├── _next/
│   └── static/
└── ...
```

## 🔧 Nasıl Çalışır?

### API Base URL Logic

`src/lib/api-base-url.ts` dosyası:

```typescript
// Vercel deployment: '' (relative URL)
// ikas build: 'https://your-app.vercel.app'

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}
```

### API Requests

Tüm API çağrıları otomatik olarak doğru URL'e gider:

```typescript
// Vercel'de: /api/refunds
// ikas'ta: https://your-app.vercel.app/api/refunds

ApiRequests.refunds.list(token);
```

## 📦 Deployment Workflow

### İlk Kurulum

1. **Vercel'e deploy et:**
   ```bash
   pnpm vercel:setup
   ```

2. **Vercel URL'ini not et:**
   ```
   https://refund-v1.vercel.app
   ```

3. **ikas build için environment variable ekle:**
   ```bash
   echo "NEXT_PUBLIC_API_BASE_URL=https://refund-v1.vercel.app" > .env.ikas
   ```

### Güncelleme Workflow

1. **Kod değişikliği yap**

2. **Vercel'e deploy et:**
   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin main
   # Vercel otomatik deploy eder
   ```

3. **ikas build oluştur:**
   ```bash
   pnpm build:ikas
   ```

4. **`out/ikas` klasörünü ikas'a upload et**

## 🌐 Custom Domain Setup (Portal)

Her mağaza kendi domain'ini portal'e bağlayabilir:

1. **Vercel Dashboard → Domains**
2. **Add Domain:** `iade.magaza.com`
3. **DNS ayarları yap**
4. **Settings sayfasında portal URL güncelle**

Portal, merchant'ı şu şekilde tanır:
- Custom domain → Merchant lookup via database
- Default URL → Query parameter (`/portal?merchantId=123`)

## 🚀 Production Checklist

### Vercel Deployment
- [ ] Tüm environment variables eklendi
- [ ] Database oluşturuldu ve migration çalıştırıldı
- [ ] Build başarılı
- [ ] Portal sayfaları erişilebilir
- [ ] API endpoints çalışıyor

### ikas App Build
- [ ] NEXT_PUBLIC_API_BASE_URL doğru Vercel URL
- [ ] `pnpm build:ikas` başarılı
- [ ] `out/ikas` klasörü oluştu
- [ ] Dashboard sayfaları static export edildi
- [ ] ikas'a upload edildi
- [ ] ikas içinde test edildi

## 📝 Notlar

- Portal ve Dashboard **aynı database'i kullanır** (Vercel Postgres)
- Dashboard sayfaları **API üzerinden** database'e erişir
- Portal **doğrudan** database'e erişir (server-side)
- OAuth flow **sadece ikas app'te** çalışır
- Custom domains **sadece portal** için

## 🔐 Güvenlik

- ikas app JWT token ile API'lere erişir
- Portal public ama order verification gerektirir
- API routes token validation yapar
- Database sadece API'lerden erişilebilir (ikas app için)
