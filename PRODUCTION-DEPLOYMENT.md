# Production Deployment Guide

## 📋 Ön Hazırlık

### 1. Vercel Hesabı Kurulumu
Eğer henüz yapmadıysanız:
```bash
npm i -g vercel
vercel login
```

### 2. Database Hazırlığı
✅ Neon PostgreSQL database zaten mevcut ve yapılandırıldı.
- Connection string: `DATABASE_URL` environment variable'ında

---

## 🚀 Deployment Adımları

### Step 1: Environment Variables Yapılandırması

Vercel dashboard'a gidin: https://vercel.com/your-team/refund-v1/settings/environment-variables

**Aşağıdaki değişkenleri ekleyin:**

#### Production Environment Variables:
```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_tRjkTS8eF5lQ@ep-winter-union-a4c42yag-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# ikas API Configuration
NEXT_PUBLIC_GRAPH_API_URL="https://api.myikas.com/api/v2/admin/graphql"
NEXT_PUBLIC_ADMIN_URL="https://{storeName}.myikas.com/admin"

# OAuth Credentials
NEXT_PUBLIC_CLIENT_ID="d75f1f20-2c5f-48c4-914a-fad30f76d16b"
CLIENT_SECRET="s_SFP9LkQaQyZCQ1RE39xeRoB436397cbbfd124fea917afa1856e95018"

# Session Security
SECRET_COOKIE_PASSWORD="<32+ character random string - güvenli bir şifre oluşturun>"

# Deployment URL (Vercel otomatik dolduracak, ilk deployment sonrası güncelleyin)
NEXT_PUBLIC_DEPLOY_URL="https://refund-v1.vercel.app"

# Development mode KAPALI olmalı
DEV_MODE="false"
```

**ÖNEMLI:**
- ✅ `DEV_MODE=false` olmalı (production için)
- ❌ `DEV_AUTHORIZED_APP_ID` ve `DEV_MERCHANT_ID` EKLEMEYİN (sadece development için)

---

### Step 2: Deploy Scripti Çalıştırma

```bash
pnpm vercel:deploy
```

Bu script otomatik olarak:
1. Git değişikliklerini kontrol eder
2. Local build test yapar
3. Vercel'a deploy eder
4. NEXT_PUBLIC_DEPLOY_URL'i günceller

**Alternatif Manuel Deployment:**
```bash
# Production'a deploy
vercel --prod

# Deployment URL'ini not edin
# Örnek: https://refund-v1-xyz123.vercel.app
```

---

### Step 3: Database Migration Çalıştırma

Deployment'tan sonra production database'de migration çalıştırın:

```bash
# Vercel environment variables'ı local'e çek
vercel env pull .env.production

# Production database'de migration çalıştır
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma migrate deploy
```

**Not:** `build:vercel` scripti artık otomatik olarak `prisma migrate deploy` çalıştırıyor, ama manuel kontrol için yukarıdaki komutu kullanabilirsiniz.

---

### Step 4: ikas Developer Portal Yapılandırması

1. **ikas Developer Portal'a gidin:** https://developer.myikas.com
2. **App'inizi bulun** ve ayarlarına gidin
3. **Callback URLs'i güncelleyin:**

```
Production Callback URL:
https://refund-v1.vercel.app/api/oauth/callback/ikas

Allowed Redirect URLs:
https://refund-v1.vercel.app/callback
https://refund-v1.vercel.app/dashboard
https://refund-v1.vercel.app/refunds
https://refund-v1.vercel.app/settings
```

4. **Kaydet** ve değişikliklerin yayınlanmasını bekleyin

---

## ✅ Deployment Doğrulama

### 1. OAuth Flow Test

1. ikas mağazanızdan app'i yükleyin veya yeniden yetkilendirin
2. OAuth callback çalışmalı
3. Dashboard'a yönlendirilmeli

**Kontrol Listesi:**
- [ ] OAuth callback başarılı
- [ ] Merchant kaydı otomatik oluştu (database'de kontrol edin)
- [ ] AuthToken kaydı oluştu
- [ ] Dashboard sayfası açıldı

---

### 2. Portal Test

1. **Settings sayfasına gidin:**
   ```
   https://refund-v1.vercel.app/settings
   ```

2. **Portal URL'ini kopyalayın**, örnek:
   ```
   https://refund-v1.vercel.app/portal?storeId=f5c91d2e-18cd-44e9-90bd-689be8f7ebd2
   ```

3. **Portal'ı test edin:**
   - Gerçek bir sipariş numarası girin
   - Email ile doğrula
   - İade nedeni seç
   - Fotoğraf yükle (opsiyonel)
   - İade talebini gönder

4. **Success sayfasını kontrol edin:**
   - İade takip numarası gösterilmeli
   - "İade Durumunu Görüntüle" butonu çalışmalı

5. **Tracking sayfasını test edin:**
   - Timeline görünmeli
   - Sipariş detayları doğru olmalı

---

### 3. Dashboard Test

1. **ikas admin panel'den app'i aç:**
   ```
   https://dev-enes0.myikas.com/admin/authorized-app/{authorizedAppId}
   ```

2. **Refunds sayfasına git**

3. **Kontrol et:**
   - [ ] "Portal İade Talepleri" tab'ında oluşturduğun iade görünüyor
   - [ ] "Manuel İade Kayıtları" tab'ı boş
   - [ ] KPI kartları doğru sayıları gösteriyor
   - [ ] Filtreleme çalışıyor
   - [ ] Excel export çalışıyor

---

### 4. Multi-Tenant Test

**Farklı bir ikas mağazasından test edin:**

1. Başka bir ikas mağazasından app'i yükleyin
2. OAuth flow tamamlanmalı
3. Yeni bir Merchant kaydı oluşmalı
4. Her mağaza sadece kendi iadelerini görmeli

**Database Kontrolü:**
```sql
SELECT id, storeName, portalEnabled, createdAt
FROM "Merchant"
ORDER BY createdAt DESC;
```

Her mağaza için ayrı kayıt olmalı.

---

## 🔧 Production'da Sorun Giderme

### 1. OAuth Callback Hatası

**Hata:** "Invalid redirect_uri"

**Çözüm:**
- ikas Developer Portal'da callback URL'lerini kontrol edin
- NEXT_PUBLIC_DEPLOY_URL environment variable'ı doğru mu?

---

### 2. Database Connection Hatası

**Hata:** "Can't reach database server"

**Çözüm:**
```bash
# Vercel'da DATABASE_URL environment variable'ı doğru mu kontrol edin
vercel env ls

# Neon dashboard'dan connection string'i tekrar alıp güncelleyin
```

---

### 3. Portal'da "Mağaza bulunamadı" Hatası

**Hata:** Merchant kaydı yok

**Çözüm:**
```bash
# OAuth flow'u tekrar çalıştırın veya manuel olarak Merchant oluşturun:

# Prisma Studio ile:
npx prisma studio

# veya SQL ile:
INSERT INTO "Merchant" (id, "authorizedAppId", "storeName", email, "portalEnabled")
VALUES ('merchant-id', 'app-id', 'store-name', 'email@example.com', true);
```

---

### 4. Migration Hatası

**Hata:** "Migration failed"

**Çözüm:**
```bash
# Manuel migration çalıştır
DATABASE_URL="<production-db-url>" npx prisma migrate deploy

# Eğer schema drift varsa:
DATABASE_URL="<production-db-url>" npx prisma db push
```

---

## 📊 Production Monitoring

### 1. Vercel Analytics

Vercel dashboard'da analytics kontrol edin:
- Request count
- Error rate
- Response time
- Bandwidth usage

### 2. Database Monitoring

Neon dashboard'da:
- Connection count
- Query performance
- Storage usage

### 3. Logs

```bash
# Vercel logs görüntüle
vercel logs --production

# Real-time logs
vercel logs --production --follow
```

---

## 🔄 Güncelleme ve Yeniden Deployment

### Code Değişiklikleri Sonrası:

```bash
# 1. Değişiklikleri commit et
git add .
git commit -m "feat: new feature description"
git push origin main

# 2. Deploy script ile deploy et
pnpm vercel:deploy

# veya manuel:
vercel --prod
```

### Database Schema Değişiklikleri Sonrası:

```bash
# 1. Migration oluştur (local)
npx prisma migrate dev --name migration_name

# 2. Code'u commit et (migration dosyaları ile birlikte)
git add prisma/migrations
git commit -m "feat: add new database field"

# 3. Deploy et (build script otomatik migration çalıştırır)
pnpm vercel:deploy
```

---

## 🚨 Acil Durum Rollback

Eğer deployment sonrası problem olursa:

```bash
# 1. Vercel dashboard'dan önceki deployment'a geri dön
# veya CLI ile:
vercel rollback

# 2. Database migration geri alma (dikkatli olun!)
# Manual olarak migration'ı geri alın
```

---

## 📞 Destek

**Deployment sorunları için:**
1. Vercel loglarını kontrol edin: `vercel logs --production`
2. Neon database loglarını kontrol edin
3. ikas Developer Portal'da webhook loglarına bakın

**Database sorunları için:**
```bash
# Prisma Studio ile manuel kontrol
npx prisma studio

# Database bağlantı testi
npx prisma db execute --sql "SELECT 1"
```

---

## ✅ Post-Deployment Checklist

- [ ] OAuth flow çalışıyor
- [ ] Merchant otomatik oluşuyor
- [ ] Portal gerçek siparişlerle test edildi
- [ ] Tracking sayfası çalışıyor
- [ ] Dashboard'da veriler görünüyor
- [ ] Multi-tenant ayrımı doğru çalışıyor
- [ ] Settings sayfasında Portal URL gösteriliyor
- [ ] Excel export çalışıyor
- [ ] Mobile responsive test edildi
- [ ] Production logları temiz (hata yok)

---

## 📝 Production Environment Variables Örneği

`.env.production.example` dosyası:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# ikas API
NEXT_PUBLIC_GRAPH_API_URL="https://api.myikas.com/api/v2/admin/graphql"
NEXT_PUBLIC_ADMIN_URL="https://{storeName}.myikas.com/admin"

# OAuth
NEXT_PUBLIC_CLIENT_ID="your-client-id"
CLIENT_SECRET="your-client-secret"

# Security
SECRET_COOKIE_PASSWORD="min-32-chars-random-string-for-production"

# Deployment
NEXT_PUBLIC_DEPLOY_URL="https://your-app.vercel.app"

# Mode
DEV_MODE="false"
```

---

**Son Güncelleme:** 24 Ekim 2025
**Deployment URL:** https://refund-v1.vercel.app
**Database:** Neon PostgreSQL (Production-ready)
