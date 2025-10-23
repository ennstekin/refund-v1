# Vercel Deployment Rehberi

## 🎯 Hedef
ikas İade Yönetim Sistemi'ni Vercel'e ücretsiz deploy edip kendi domain'inle bağlamak.

---

## 📋 Ön Hazırlık

### Gerekli Bilgiler
- [ ] GitHub repository: https://github.com/ennstekin/refund-v1 (✅ Hazır)
- [ ] ikas Client ID ve Client Secret
- [ ] Domain adın (örn: enestekin.com)
- [ ] Vercel hesabı

---

## 🚀 Adım 1: Vercel Hesabı Oluştur

1. https://vercel.com adresine git
2. "Sign Up" tıkla
3. **"Continue with GitHub"** seç (Önemli!)
4. GitHub'a izin ver
5. Hesap oluşturuldu! ✅

---

## 🔗 Adım 2: GitHub Repository'yi Bağla

1. Vercel Dashboard'da **"Add New..."** → **"Project"** tıkla
2. **"Import Git Repository"** seç
3. GitHub hesabını bağla (eğer bağlı değilse)
4. **"ennstekin/refund-v1"** repository'sini seç
5. **"Import"** tıkla

---

## ⚙️ Adım 3: Proje Ayarları

### Framework Preset
- **Framework:** Next.js (Otomatik algılanır)
- **Root Directory:** `./` (Değiştirme)
- **Build Command:** `pnpm build` (Otomatik)
- **Output Directory:** `.next` (Otomatik)

### Environment Variables

**Şimdi eklemen gereken değişkenler:**

```env
# 1. ikas OAuth (ikas developer console'dan al)
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin
NEXT_PUBLIC_CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here

# 2. Session Secret (random 32+ karakter)
SECRET_COOKIE_PASSWORD=bu-kismi-random-32-karakterli-yap-1234567890

# 3. App URL (İLK DEPLOYMENT'TAN SONRA EKLENECEk)
# NEXT_PUBLIC_DEPLOY_URL=https://your-app.vercel.app
```

**Not:** `NEXT_PUBLIC_DEPLOY_URL` ve `DATABASE_URL` şimdilik ekleme, deployment'tan sonra ekleyeceğiz.

---

## 🎬 Adım 4: Deploy Et!

1. Environment variables'ı ekle
2. **"Deploy"** butonuna tıkla
3. ☕ Deployment başladı! (~2-3 dakika)

Build loglarını takip et:
```
Building...
▲ Vercel
> Building Next.js app...
> Generating Prisma Client...
> ✓ Build successful!
```

---

## 🌐 Adım 5: Deployment URL'i Al

Deployment tamamlandı! 🎉

1. Vercel sana otomatik bir URL verdi:
   ```
   https://refund-v1-xxx.vercel.app
   ```

2. Bu URL'i kopyala
3. **Project Settings** → **Environment Variables** git
4. Yeni variable ekle:
   ```
   NEXT_PUBLIC_DEPLOY_URL=https://refund-v1-xxx.vercel.app
   ```
5. **"Redeploy"** tıkla (Environment variable değiştiği için)

---

## 🗄️ Adım 6: Database Kurulumu

### Option 1: Vercel Postgres (Önerilen - Kolay)

1. Vercel Dashboard → **"Storage"** sekmesi
2. **"Create Database"** → **"Postgres"**
3. Database adı: `refund-db`
4. Region: `Frankfurt` (en yakın)
5. **"Create"** tıkla

**Database otomatik bağlandı!** ✅
- `DATABASE_URL` environment variable otomatik eklendi
- Redeploy gerekmiyor

### Option 2: Supabase (Ücretsiz + Generous)

1. https://supabase.com → "Start your project"
2. Yeni proje oluştur
3. Database password belirle
4. Connection string'i kopyala:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Vercel Environment Variables'a ekle:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
6. Redeploy

---

## 📊 Adım 7: Database Migration

Database oluşturduktan sonra tabloları oluşturmalıyız:

### Vercel Postgres ile:

1. Vercel Dashboard → **"Storage"** → Database'ini seç
2. **".env.local"** sekmesini aç
3. Connection string'i kopyala
4. Local terminalinde:

```bash
# 1. Production database URL'ini environment variable olarak ekle
export DATABASE_URL="postgresql://..."

# 2. Prisma migration'ı çalıştır
npx prisma migrate deploy

# 3. Başarılı! ✅
```

Alternatif: Vercel CLI ile

```bash
# 1. Vercel CLI yükle
npm i -g vercel

# 2. Login ol
vercel login

# 3. Project'e bağlan
vercel link

# 4. Migration çalıştır
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

---

## 🌍 Adım 8: Domain'ini Bağla

### Senin Domain'in: `enestekin.com` (örnek)

#### A) Ana Domain'i Bağla (enestekin.com)

1. Vercel Dashboard → **"Settings"** → **"Domains"**
2. **"Add"** tıkla
3. Domain'ini gir: `enestekin.com`
4. **"Add"** tıkla
5. DNS kayıtlarını gösterecek:

```
A Record:
┌──────────────────────────────────────┐
│ Type  │ Name  │ Value                │
├──────────────────────────────────────┤
│ A     │ @     │ 76.76.21.21         │
└──────────────────────────────────────┘
```

6. Domain sağlayıcına git (GoDaddy, Namecheap, etc.)
7. DNS ayarlarından A kaydını ekle
8. Vercel'de **"Verify"** tıkla
9. ⏱️ 5-10 dakika bekle (DNS propagation)
10. ✅ Domain bağlandı!

#### B) Subdomain'leri Bağla (portal için)

Portal için 2 seçenek:

**Seçenek 1: Tek Subdomain**
```
Portal: iade.enestekin.com
```

DNS Kaydı:
```
┌──────────────────────────────────────────┐
│ Type  │ Name  │ Value                    │
├──────────────────────────────────────────┤
│ CNAME │ iade  │ cname.vercel-dns.com    │
└──────────────────────────────────────────┘
```

**Seçenek 2: Wildcard (Çoklu Merchant)**
```
Portal: *.portal.enestekin.com
Örnek: magaza-a.portal.enestekin.com
```

DNS Kaydı:
```
┌──────────────────────────────────────────┐
│ Type  │ Name      │ Value                │
├──────────────────────────────────────────┤
│ CNAME │ *.portal  │ cname.vercel-dns.com│
└──────────────────────────────────────────┘
```

---

## 🔐 Adım 9: ikas OAuth Callback Güncelle

ikas Developer Console'da:

1. App ayarlarına git
2. **Redirect URL'i güncelle:**
   ```
   Eski: http://localhost:3000/api/oauth/callback/ikas
   Yeni: https://enestekin.com/api/oauth/callback/ikas
   ```
3. **Kaydet**

---

## ✅ Adım 10: Test Et!

### Admin Panel Testi

1. ikas admin'e git
2. Uygulamanı yükle/aç
3. OAuth flow çalışmalı
4. Admin panel iframe'de açılmalı
5. İadeler görünmeli

### Portal Testi

1. `https://iade.enestekin.com` (veya subdomain'in) aç
2. Sipariş formu görünmeli
3. Test siparişi ile dene
4. İade oluşturma flow'u çalışmalı

---

## 🐛 Sorun Giderme

### "Failed to build" hatası

```bash
# Local'de build test et
pnpm build

# Hata varsa düzelt
# Commit ve push et
git add .
git commit -m "fix: build error"
git push
```

### "Prisma Client not found" hatası

Vercel'de build command'i kontrol et:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

### Database bağlanamıyor

```bash
# Connection string'i test et
npx prisma db push --preview-feature

# Format doğru mu kontrol et
postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
```

### Domain bağlanmıyor

1. DNS propagation'ı kontrol et: https://dnschecker.org
2. A/CNAME kayıtlarını kontrol et
3. 24 saat bekle (maksimum)
4. Domain sağlayıcının proxy/CDN'ini kapat

---

## 📊 Deployment Sonrası

### Monitoring

Vercel Dashboard'da:
- **Analytics**: Traffic, visitors
- **Logs**: Runtime logs, errors
- **Deployments**: Deploy history

### Automatic Deployments

Her GitHub push'ta otomatik deploy olur:
```bash
git add .
git commit -m "feat: new feature"
git push
# ✅ Otomatik deploy başlar!
```

### Preview Deployments

Her branch için preview URL:
```bash
git checkout -b feature/new-feature
git push origin feature/new-feature
# ✅ Preview URL: https://refund-v1-xxx-preview.vercel.app
```

---

## 💰 Maliyet

### Vercel Hobby (Ücretsiz)
- ✅ Unlimited deployments
- ✅ Custom domains
- ✅ Automatic HTTPS
- ✅ 100GB bandwidth/mo
- ✅ Preview deployments
- ⚠️ Function timeout: 10s

### Vercel Pro ($20/mo)
- ✅ Everything in Hobby
- ✅ Function timeout: 60s
- ✅ Team collaboration
- ✅ Priority support
- ✅ Advanced analytics

### Database

**Vercel Postgres:**
- Hobby: $0.30/mo (60GB storage)
- Pro: $20/mo (başlangıç)

**Supabase:**
- Free: 500MB (yeterli başlangıç için)
- Pro: $25/mo (8GB)

---

## 🎉 Tamamlandı!

Artık ikas İade Yönetim Sistemi production'da!

**Erişim URL'leri:**
- Admin: `https://enestekin.com` (ikas iframe)
- Portal: `https://iade.enestekin.com`
- API: `https://enestekin.com/api`

**Sonraki Adımlar:**
1. Email notification ekle
2. Monitoring setup
3. Backup stratejisi
4. Multi-merchant support

---

## 📞 Yardım

**Vercel Support:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**Sorun yaşarsan:**
1. Vercel logs'u kontrol et
2. GitHub Issues'da sor
3. Bana yaz! 😊
