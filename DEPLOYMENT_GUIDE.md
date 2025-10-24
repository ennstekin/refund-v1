# 🚀 Deployment Guide

Bu dokümanda ikas İade Yönetim Sistemi'nin production ortamına nasıl deploy edileceği adım adım açıklanmıştır.

## İçindekiler

- [Ön Gereksinimler](#ön-gereksinimler)
- [ikas Developer Portal Ayarları](#ikas-developer-portal-ayarları)
- [Database Setup (Neon PostgreSQL)](#database-setup-neon-postgresql)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [OAuth Configuration](#oauth-configuration)
- [Build & Deploy](#build--deploy)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)

---

## Ön Gereksinimler

### Gerekli Hesaplar

- [ ] **ikas Developer Account** - https://builders.ikas.com
- [ ] **Vercel Account** - https://vercel.com
- [ ] **GitHub Account** - Kod repository için
- [ ] **Neon PostgreSQL Account** - https://neon.tech (opsiyonel, Vercel entegrasyonu ile otomatik)

### Gerekli Araçlar

```bash
# Node.js (v18 veya üzeri)
node --version

# pnpm (package manager)
npm install -g pnpm

# Vercel CLI
npm install -g vercel

# Git
git --version
```

---

## ikas Developer Portal Ayarları

### 1. ikas Developer Portal'da App Oluşturma

1. https://builders.ikas.com adresine gidin
2. "Apps" sekmesine tıklayın
3. "Create New App" butonuna basın
4. App bilgilerini doldurun:
   - **App Name**: İade Yönetim Sistemi
   - **Description**: ikas için self-service iade yönetim sistemi
   - **App Type**: Admin App

### 2. OAuth Credentials Alma

App oluşturduktan sonra:

1. App detay sayfasına gidin
2. "OAuth" sekmesine tıklayın
3. Şu bilgileri not edin:
   - **Client ID**: `d75f1f20-2c5f-48c4-914a-fad30f76d16b` (örnek)
   - **Client Secret**: `s_SFP9LkQa...` (örnek)

⚠️ **ÖNEMLİ**: Client Secret'ı güvenli bir yerde saklayın!

### 3. Redirect URL'lerini Ayarlama

OAuth ayarlarında **Redirect URLs** bölümüne şunları ekleyin:

```
# Production
https://refund-v1.vercel.app/api/oauth/callback/ikas

# Development (opsiyonel)
http://localhost:3001/api/oauth/callback/ikas
```

**Format**:
```
https://{YOUR_DOMAIN}/api/oauth/callback/ikas
```

### 4. App Permissions

Gerekli izinleri seçin:
- [ ] **Orders**: Read
- [ ] **Customers**: Read
- [ ] **Merchant**: Read

---

## Database Setup (Neon PostgreSQL)

### Option 1: Vercel Integration (Önerilen)

1. Vercel Dashboard → Projeniz → **Storage** sekmesi
2. **Create Database** → **Neon** seçin
3. Database region seçin (örn: US East)
4. **Create** butonuna basın
5. Vercel otomatik olarak şu environment variable'ları ekler:
   - `DATABASE_URL`
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - vb.

### Option 2: Manuel Neon Setup

1. https://neon.tech adresine gidin
2. **Sign Up** / **Login**
3. **New Project** oluşturun
4. Project bilgilerini doldurun:
   - **Name**: refund-v1-db
   - **Region**: US East (veya size en yakın)
   - **Postgres Version**: 16 (default)
5. Connection string'i kopyalayın:

```
postgresql://user:password@ep-winter-union-a4c42yag-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

6. Bu connection string'i `DATABASE_URL` environment variable olarak kullanacağız

---

## Vercel Deployment

### 1. GitHub Repository Oluşturma

```bash
# Projeyi GitHub'a push'layın
git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/refund-v1.git
git push -u origin main
```

### 2. Vercel'e Import Etme

1. https://vercel.com/dashboard adresine gidin
2. **Add New** → **Project**
3. **Import Git Repository** → GitHub repository'nizi seçin
4. **Import** butonuna basın

### 3. Build Settings

Vercel otomatik olarak Next.js projesini algılar. Build settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Build Command** | `prisma generate && next build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `pnpm install` |
| **Development Command** | `pnpm dev` |

⚠️ **ÖNEMLİ**: Build command'a `prisma generate` eklenmiş olmalı!

---

## Environment Variables

### 1. Environment Variable Listesi

#### Public Variables (Client-side'da görünür)

```bash
NEXT_PUBLIC_CLIENT_ID=d75f1f20-2c5f-48c4-914a-fad30f76d16b
NEXT_PUBLIC_DEPLOY_URL=https://refund-v1.vercel.app
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin
NEXT_PUBLIC_PORTAL_URL=https://refund-v1.vercel.app
```

#### Private Variables (Server-side only)

```bash
CLIENT_SECRET=s_SFP9LkQaQyZCQ1RE39xeRoB436397cbbfd124fea917afa1856e95018
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=d3bc891fcfa20e440a5c0959a2856e41768dc02790022c07cf80e6ca915de0de
SECRET_COOKIE_PASSWORD=9a3205568ca708ceabb8a1a8b598751eda641e98bdfff86f00c0c7794ae7f4bc
```

### 2. Environment Variable Ekleme (Vercel Dashboard)

1. Vercel Dashboard → Projeniz → **Settings** → **Environment Variables**
2. Her variable için:
   - **Key**: Variable adı (örn: `CLIENT_SECRET`)
   - **Value**: Variable değeri
   - **Environment**: `Production` seçin
3. **Save** butonuna basın

### 3. Environment Variable Ekleme (Vercel CLI)

⚠️ **KRITIK**: Environment variable eklerken `echo -n` kullanın (newline eklenmez):

```bash
# YANLIŞ (newline ekler)
vercel env add NEXT_PUBLIC_CLIENT_ID production <<< "d75f1f20-..."

# DOĞRU (newline eklemez)
echo -n "d75f1f20-2c5f-48c4-914a-fad30f76d16b" | vercel env add NEXT_PUBLIC_CLIENT_ID production

# Tüm public variables
echo -n "d75f1f20-2c5f-48c4-914a-fad30f76d16b" | vercel env add NEXT_PUBLIC_CLIENT_ID production
echo -n "https://refund-v1.vercel.app" | vercel env add NEXT_PUBLIC_DEPLOY_URL production
echo -n "https://api.myikas.com/api/v2/admin/graphql" | vercel env add NEXT_PUBLIC_GRAPH_API_URL production
echo -n "https://{storeName}.myikas.com/admin" | vercel env add NEXT_PUBLIC_ADMIN_URL production
echo -n "https://refund-v1.vercel.app" | vercel env add NEXT_PUBLIC_PORTAL_URL production

# Private variables
echo -n "s_SFP9LkQaQyZCQ1RE39xeRoB436397cbbfd124fea917afa1856e95018" | vercel env add CLIENT_SECRET production
echo -n "postgresql://user:pass@host/db?sslmode=require" | vercel env add DATABASE_URL production
echo -n "d3bc891fcfa20e440a5c0959a2856e41768dc02790022c07cf80e6ca915de0de" | vercel env add JWT_SECRET production
echo -n "9a3205568ca708ceabb8a1a8b598751eda641e98bdfff86f00c0c7794ae7f4bc" | vercel env add SECRET_COOKIE_PASSWORD production
```

### 4. Secret Generation

Güvenli secret'lar oluşturmak için:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SECRET_COOKIE_PASSWORD (minimum 32 karakter)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Environment Variable Doğrulama

```bash
# Production environment variable'larını listele
vercel env ls production

# Belirli bir variable'ı kontrol et
vercel env pull .env.vercel.production --environment=production
cat .env.vercel.production | grep NEXT_PUBLIC_CLIENT_ID
```

---

## OAuth Configuration

### 1. OAuth Flow URL'leri

Uygulamanız şu OAuth endpoint'lerini kullanır:

| Endpoint | URL | Açıklama |
|----------|-----|----------|
| **Authorize** | `/api/oauth/authorize/ikas` | OAuth flow'u başlatır |
| **Callback** | `/api/oauth/callback/ikas` | ikas'tan callback alır |

### 2. ikas Developer Portal'da Redirect URL'leri Güncelleme

1. https://builders.ikas.com adresine gidin
2. App'inizi seçin
3. **OAuth** sekmesine gidin
4. **Redirect URLs** bölümüne şunu ekleyin:

```
https://refund-v1.vercel.app/api/oauth/callback/ikas
```

⚠️ **ÖNEMLİ**: URL'de typo olmamalı, `https://` ile başlamalı, trailing slash (`/`) olmamalı.

### 3. Signature Validation

OAuth callback endpoint HMAC-SHA256 signature validation kullanır:

```typescript
// Backend otomatik olarak signature'ı validate eder
const isValid = TokenHelpers.validateCodeSignature(
  code,
  signature,
  process.env.CLIENT_SECRET
);
```

---

## Build & Deploy

### 1. İlk Deployment

```bash
# Local'de build test edin
pnpm build

# Vercel'e deploy edin
vercel --prod
```

**Alternatif**: GitHub'a push yapın, Vercel otomatik olarak deploy eder:

```bash
git add .
git commit -m "chore: initial deployment"
git push origin main
```

### 2. Database Migration

Deployment sonrası database migration'ları otomatik olarak çalışır:

```json
// package.json
{
  "scripts": {
    "build": "prisma generate && next build",
    "vercel-build": "prisma migrate deploy && prisma generate && next build"
  }
}
```

### 3. Deployment Logs

```bash
# Real-time logs
vercel logs https://refund-v1.vercel.app --follow

# Son 10 dakika
vercel logs https://refund-v1.vercel.app --since 10m
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# API endpoint test
curl https://refund-v1.vercel.app/api/health

# Expected: 200 OK
```

### 2. OAuth Flow Test

1. Tarayıcıda açın: `https://refund-v1.vercel.app`
2. "Authorize Store" sayfasına yönlendirilmelisiniz
3. Store name girin (örn: `test-store`)
4. ikas OAuth sayfasına yönlendirilmelisiniz
5. "Authorize" butonuna basın
6. Dashboard'a yönlendirilmelisiniz

### 3. Customer Portal Test

1. Tarayıcıda açın: `https://refund-v1.vercel.app/portal`
2. Sipariş numarası ve email girin
3. İade formu açılmalı

### 4. Database Connection Test

```bash
# Prisma Studio ile database'e bağlanın
DATABASE_URL="postgresql://..." npx prisma studio
```

### 5. Environment Variable Validation

```bash
# Production env'leri çekin
vercel env pull .env.vercel.production --environment=production

# Trailing newline kontrolü
cat .env.vercel.production | od -c | grep '\\n'

# Eğer newline varsa, environment variable'ı yeniden ekleyin
```

---

## Troubleshooting

### Problem 1: Build Failure - Prisma Generate

**Hata**:
```
Error: @prisma/client did not initialize yet
```

**Çözüm**:
Build command'da `prisma generate` olduğundan emin olun:

```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### Problem 2: OAuth "invalid client_id" Error

**Hata**:
```json
{"errors":[{"msg":"invalid client_id","param":"client_id","location":"query"}]}
```

**Çözüm**:
Environment variable'da trailing newline (`\n`) var. Yeniden ekleyin:

```bash
# Eski değeri silin
vercel env rm NEXT_PUBLIC_CLIENT_ID production --yes

# Yeniden ekleyin (echo -n kullanarak)
echo -n "d75f1f20-2c5f-48c4-914a-fad30f76d16b" | vercel env add NEXT_PUBLIC_CLIENT_ID production

# Yeni deployment tetikleyin
git commit --allow-empty -m "chore: trigger deployment"
git push
```

### Problem 3: Database Connection Error

**Hata**:
```
Error: Can't reach database server
```

**Çözüm**:

1. `DATABASE_URL` environment variable'ının doğru olduğundan emin olun
2. Connection string'de `?sslmode=require` parametresi olmalı
3. Neon database'inizin aktif olduğundan emin olun

```bash
# Connection string formatı
postgresql://user:password@host/database?sslmode=require
```

### Problem 4: NEXT_PUBLIC_ Variables Not Updated

**Hata**: Environment variable güncelledim ama uygulama hala eski değeri kullanıyor.

**Çözüm**:
`NEXT_PUBLIC_` prefix'li variable'lar build time'da bundle'a dahil edilir. Yeni deployment gerekir:

```bash
# Boş commit ile redeploy
git commit --allow-empty -m "chore: trigger deployment with updated env vars"
git push
```

### Problem 5: OAuth Redirect URL Mismatch

**Hata**:
```
redirect_uri_mismatch
```

**Çözüm**:

1. ikas Developer Portal'daki Redirect URL'i kontrol edin:
   ```
   https://refund-v1.vercel.app/api/oauth/callback/ikas
   ```

2. `NEXT_PUBLIC_DEPLOY_URL` environment variable'ının doğru olduğundan emin olun:
   ```
   https://refund-v1.vercel.app
   ```

3. Trailing slash olmamalı!

---

## Deployment Checklist

Deployment öncesi kontrol listesi:

### Pre-Deployment

- [ ] ikas Developer Portal'da app oluşturuldu
- [ ] OAuth credentials alındı (Client ID + Secret)
- [ ] Redirect URLs eklendi
- [ ] GitHub repository oluşturuldu
- [ ] Kod GitHub'a push'landı
- [ ] Neon PostgreSQL database oluşturuldu
- [ ] `DATABASE_URL` alındı

### Vercel Setup

- [ ] Vercel'e GitHub repository import edildi
- [ ] Build command: `prisma generate && next build`
- [ ] Install command: `pnpm install`
- [ ] Tüm environment variables eklendi (newline yok!)
- [ ] `NEXT_PUBLIC_DEPLOY_URL` production URL'i
- [ ] `DATABASE_URL` Neon connection string'i

### Post-Deployment

- [ ] Build başarılı
- [ ] Deployment URL'i açılıyor
- [ ] OAuth flow çalışıyor
- [ ] Customer portal açılıyor
- [ ] Database bağlantısı çalışıyor
- [ ] Logs'ta hata yok
- [ ] Environment variables doğru (`vercel env pull`)

### ikas Integration

- [ ] OAuth redirect URL'leri doğru
- [ ] App permissions doğru (Orders, Customers, Merchant)
- [ ] Test store'da app yükleniyor
- [ ] Dashboard iframe'de açılıyor
- [ ] GraphQL API çalışıyor

---

## Production Maintenance

### Monitoring

```bash
# Real-time logs
vercel logs https://refund-v1.vercel.app --follow

# Error logs
vercel logs https://refund-v1.vercel.app --since 1h | grep ERROR
```

### Database Backup

Neon otomatik olarak backup alır. Manuel backup için:

```bash
# Prisma Studio
DATABASE_URL="postgresql://..." npx prisma studio

# pg_dump (PostgreSQL client gerekli)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Rollback

Hatalı deployment'ı geri almak için:

```bash
# Previous deployment'ı bul
vercel ls

# Rollback
vercel rollback [previous-deployment-url]
```

### Environment Variable Update

```bash
# Değişiklik yap
vercel env rm VARIABLE_NAME production --yes
echo -n "new-value" | vercel env add VARIABLE_NAME production

# Redeploy
git commit --allow-empty -m "chore: update environment variables"
git push
```

---

## Security Best Practices

1. **Secrets**: Client Secret ve JWT Secret'ı asla commit etmeyin
2. **Environment Variables**: Trailing newline olmadığından emin olun
3. **HTTPS**: Production'da sadece HTTPS kullanın
4. **Database**: Connection string'de `?sslmode=require` parametresi olmalı
5. **Logs**: Sensitive data log'lanmamalı
6. **CORS**: API endpoint'lerinde gerekirse CORS konfigürasyonu yapın

---

## Support

Sorun yaşarsanız:

1. **Logs kontrol edin**: `vercel logs [url] --since 10m`
2. **Environment variables kontrol edin**: `vercel env ls production`
3. **TROUBLESHOOTING.md**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) dosyasına bakın
4. **GitHub Issues**: Repository'de issue açın

---

**Son Güncelleme:** 2025-01-24

**İlgili Dökümanlar:**
- [README.md](./README.md) - Genel bilgiler ve setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Sistem mimarisi
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Sorun giderme
