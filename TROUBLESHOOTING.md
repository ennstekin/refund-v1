# 🔧 Troubleshooting Guide

Bu dokümanda, ikas İade Yönetim Sistemi'ni geliştirirken karşılaşılan zorluklar ve çözümleri detaylı şekilde açıklanmıştır.

## İçindekiler

- [Deployment Sorunları](#deployment-sorunları)
- [OAuth Authentication Sorunları](#oauth-authentication-sorunları)
- [Environment Variables Sorunları](#environment-variables-sorunları)
- [Database Sorunları](#database-sorunları)
- [API ve GraphQL Sorunları](#api-ve-graphql-sorunları)

---

## Deployment Sorunları

### Problem 1: Vercel Build Hataları - Missing Enum Types

**Semptomlar:**
```
Type error: Cannot find name 'OrderStatusEnum'.
Type error: Cannot find name 'OrderPaymentStatusEnum'.
```

**Kök Neden:**
- `@ikas/admin-api-client` preset'i enum tiplerini export etmiyor
- Generated GraphQL kod enum'ları referans ediyor ama tanımlı değil

**Çözüm:**
`src/lib/ikas-client/generated/graphql.ts` dosyasına enum tip aliasları ekleyin:

```typescript
// Enum type aliases (codegen doesn't generate enums, using string for now)
export type OrderStatusEnum = string;
export type OrderPaymentStatusEnum = string;
export type OrderPackageStatusEnum = string;
export type OrderPackageFulfillStatusEnum = string;
export type OrderLineItemStatusEnum = string;
export type RefundStatusEnum = string;
```

**İlgili Commit:** `fix: add enum type aliases to fix typescript compilation`

---

### Problem 2: TypeScript Compilation - Missing GraphQL Parameters

**Semptomlar:**
```
Type error: Object literal may only specify known properties,
and 'orderNumber' does not exist in type 'ListOrderQueryVariables'.
```

**Kök Neden:**
- GraphQL query'sine yeni parametre eklenmiş (`orderNumber`)
- Ancak TypeScript tip tanımları güncellenmemiş
- `pnpm codegen` çalıştırılmamış

**Çözüm:**
1. GraphQL query'sini `src/lib/ikas-client/graphql-requests.ts` dosyasında güncelleyin
2. Variables tanımını ekleyin:
```typescript
query listOrder($orderNumber: StringFilterInput) {
  listOrder(orderNumber: $orderNumber) {
    // ...
  }
}
```
3. Codegen çalıştırın:
```bash
pnpm codegen
```

**İlgili Commit:** `fix: add orderNumber parameter to GraphQL queries and regenerate types`

---

## OAuth Authentication Sorunları

### Problem 3: Invalid client_id Error

**Semptomlar:**
```json
{"errors":[{"msg":"invalid client_id","param":"client_id","location":"query"}]}
```

**Kök Neden:**
Environment variable değerlerinin sonunda `\n` (newline) karakteri vardı:
```bash
NEXT_PUBLIC_CLIENT_ID="d75f1f20-2c5f-48c4-914a-fad30f76d16b\n"
```

Bu, `vercel env add` komutunu `<<<` operatörü ile kullandığımızda oluştu.

**Çözüm:**
Environment variable'ları doğru şekilde ekleyin:

```bash
# Yanlış (newline ekler):
vercel env add NEXT_PUBLIC_CLIENT_ID production <<< "value"

# Doğru (newline eklemez):
echo -n "value" | vercel env add NEXT_PUBLIC_CLIENT_ID production
```

**Düzeltme Adımları:**
```bash
# Eski değerleri sil
vercel env rm NEXT_PUBLIC_CLIENT_ID production --yes
vercel env rm CLIENT_SECRET production --yes
vercel env rm NEXT_PUBLIC_DEPLOY_URL production --yes

# Yeni değerleri düzgün ekle
echo -n "d75f1f20-2c5f-48c4-914a-fad30f76d16b" | vercel env add NEXT_PUBLIC_CLIENT_ID production
echo -n "your_secret" | vercel env add CLIENT_SECRET production
echo -n "https://refund-v1.vercel.app" | vercel env add NEXT_PUBLIC_DEPLOY_URL production

# Yeni deployment tetikle
git commit --allow-empty -m "chore: trigger deployment"
git push
```

**İlgili Commit:** `chore: trigger deployment after fixing environment variables`

---

### Problem 4: OAuth Flow Başlamıyor - Doğrudan Dashboard'a Gidiyor

**Semptomlar:**
- Uygulama yüklendiğinde OAuth yetkilendirmesi yapılmıyor
- Doğrudan dashboard'a gidiyor ama token yok
- Sayfalar yüklenemiyor (beyaz ekranda kalıyor)

**Kök Neden:**
Ana sayfa (`/`) OAuth flow kontrolü yapmadan direkt dashboard'a yönlendiriyor.

**Çözüm:**
Ana sayfayı token kontrolü yapacak şekilde güncelleyin:

```typescript
// src/app/page.tsx
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = await TokenHelpers.getTokenForIframeApp();

        if (token) {
          // Token var, dashboard'a git
          router.replace('/dashboard');
        } else {
          // Token yok, OAuth başlat
          router.replace('/authorize-store');
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        router.replace('/authorize-store');
      }
    };

    checkAuthorization();
  }, [router]);

  return <Loading />;
}
```

**İlgili Commit:** `fix(oauth): implement proper OAuth authorization flow`

---

## Environment Variables Sorunları

### Problem 5: NEXT_PUBLIC_ Variables Build Time'da Dahil Edilmiyor

**Semptomlar:**
- Environment variable eklenmiş ama uygulama hala eski değerleri kullanıyor
- Client-side'da `undefined` görünüyor

**Kök Neden:**
- `NEXT_PUBLIC_` prefix'li değişkenler build time'da bundle'a dahil edilir
- Sadece environment variable eklemek yeterli değil, yeni build gerekir

**Çözüm:**
1. Environment variable'ı ekleyin veya güncelleyin
2. Yeni deployment tetikleyin (boş commit yeterli):

```bash
git commit --allow-empty -m "chore: trigger deployment with updated env vars"
git push
```

**Not:** Vercel otomatik olarak her push'ta yeniden build eder ve yeni environment variable'ları kullanır.

---

### Problem 6: Production vs Development Environment Karışıklığı

**Semptomlar:**
- Local'de çalışıyor ama production'da çalışmıyor
- Ya da tam tersi

**Kök Neden:**
Farklı environment dosyaları farklı değerler içeriyor:
- `.env.local` - Development
- `.env.production` - Production (Vercel'de)

**Çözüm:**
Environment variable'ları kontrol edin:

```bash
# Production env'leri çek
vercel env pull .env.vercel.production --environment=production

# İçeriği kontrol et
cat .env.vercel.production

# Local env ile karşılaştır
diff .env.local .env.vercel.production
```

**Önemli:** `NEXT_PUBLIC_DEPLOY_URL` mutlaka farklı olmalı:
- Local: `http://localhost:3001`
- Production: `https://refund-v1.vercel.app`

---

## Database Sorunları

### Problem 7: Prisma Client Out of Sync

**Semptomlar:**
```
Error: Prisma schema has changed, please run `prisma generate` again.
```

**Çözüm:**
```bash
pnpm prisma:generate
```

**Vercel'de otomatik çözüm:** `package.json` build script'i zaten `prisma generate` içeriyor:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

---

### Problem 8: Database Connection Issues (Neon PostgreSQL)

**Semptomlar:**
- Local'de SQLite çalışıyor ama production'da PostgreSQL hatası
- `DATABASE_URL` bulunamıyor

**Çözüm:**
Vercel'e database URL'ini ekleyin:

```bash
vercel env add DATABASE_URL production
```

Değer:
```
postgresql://user:password@host/database?sslmode=require
```

**Neon Integration:** Vercel dashboard'dan otomatik olarak eklenebilir:
1. Vercel Dashboard → Project → Storage
2. Neon PostgreSQL'i seç ve bağla
3. Otomatik olarak tüm DB environment variable'ları eklenir

---

## API ve GraphQL Sorunları

### Problem 9: Order Search Performance - Yavaş Sipariş Araması

**Semptomlar:**
- Sipariş numarası ile arama çok yavaş
- Tüm siparişleri tarıyor

**Kök Neden:**
`search` parametresi full-text search yapıyor, indexed field lookup kullanmıyor.

**Çözüm:**
Sipariş numarası için özel logic ekleyin:

```typescript
// src/app/api/ikas/orders/route.ts
const isOrderNumber = search && /^\d+$/.test(search.trim());

const ordersResponse = await ikasClient.queries.listOrder({
  pagination: { limit },
  sort: '-orderedAt',
  ...(isOrderNumber
    ? { orderNumber: { eq: search.trim() } }  // İndexli field
    : { search }                               // Full-text search
  ),
});
```

**İlgili Commit:** `perf: optimize order search with intelligent order number detection`

---

### Problem 10: Portal Page - Order Not Found Hatası

**Semptomlar:**
- Müşteri portal sayfasından sipariş doğrulanamıyor
- API'den doğrudan çalışıyor ama portal sayfasından çalışmıyor
- Hata: "Sipariş bulunamadı"

**Kök Neden:**
Portal sayfası `storeName` veya `storeId` parametrelerini API'ye iletmiyor.

**Çözüm:**
Portal sayfasında URL parametrelerini okuyun ve API'ye iletin:

```typescript
// src/app/portal/page.tsx
function RefundPortalContent() {
  const searchParams = useSearchParams();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    setStoreName(searchParams.get('storeName'));
    setStoreId(searchParams.get('storeId'));
  }, [searchParams]);

  const handleSubmit = async (e) => {
    // Build query params
    const queryParams = new URLSearchParams();
    if (storeName) queryParams.set('storeName', storeName);
    if (storeId) queryParams.set('storeId', storeId);

    const url = `/api/public/verify-order${queryParams.toString() ? `?${queryParams}` : ''}`;

    const response = await axios.post(url, {
      orderNumber: orderNumber.trim(),
      email: email.trim().toLowerCase(),
    });
  };
}

// Suspense wrapper gerekli (Next.js 15)
export default function RefundPortalPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <RefundPortalContent />
    </Suspense>
  );
}
```

**İlgili Commit:** `fix: portal page now passes storeName/storeId to verify-order API`

---

## Genel Debugging İpuçları

### Vercel Logs İnceleme

```bash
# Gerçek zamanlı loglar
vercel logs https://refund-v1.vercel.app --follow

# Son 10 dakika
vercel logs https://refund-v1.vercel.app --since 10m

# Specific deployment
vercel logs [deployment-url]
```

### Environment Variables Kontrol

```bash
# Tüm production env'leri listele
vercel env ls production

# Specific env'i çek ve kontrol et
vercel env pull .env.vercel.production --environment=production
cat .env.vercel.production | grep -E "(CLIENT_ID|SECRET|URL)"
```

### Database Kontrol (Prisma Studio)

```bash
# Local database
pnpm prisma:studio

# Production database (connection string gerekli)
DATABASE_URL="postgresql://..." npx prisma studio
```

### Build Testi (Local)

```bash
# Production build testi
pnpm build

# Start production server
pnpm start
```

---

## Hızlı Referans: Sık Karşılaşılan Hatalar

| Hata Mesajı | Muhtemel Sebep | Çözüm |
|-------------|----------------|-------|
| `invalid client_id` | Environment variable sonunda `\n` var | Env var'ı `echo -n` ile yeniden ekle |
| `Cannot find name 'OrderStatusEnum'` | Enum tipler eksik | `generated/graphql.ts`'e tip aliasları ekle |
| `Sipariş bulunamadı` (Portal) | `storeId` parametresi iletilmiyor | Portal sayfasında URL params oku ve ilet |
| `Missing required environment variable` | Env var tanımlı değil | Vercel'e ekle ve redeploy |
| TypeScript compilation error | GraphQL types güncel değil | `pnpm codegen` çalıştır |
| Database connection error | DATABASE_URL yanlış veya eksik | Neon integration kontrol et |
| OAuth beyaz ekran | Token yok, flow başlamadı | Ana sayfada token kontrolü ekle |
| Slow order search | Full-text search kullanılıyor | Order number için indexed lookup kullan |

---

## Deployment Checklist

Deployment öncesi kontrol listesi:

- [ ] Environment variables doğru mu? (newline yok mu?)
- [ ] `NEXT_PUBLIC_DEPLOY_URL` production URL'i mi?
- [ ] Database bağlantısı çalışıyor mu?
- [ ] `pnpm build` local'de başarılı mı?
- [ ] GraphQL types güncel mi? (`pnpm codegen`)
- [ ] OAuth redirect URL'leri doğru mu?
- [ ] ikas Developer Portal'da URL'ler güncel mi?

---

## Destek ve Yardım

Sorun devam ediyorsa:

1. **Logs kontrol edin:** `vercel logs [url] --since 10m`
2. **Environment variables kontrol edin:** `vercel env ls production`
3. **Local'de test edin:** `pnpm build && pnpm start`
4. **Vercel dashboard'u kontrol edin:** https://vercel.com/dashboard
5. **Issue açın:** GitHub repository'de issue oluşturun

---

**Son Güncelleme:** 2025-01-24

**İlgili Dökümanlar:**
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detaylı deployment rehberi
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Sistem mimarisi
- [README.md](./README.md) - Genel bilgiler ve setup
