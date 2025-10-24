# Vercel Deployment Rehberi

Bu rehber, ikas refund uygulamanızı Vercel'e deploy etmek için gerekli adımları açıklar.

## Ön Koşullar

1. [Vercel hesabı](https://vercel.com/signup) oluşturun
2. GitHub/GitLab/Bitbucket repository'niz hazır olsun
3. Vercel Postgres veya başka bir PostgreSQL database hazırlayın

## 1. Vercel Projesi Oluşturma

1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin
2. "Add New..." > "Project" tıklayın
3. GitHub repository'nizi seçin ve import edin

## 2. Environment Variables Ayarlama

Vercel dashboard'da Project Settings > Environment Variables bölümüne gidin ve aşağıdaki değişkenleri ekleyin:

### Zorunlu Environment Variables

```bash
# ikas API Configuration
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin

# ikas OAuth Credentials (ikas Developer Portal'dan alın)
NEXT_PUBLIC_CLIENT_ID=your_ikas_app_client_id
CLIENT_SECRET=your_ikas_app_client_secret

# Deployment URL (Vercel'in size verdiği URL)
NEXT_PUBLIC_DEPLOY_URL=https://your-app-name.vercel.app

# Session Secret (32+ karakter güçlü rastgele string)
SECRET_COOKIE_PASSWORD=your_32_character_random_string_here

# Database (Vercel Postgres kullanıyorsanız otomatik eklenir)
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Environment Variable'ları Nasıl Alırsınız?

1. **ikas Credentials** (`NEXT_PUBLIC_CLIENT_ID` ve `CLIENT_SECRET`):
   - [ikas Developer Portal](https://developer.myikas.com)'a gidin
   - Uygulamanızı oluşturun/seçin
   - Client ID ve Client Secret değerlerini kopyalayın

2. **SECRET_COOKIE_PASSWORD**:
   ```bash
   # Terminal'de çalıştırın:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **NEXT_PUBLIC_DEPLOY_URL**:
   - İlk deploy'dan sonra Vercel size bir URL verecek (örn: `your-app.vercel.app`)
   - Bu URL'i kopyalayıp environment variable'a ekleyin
   - Sonra yeniden deploy edin

## 3. Vercel Postgres Kurulumu (Önerilen)

1. Vercel Dashboard'da projenize gidin
2. "Storage" tab'ına tıklayın
3. "Create Database" > "Postgres" seçin
4. Database'i oluşturun
5. `DATABASE_URL` otomatik olarak environment variables'a eklenecek

## 4. Build & Deploy Ayarları

Vercel otomatik olarak şu ayarları kullanır:

- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (package.json'dan alır)
- **Output Directory**: `.next` (otomatik)
- **Install Command**: `pnpm install`

### Custom Build Command (package.json'da tanımlı)

```json
"scripts": {
  "build": "prisma generate && next build"
}
```

Bu komut:
1. Prisma Client'ı generate eder
2. Next.js uygulamasını build eder

## 5. ikas OAuth Redirect URI Ayarlama

ikas Developer Portal'da OAuth callback URL'inizi ayarlayın:

```
https://your-app-name.vercel.app/api/oauth/callback/ikas
```

## 6. İlk Deployment

1. Tüm environment variables'ı ekleyin
2. "Deploy" butonuna tıklayın
3. Build loglarını takip edin

### Deploy Sonrası

1. Vercel'den aldığınız URL'i kopyalayın
2. `NEXT_PUBLIC_DEPLOY_URL` environment variable'ını bu URL ile güncelleyin
3. ikas Developer Portal'da redirect URI'yi güncelleyin
4. Vercel'de yeniden deploy edin (Deployments > "..." > Redeploy)

## 7. Database Migration

İlk deploy'dan sonra database tablolarını oluşturun:

```bash
# Local'de prisma migration çalıştırın
npx prisma migrate deploy

# Veya Vercel CLI ile:
vercel env pull .env.local
npx prisma migrate deploy
```

## Sorun Giderme

### Build Hatası: "Missing required environment variable"

**Sebep**: Environment variables eksik veya yanlış yazılmış

**Çözüm**:
- Vercel Dashboard > Settings > Environment Variables
- Tüm zorunlu değişkenlerin eklendiğinden emin olun
- Variable isimlerinin TAMAMEN aynı olduğundan emin olun (büyük/küçük harf duyarlı)

### Runtime Error: "Database connection failed"

**Sebep**: DATABASE_URL yanlış veya eksik

**Çözüm**:
1. Vercel Postgres kurulumunu kontrol edin
2. DATABASE_URL'in doğru olduğundan emin olun
3. Prisma migration'ların çalıştırıldığından emin olun

### OAuth Callback Error: "Invalid redirect_uri"

**Sebep**: ikas'ta kayıtlı redirect URI ile uygulamanın redirect URI'si uyuşmuyor

**Çözüm**:
1. ikas Developer Portal'da redirect URI'yi kontrol edin
2. `NEXT_PUBLIC_DEPLOY_URL` environment variable'ının doğru olduğundan emin olun
3. Her iki yerde de HTTPS ve doğru domain kullanıldığından emin olun

## Production Checklist

- [ ] Tüm environment variables eklendi
- [ ] DATABASE_URL doğru ve Vercel Postgres bağlantısı çalışıyor
- [ ] ikas OAuth credentials doğru
- [ ] SECRET_COOKIE_PASSWORD güçlü ve rastgele
- [ ] NEXT_PUBLIC_DEPLOY_URL Vercel URL'i ile eşleşiyor
- [ ] ikas Developer Portal'da redirect URI güncel
- [ ] Database migration'lar çalıştırıldı
- [ ] Test OAuth akışı başarılı
- [ ] Production build başarılı

## İleri Düzey: Custom Domain

Eğer kendi domain'inizi kullanmak isterseniz:

1. Vercel Dashboard > Settings > Domains
2. Custom domain ekleyin (örn: `refunds.yourdomain.com`)
3. DNS ayarlarını yapın
4. `NEXT_PUBLIC_DEPLOY_URL`'i custom domain ile güncelleyin
5. ikas Developer Portal'da redirect URI'yi güncelleyin
6. Yeniden deploy edin

## Destek

Sorun yaşarsanız:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
