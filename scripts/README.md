# Deployment Scripts

Bu klasörde Vercel deployment işlemlerini kolaylaştıran scriptler bulunmaktadır.

## Scriptler

### 1. `setup-vercel.sh` - İlk Kurulum

Vercel'e ilk defa deploy ederken kullanın.

```bash
pnpm vercel:setup
```

**Ne yapar:**
- Vercel CLI login kontrolü
- Projeyi Vercel'e link eder
- Environment variables kurulum rehberi gösterir
- Database kurulum talimatları verir
- İlk deployment'ı başlatır

### 2. `check-env.sh` - Environment Variables Kontrolü

Tüm gerekli environment variables'ların ayarlanıp ayarlanmadığını kontrol eder.

```bash
pnpm vercel:check-env
```

**Kontrol edilen değişkenler:**
- `NEXT_PUBLIC_GRAPH_API_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_CLIENT_ID`
- `CLIENT_SECRET`
- `NEXT_PUBLIC_DEPLOY_URL`
- `SECRET_COOKIE_PASSWORD`
- `DATABASE_URL`

### 3. `deploy.sh` - Hızlı Deploy

Vercel'e hızlı ve güvenli deployment yapar.

```bash
pnpm vercel:deploy
```

**Ne yapar:**
- Git durumunu kontrol eder
- Uncommitted değişiklikler varsa commit eder
- Local build test yapar
- Vercel'e production deploy eder
- `NEXT_PUBLIC_DEPLOY_URL` güncel mi kontrol eder
- Deploy URL'i gösterir

## Kullanım Örnekleri

### İlk Kez Deploy

```bash
# 1. Vercel setup
pnpm vercel:setup

# 2. Environment variables'ları ekleyin (Vercel Dashboard veya CLI ile)

# 3. Kontrol edin
pnpm vercel:check-env

# 4. Deploy edin
pnpm vercel:deploy
```

### Sonraki Deploy'lar

```bash
# Değişikliklerinizi yapın
git add .
git commit -m "feat: new feature"

# Deploy
pnpm vercel:deploy
```

### Environment Variables Güncelleme

```bash
# Vercel CLI ile
vercel env add VARIABLE_NAME

# Veya Dashboard'dan:
# https://vercel.com/dashboard → Project → Settings → Environment Variables

# Kontrol
pnpm vercel:check-env
```

## Manual Deployment

Script kullanmadan manuel deploy etmek isterseniz:

```bash
# 1. Login
vercel login

# 2. Link project
vercel link

# 3. Deploy
vercel --prod
```

## Sorun Giderme

### "No existing credentials found"
```bash
vercel login
```

### "Project not linked"
```bash
vercel link
```

### Environment variables eksik
```bash
pnpm vercel:check-env
# Eksik olanları ekleyin
```

### Build hatası
```bash
# Local build test
pnpm build

# Logları kontrol edin
cat /tmp/build.log
```

## Detaylı Rehber

Daha detaylı talimatlar için ana dizindeki `VERCEL_DEPLOY.md` dosyasına bakın.
