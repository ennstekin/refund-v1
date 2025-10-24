# Deployment Strategy - İki Ayrı Environment

## 🏗️ Mimari Yapı

Bu projede **iki ayrı deployment** stratejisi var:

### 1. Ana App (Dashboard, Settings, Refunds)
- **Nerede:** ikas platformu içinde iframe olarak
- **Erişim:** Sadece mağaza sahipleri (OAuth ile)
- **URL:** ikas admin panel içinde
- **Dosyalar:** `/dashboard`, `/settings`, `/refunds`, `/api/*` (public olmayan)

### 2. Portal (Customer Portal)
- **Nerede:** Vercel (public deployment)
- **Erişim:** Herkese açık (müşteriler)
- **URL:** `https://your-portal.vercel.app/portal`
- **Dosyalar:** `/portal`, `/track`, `/api/public/*`

---

## 📦 Deployment Seçenekleri

### Seçenek A: Tek Repo, İki Deploy (ÖNERİLEN)

**Avantajlar:**
- Tek codebase
- Shared API routes
- Kolay geliştirme

**Dezavantajlar:**
- Her deployment tüm kodu içerir (biraz fazlalık)

**İmplementasyon:**

```bash
# 1. Ana app için mevcut deploy (ikas için)
# .env.local ile development

# 2. Portal için Vercel deploy
# Ayrı Vercel projesi
vercel --prod --name refund-portal
```

**Vercel Yapılandırması:**

Portal için `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/portal/:path*", "destination": "/portal/:path*" },
    { "source": "/track/:path*", "destination": "/track/:path*" },
    { "source": "/api/public/:path*", "destination": "/api/public/:path*" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

---

### Seçenek B: İki Ayrı Repo (COMPLEX)

**Avantajlar:**
- Tamamen ayrı projeler
- Her biri bağımsız scale edilebilir

**Dezavantajlar:**
- Kod duplikasyonu
- API sync problemi
- Prisma schema sync

**ÖNERİLMEZ** - Maintenance overhead yüksek

---

## 🚀 Önerilen Deployment Planı

### 1. Ana App (ikas içinde)

**Development:**
```bash
# Localhost'ta test
DEV_MODE=true
NEXT_PUBLIC_DEPLOY_URL=http://localhost:3001
pnpm dev
```

**Production:**
Ana app ikas içinde çalışacağı için özel bir deployment yapmayacağız. ikas platformu bizim app'imizi kendi içinde host ediyor.

**İhtiyaç Duyulan:**
- OAuth callback çalışmalı
- API endpoints çalışmalı
- Database bağlantısı olmalı

---

### 2. Portal (Vercel'de Public)

**Yeni Vercel Projesi Oluşturma:**

```bash
# 1. Vercel'da yeni proje oluştur
vercel --prod

# Proje adı: refund-portal
# Root directory: .
# Build command: next build
# Output directory: .next
```

**Environment Variables (Vercel - Portal için):**

```bash
# Database (aynı Neon DB)
DATABASE_URL="postgresql://..."

# ikas API (API calls için)
NEXT_PUBLIC_GRAPH_API_URL="https://api.myikas.com/api/v2/admin/graphql"

# OAuth (portal'da kullanılmıyor ama API'ler için gerekli)
NEXT_PUBLIC_CLIENT_ID="..."
CLIENT_SECRET="..."

# Deployment URL
NEXT_PUBLIC_DEPLOY_URL="https://refund-portal.vercel.app"

# Mode
DEV_MODE="false"

# Portal-specific
NEXT_PUBLIC_PORTAL_ONLY="true"  # Opsiyonel, portal-only mode için
```

**Build Komutu:**
```json
{
  "scripts": {
    "build:portal": "prisma migrate deploy && prisma generate && next build"
  }
}
```

---

## 🔧 Portal URL Yapılandırması

### Settings Sayfasında Gösterilecek Portal URL:

```typescript
const getPortalFullUrl = () => {
  if (portalUrl && portalUrl.trim()) {
    return `https://${portalUrl.trim()}`;
  }

  // Portal'ın Vercel URL'i
  const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://refund-portal.vercel.app';

  if (settings?.id) {
    return `${PORTAL_BASE_URL}/portal?storeId=${settings.id}`;
  }

  return `${PORTAL_BASE_URL}/portal`;
};
```

**Environment Variable Ekle:**
```bash
# Ana app için (ikas'ta)
NEXT_PUBLIC_PORTAL_URL="https://refund-portal.vercel.app"
```

---

## 📋 Deployment Checklist

### Ana App (ikas'ta çalışan)

- [ ] OAuth callback URL'leri ikas Developer Portal'da ayarlandı
- [ ] Database bağlantısı çalışıyor
- [ ] Settings, Dashboard, Refunds sayfaları test edildi
- [ ] JWT authentication çalışıyor
- [ ] API endpoints çalışıyor

### Portal (Vercel'de)

- [ ] Vercel projesi oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] DATABASE_URL doğru
- [ ] Build başarılı
- [ ] `/portal` sayfası açılıyor
- [ ] `/track` sayfası çalışıyor
- [ ] `/api/public/verify-order` çalışıyor
- [ ] `/api/public/submit-refund` çalışıyor
- [ ] `/api/public/track-refund` çalışıyor
- [ ] Custom domain (opsiyonel) yapılandırıldı

---

## 🌐 URL Yapısı

### Ana App (ikas içinde):
```
https://dev-enes0.myikas.com/admin/authorized-app/{appId}/dashboard
https://dev-enes0.myikas.com/admin/authorized-app/{appId}/settings
https://dev-enes0.myikas.com/admin/authorized-app/{appId}/refunds
```

### Portal (Vercel'de):
```
https://refund-portal.vercel.app/portal
https://refund-portal.vercel.app/portal?storeId=xxx
https://refund-portal.vercel.app/track
https://refund-portal.vercel.app/portal/track/{refundId}
```

### API Endpoints (Her İkisinde de):
```
# Public API (Portal için)
/api/public/verify-order
/api/public/submit-refund
/api/public/track-refund

# Private API (Ana app için)
/api/refunds
/api/settings
/api/ikas/*
```

---

## 🔐 CORS ve Security

Portal Vercel'de public olduğu için CORS ayarları gerekebilir:

**next.config.js** güncelleme:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};
```

---

## 💾 Database Yönetimi

Her iki deployment da **aynı Neon database**'i kullanacak:

```
Ana App (ikas) ──┐
                 ├──> Neon PostgreSQL Database
Portal (Vercel) ─┘
```

**Avantajlar:**
- Tek database
- Veriler senkronize
- Migration sadece bir kere

**Migration Stratejisi:**
1. Development'ta migration oluştur: `npx prisma migrate dev`
2. Portal deploy edilirken otomatik migrate: `prisma migrate deploy`
3. Ana app de aynı database'i kullandığı için sync olur

---

## 🚀 Hızlı Deployment Komutları

### Portal Deployment:

```bash
# 1. Vercel login
vercel login

# 2. İlk deployment
vercel

# Sorulara cevaplar:
# - Project name: refund-portal
# - Directory: ./
# - Build command: next build
# - Output directory: .next

# 3. Environment variables ekle
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_DEPLOY_URL production
# ... diğer variables

# 4. Production deployment
vercel --prod

# 5. Domain ekle (opsiyonel)
vercel domains add iade.yourstore.com
```

### Ana App:

Ana app zaten ikas'ta çalışacağı için deployment yapmaya gerek yok. Sadece local development:

```bash
pnpm dev
```

---

## 📊 Monitoring ve Logs

### Portal (Vercel):
```bash
# Logs
vercel logs --production

# Analytics
# Vercel dashboard'da görünür
```

### Ana App (ikas):
- ikas platform logları
- Browser console
- Server-side logs (ikas tarafında)

---

## 🎯 Sonuç

**İki ayrı environment:**

1. **Ana App** → ikas'ta (iframe), sadece development için `pnpm dev`
2. **Portal** → Vercel'de (public), `vercel --prod` ile deploy

**Paylaşılan:**
- Aynı codebase
- Aynı database
- Aynı API endpoints (public olanlar)

**Settings sayfasında gösterilecek Portal URL:**
```
https://refund-portal.vercel.app/portal?storeId={merchantId}
```

Bu URL'i müşterilere paylaşacaksınız!
