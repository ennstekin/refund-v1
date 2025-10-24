# 🚀 Quick Start - Portal Deployment

## Mimari Özeti

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Ana App (Dashboard, Settings, Refunds)        │
│  Nerede: ikas platformu içinde (iframe)        │
│  Deployment: Yok (ikas tarafından host)        │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                                                 │
│  Portal (Customer Portal)                       │
│  Nerede: Vercel (public)                       │
│  Deployment: vercel --prod                      │
│  URL: https://refund-portal.vercel.app         │
│                                                 │
└─────────────────────────────────────────────────┘

           ↓                     ↓
    ┌──────────────────────────────────┐
    │   Neon PostgreSQL Database       │
    │   (Paylaşılan)                   │
    └──────────────────────────────────┘
```

---

## ⚡ 5 Dakikada Portal Deployment

### 1. Vercel Login

```bash
npm i -g vercel
vercel login
```

### 2. İlk Deployment

```bash
vercel
```

**Sorulara Cevaplar:**
- Set up and deploy: `Y`
- Which scope: `<your-team>`
- Link to existing project: `N`
- Project name: `refund-portal`
- In which directory: `./`
- Override settings: `N`

### 3. Environment Variables Ekle

```bash
# Database
vercel env add DATABASE_URL production
# Paste: postgresql://neondb_owner:npg_tRjkTS8eF5lQ@ep-winter-union-a4c42yag-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# ikas API
vercel env add NEXT_PUBLIC_GRAPH_API_URL production
# Paste: https://api.myikas.com/api/v2/admin/graphql

# Client ID
vercel env add NEXT_PUBLIC_CLIENT_ID production
# Paste: d75f1f20-2c5f-48c4-914a-fad30f76d16b

# Client Secret
vercel env add CLIENT_SECRET production
# Paste: s_SFP9LkQaQyZCQ1RE39xeRoB436397cbbfd124fea917afa1856e95018

# Cookie Password (32+ karakter random string)
vercel env add SECRET_COOKIE_PASSWORD production
# Paste: <güvenli 32+ karakter şifre>

# Mode
vercel env add DEV_MODE production
# Paste: false

# Portal URL (kendi kendine)
vercel env add NEXT_PUBLIC_PORTAL_URL production
# Paste: https://refund-portal.vercel.app

# Deploy URL
vercel env add NEXT_PUBLIC_DEPLOY_URL production
# Paste: https://refund-portal.vercel.app
```

### 4. Production Deploy

```bash
vercel --prod
```

Deployment URL'ini not edin. Örnek: `https://refund-portal-xyz.vercel.app`

### 5. Domain Bağla (Opsiyonel)

```bash
# Custom domain ekle
vercel domains add iade.yourstore.com

# DNS ayarlarını yapılandır (Vercel gösterecek)
```

---

## 🔧 Ana App için Local Environment

Ana app sadece development'ta çalışır, production'da ikas içinde host edilir.

**.env.local'de değişiklik:**

```bash
# Portal URL'i production Vercel URL'ine güncelle
NEXT_PUBLIC_PORTAL_URL="https://refund-portal.vercel.app"
```

---

## 📋 Test Checklist

### Portal Test (Vercel):

```bash
# URL'leri test et
https://refund-portal.vercel.app/portal
https://refund-portal.vercel.app/track
```

1. **Portal Sayfası:**
   - [ ] Sayfa açılıyor
   - [ ] Sipariş numarası ve email formu çalışıyor
   - [ ] storeId query parameter ile merchant bulunuyor

2. **Verify Order:**
   ```bash
   curl -X POST https://refund-portal.vercel.app/api/public/verify-order \
     -H "Content-Type: application/json" \
     -d '{"orderNumber": "test", "email": "test@test.com"}'
   ```

3. **Submit Refund:**
   - [ ] İade talebi oluşturuluyor
   - [ ] Database'e kaydediliyor
   - [ ] Success sayfası gösteriliyor

4. **Track Refund:**
   - [ ] Tracking sayfası çalışıyor
   - [ ] Timeline görünüyor

### Ana App Test (ikas'ta):

1. **OAuth Flow:**
   - [ ] App yükleniyor
   - [ ] Merchant otomatik oluşuyor
   - [ ] Dashboard açılıyor

2. **Settings Sayfası:**
   - [ ] Portal URL gösteriliyor
   - [ ] URL Vercel production URL'ini içeriyor
   - [ ] storeId parametresi var
   - [ ] "Kopyala" butonu çalışıyor

3. **Dashboard:**
   - [ ] Portal'dan oluşturulan iadeler "Portal İade Talepleri" tab'ında
   - [ ] Manuel iadeler "Manuel İade Kayıtları" tab'ında

---

## 🌐 URL Yapısı

### Development (Local):
```
Ana App:    http://localhost:3001/dashboard
            http://localhost:3001/settings
            http://localhost:3001/refunds

Portal:     http://localhost:3001/portal
            http://localhost:3001/track
```

### Production:

```
Ana App:    https://dev-enes0.myikas.com/admin/authorized-app/{appId}/dashboard
            (ikas tarafından host)

Portal:     https://refund-portal.vercel.app/portal
            https://refund-portal.vercel.app/portal?storeId=xxx
            https://refund-portal.vercel.app/track
```

---

## 🎯 Settings'te Gösterilen Portal URL

Development'ta:
```
http://localhost:3001/portal?storeId=f5c91d2e-18cd-44e9-90bd-689be8f7ebd2
```

Production'da (Vercel portal deploy sonrası):
```
https://refund-portal.vercel.app/portal?storeId=f5c91d2e-18cd-44e9-90bd-689be8f7ebd2
```

Bu URL'i müşterilere paylaşacaksınız!

---

## 🔄 Güncelleme ve Yeniden Deploy

Portal'da değişiklik yaptıktan sonra:

```bash
# Değişiklikleri commit et
git add .
git commit -m "feat: portal update"

# Production'a deploy et
vercel --prod
```

Ana app için deployment gerekmez (ikas tarafından host).

---

## 📊 Monitoring

### Portal (Vercel):
```bash
# Logs
vercel logs --production --follow

# Analytics
# https://vercel.com/your-team/refund-portal/analytics
```

### Ana App:
- Browser console
- ikas platform logs

---

## 🐛 Troubleshooting

### Portal "Mağaza bulunamadı" hatası

**Çözüm:** storeId query parameter eksik veya yanlış

```bash
# Doğru URL:
https://refund-portal.vercel.app/portal?storeId=f5c91d2e-18cd-44e9-90bd-689be8f7ebd2

# Yanlış URL:
https://refund-portal.vercel.app/portal  # ❌ storeId yok
```

### Database connection hatası

**Çözüm:** DATABASE_URL environment variable'ı kontrol et

```bash
vercel env ls
```

### Settings'te Portal URL yanlış

**Çözüm:** NEXT_PUBLIC_PORTAL_URL environment variable'ı ana app'te güncelle

---

## ✅ Final Checklist

- [ ] Vercel'da portal deploy edildi
- [ ] Environment variables ayarlandı
- [ ] Database migration çalıştırıldı
- [ ] Portal sayfası açılıyor
- [ ] Ana app Settings sayfasında doğru Portal URL görünüyor
- [ ] Portal URL'i storeId parametresi içeriyor
- [ ] Test iade oluşturuldu
- [ ] Tracking sayfası çalışıyor
- [ ] Dashboard'da portal iadeler görünüyor

---

**Portal Deployment: DONE!** ✅

Artık müşterileriniz Vercel'deki portal üzerinden iade talebi oluşturabilir!
