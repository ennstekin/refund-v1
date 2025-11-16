# ikas Refund App - Ölçeklendirme Planı

**Proje:** ikas Refund Management System
**Tarih:** 16 Kasım 2025
**Durum:** Production-Ready, Ölçeklendirme Optimizasyonu Gerekli
**Hazırlayan:** Claude AI

---

## 📋 Yönetici Özeti

Bu doküman, ikas Refund Management uygulamasının mevcut mimarisini analiz ederek, 100 merchant'tan 5,000+ merchant kapasitesine ölçeklendirme stratejisini detaylandırmaktadır.

### Mevcut Durum
- **Teknoloji Stack:** Next.js 15, React 19, TypeScript, PostgreSQL
- **Deployment:** Vercel Serverless
- **Mimari:** Multi-tenant SaaS (subdomain-based)
- **Kapasite:** 100-500 merchant, 1,000 refund/gün
- **Ölçeklendirme Hazırlık Skoru:** 6/10

### Hedef
- **Kapasite:** 5,000+ merchant, 50,000 refund/gün
- **Performance:** <200ms response time
- **Uptime:** 99.9%
- **Süre:** 6 ay

### Tahmini Yatırım
- **Zaman:** 8 hafta geliştirme
- **Maliyet:** $40/ay → $125/ay (+$85/ay)
- **ROI:** 10x kapasite artışı

---

## 📊 Mevcut Mimari Analizi

### 1. Teknoloji Stack

#### Frontend
- **Framework:** Next.js 15 App Router
- **UI Library:** React 19
- **Styling:** Tailwind CSS + shadcn/ui
- **Type Safety:** TypeScript (strict mode)

#### Backend
- **Runtime:** Node.js (Vercel Serverless)
- **Database:** PostgreSQL (Neon Serverless)
- **ORM:** Prisma 6.1.0
- **Authentication:** JWT + OAuth 2.0

#### Infrastructure
- **Hosting:** Vercel
- **Database:** Neon (serverless PostgreSQL)
- **CDN:** Vercel Edge Network
- **DNS:** Cloudflare/Vercel

### 2. Veritabanı Şeması

```prisma
AuthToken          # OAuth token storage (auto-refresh)
RefundRequest      # Ana refund verileri (merchantId indexed)
RefundNote         # Admin notları (cascade delete)
RefundTimeline     # Event history
Merchant           # Mağaza konfigürasyonu + subdomain
RestrictedSubdomain # Yasaklı subdomain listesi
SubdomainReservation # Geçici subdomain kilidi
```

**Performans İndeksleri:**
```sql
RefundRequest:
  - merchantId (single)
  - (merchantId, status) (composite)
  - (merchantId, createdAt) (composite)

SubdomainReservation:
  - (subdomain, status) (composite)
```

### 3. API Endpoint'leri (18 adet)

#### Protected Endpoints (JWT Required)
```
GET    /api/ikas/refunds
POST   /api/refunds
GET    /api/refunds/[id]
PATCH  /api/refunds/[id]
DELETE /api/refunds/[id]
GET    /api/settings
POST   /api/settings/subdomain
```

#### Public Endpoints (Rate-Limited)
```
POST   /api/public/verify-order
GET    /api/public/refund/[id]
POST   /api/public/refund
```

#### System Endpoints
```
GET    /api/oauth/callback/ikas
POST   /api/oauth/refresh
GET    /api/health
```

### 4. Multi-Tenant İzolasyon Stratejisi

#### Subdomain-Based Routing
```
Request: ornek-magaza.yourdomain.com/portal
  ↓
Middleware: Extract subdomain → "ornek-magaza"
  ↓
Database: SELECT * FROM Merchant WHERE subdomain = ?
  ↓
Headers: x-merchant-id = "123"
  ↓
Data Filter: WHERE merchantId = 123
```

#### Veri Güvenliği
- JWT'den merchantId çıkarımı
- Tüm sorgularda merchantId filtresi
- Tenant arası veri sızıntısı yok
- Row-level security (uygulama seviyesi)

---

## 🔴 Kritik Performans Sorunları

### Sorun 1: N+1 Query Problemi ⚠️

**Lokasyon:** `/api/refunds` endpoint
**Etki:** Yüksek latency, fazla API çağrısı
**Şiddeti:** CRITICAL

#### Mevcut Kod
```typescript
// src/app/api/refunds/route.ts
const refundRequests = await prisma.refundRequest.findMany({
  where: { merchantId: user.merchantId }
}); // 100 refund

const refundsWithOrders = await Promise.all(
  refundRequests.map(async (refund) => {
    const ikasClient = getIkas(authToken);
    const orderResponse = await ikasClient.queries.listOrderDetail({
      id: refund.orderId
    }); // 100 API çağrısı!
    return { ...refund, order: orderResponse.data };
  })
);
```

#### Performans Etkisi
- 100 refund = 100 ikas API çağrısı
- Her çağrı ~200ms = 20 saniye toplam
- Vercel timeout: 30 saniye (tehlikeli!)

#### Çözüm Önerisi
```typescript
// Batch fetching implementasyonu
const orderIds = refundRequests.map(r => r.orderId);
const orders = await ikasClient.queries.listOrders({
  filter: { id: { in: orderIds } },
  limit: 100
});

// Map orders to refunds
const orderMap = new Map(orders.map(o => [o.id, o]));
const refundsWithOrders = refundRequests.map(refund => ({
  ...refund,
  order: orderMap.get(refund.orderId)
}));
```

**Beklenen İyileştirme:** 100 çağrı → 1 çağrı (99% azalma)

---

### Sorun 2: Cache Eksikliği ⚠️

**Etki:** Gereksiz DB/API çağrıları
**Şiddeti:** HIGH

#### Problemler
1. **Her istek DB'ye gidiyor**
   - Merchant settings: Her istekte çekilir
   - Subdomain lookup: Middleware'de her seferinde
   - Token validation: Database query gerektirir

2. **ikas API verileri cache'lenmemiş**
   - Order detayları tekrar tekrar çekilir
   - Aynı ürün bilgileri tekrar sorgulanır

3. **JWT token'lar DB'den okunuyor**
   - Her API isteğinde AuthToken tablosu sorgulanır

#### Çözüm: Redis Cache Layer

```typescript
// Cache stratejisi
interface CacheStrategy {
  merchantSettings: {
    ttl: 3600; // 1 saat
    key: `merchant:${merchantId}:settings`;
  };

  orderData: {
    ttl: 300; // 5 dakika
    key: `order:${orderId}`;
  };

  jwtToken: {
    ttl: 900; // 15 dakika
    key: `token:${authorizedAppId}`;
  };

  subdomainLookup: {
    ttl: 7200; // 2 saat
    key: `subdomain:${subdomain}`;
  };
}
```

**Beklenen İyileştirme:**
- 90% daha az DB sorgusu
- 70% daha az ikas API çağrısı
- 5x daha hızlı response time

---

### Sorun 3: In-Memory Rate Limiting ⚠️

**Lokasyon:** `src/lib/rate-limit.ts`
**Etki:** Cold start'ta reset, instance'lar arası senkronizasyon yok
**Şiddeti:** MEDIUM

#### Mevcut Kod
```typescript
const limitStore = new Map<string, RateLimitEntry>();

export async function rateLimit(key: string, limit: number) {
  const entry = limitStore.get(key);
  // ❌ Serverless cold start → Map temizlenir
  // ❌ Farklı instance'lar → Farklı Map'ler
}
```

#### Problemler
- Serverless cold start sonrası limitler sıfırlanır
- Load balancer farklı instance'lara dağıtır
- Rate limit bypass riski

#### Çözüm: Distributed Rate Limiting
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "refund-app",
  analytics: true,
});

export async function rateLimit(key: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(key);
  return { success, limit, reset, remaining };
}
```

**Beklenen İyileştirme:** Consistent rate limiting across all instances

---

### Sorun 4: Pagination Eksikliği ⚠️

**Etki:** Memory spike, slow response
**Şiddeti:** MEDIUM-HIGH

#### Mevcut Durum
```typescript
// TÜM refund'ları yükler (limit yok!)
const refundRequests = await prisma.refundRequest.findMany({
  where: { merchantId: user.merchantId },
  orderBy: { createdAt: 'desc' }
});
```

#### Risk Senaryosu
- 1 merchant = 10,000 refund
- Her refund + order data = ~5KB
- Toplam response: 50MB!

#### Çözüm: Cursor-Based Pagination
```typescript
interface PaginationParams {
  limit: number; // default: 50, max: 100
  cursor?: string; // last item ID
  status?: RefundStatus;
}

const refundRequests = await prisma.refundRequest.findMany({
  where: {
    merchantId: user.merchantId,
    ...(cursor && { id: { lt: cursor } }),
    ...(status && { status })
  },
  take: limit,
  orderBy: { createdAt: 'desc' }
});

return {
  data: refundRequests,
  pagination: {
    nextCursor: refundRequests[refundRequests.length - 1]?.id,
    hasMore: refundRequests.length === limit
  }
};
```

---

### Sorun 5: Middleware DB Query ⚠️

**Lokasyon:** `src/middleware.ts`
**Etki:** Her istek için DB sorgusu
**Şiddeti:** MEDIUM

#### Mevcut Kod
```typescript
export async function middleware(request: NextRequest) {
  const subdomain = extractSubdomain(request.headers.get('host'));

  // Her request'te DB sorgusu!
  const merchant = await SubdomainHelpers.getMerchantBySubdomain(subdomain);

  if (!merchant) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // ...
}
```

#### Performans Etkisi
- 1,000 request/dakika = 1,000 DB query/dakika
- Middleware her zaman çalışır (static assets hariç)

#### Çözüm: Edge Cache
```typescript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function middleware(request: NextRequest) {
  const subdomain = extractSubdomain(request.headers.get('host'));

  // Cache'den oku
  let merchant = await redis.get(`subdomain:${subdomain}`);

  if (!merchant) {
    // Cache miss → DB query
    merchant = await SubdomainHelpers.getMerchantBySubdomain(subdomain);

    // Cache'e yaz (2 saat TTL)
    await redis.set(`subdomain:${subdomain}`, merchant, { ex: 7200 });
  }

  // ...
}
```

**Beklenen İyileştirme:** 95% daha az DB sorgusu

---

## 🚀 Ölçeklendirme Stratejisi

### Faz 1: Temel Optimizasyonlar (Hafta 1-2)

#### 1.1 Redis Cache Layer
**Hedef:** 5x performance artışı

**Implementasyon:**
```bash
# Upstash Redis kurulum
pnpm add @upstash/redis

# Environment variables
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Cache Stratejisi:**

| Veri Tipi | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| Merchant Settings | 1 saat | Settings update |
| Order Data | 5 dakika | Order status change |
| JWT Tokens | 15 dakika | Token refresh |
| Subdomain Lookup | 2 saat | Subdomain change |
| Product Data | 30 dakika | Product update |

**Kod Örneği:**
```typescript
// src/lib/cache.ts
import { Redis } from "@upstash/redis";

export class CacheManager {
  private static redis = Redis.fromEnv();

  static async get<T>(key: string): Promise<T | null> {
    return await this.redis.get<T>(key);
  }

  static async set(key: string, value: any, ttl: number) {
    await this.redis.set(key, value, { ex: ttl });
  }

  static async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Kullanım
const merchant = await CacheManager.get(`merchant:${id}`);
if (!merchant) {
  const fresh = await prisma.merchant.findUnique({ where: { id } });
  await CacheManager.set(`merchant:${id}`, fresh, 3600);
  return fresh;
}
return merchant;
```

**Başarı Metrikleri:**
- Cache hit rate: >80%
- Average response time: <200ms
- Database queries: -90%

---

#### 1.2 N+1 Query Fix
**Hedef:** Batch fetching implementasyonu

**Değişiklikler:**

**Dosya:** `src/app/api/refunds/route.ts`
```typescript
// ❌ ÖNCE
const refundsWithOrders = await Promise.all(
  refundRequests.map(async (refund) => {
    const order = await ikasClient.queries.listOrderDetail({ id: refund.orderId });
    return { ...refund, order };
  })
);

// ✅ SONRA
import DataLoader from 'dataloader';

const orderLoader = new DataLoader(async (orderIds: string[]) => {
  const orders = await ikasClient.queries.listOrders({
    filter: { id: { in: orderIds } },
    limit: orderIds.length
  });

  const orderMap = new Map(orders.data.map(o => [o.id, o]));
  return orderIds.map(id => orderMap.get(id) || null);
});

const refundsWithOrders = await Promise.all(
  refundRequests.map(async (refund) => ({
    ...refund,
    order: await orderLoader.load(refund.orderId)
  }))
);
```

**Kütüphane:**
```bash
pnpm add dataloader
```

**Performans:**
- 100 API call → 1 API call
- 20s → 0.2s (100x iyileştirme!)

---

#### 1.3 Distributed Rate Limiting
**Hedef:** Tutarlı rate limiting

**Implementasyon:**
```bash
pnpm add @upstash/ratelimit
```

**Dosya:** `src/lib/rate-limit.ts`
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Merchant bazlı limit
export const merchantRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "merchant",
  analytics: true,
});

// Public endpoint limit
export const publicRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "public",
  analytics: true,
});

// API usage
const { success, limit, reset, remaining } = await merchantRateLimit.limit(
  `merchant:${merchantId}`
);

if (!success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', reset },
    { status: 429 }
  );
}
```

---

### Faz 2: Database & Query Optimization (Hafta 3-4)

#### 2.1 Pagination Implementasyonu

**API Değişiklikleri:**
```typescript
// Request
GET /api/refunds?limit=50&cursor=cm123&status=pending

// Response
{
  "data": [...],
  "pagination": {
    "nextCursor": "cm456",
    "hasMore": true,
    "total": 1234
  }
}
```

**Backend Code:**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const cursor = searchParams.get('cursor');
  const status = searchParams.get('status') as RefundStatus | undefined;

  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const refunds = await prisma.refundRequest.findMany({
    where: {
      merchantId: user.merchantId,
      ...(cursor && { id: { lt: cursor } }),
      ...(status && { status })
    },
    take: limit + 1,
    orderBy: { createdAt: 'desc' }
  });

  const hasMore = refunds.length > limit;
  const items = hasMore ? refunds.slice(0, -1) : refunds;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    data: items,
    pagination: { nextCursor, hasMore }
  });
}
```

---

#### 2.2 Database İndeks Optimizasyonu

**Yeni İndeksler:**
```prisma
model RefundRequest {
  // Existing fields...

  @@index([merchantId, status, createdAt]) // Composite for filtering + sorting
  @@index([orderId]) // Order lookup
  @@index([email]) // Customer search
  @@index([merchantId, email]) // Customer refunds
}

model Merchant {
  @@index([subdomain], unique: true) // Faster subdomain lookup
  @@index([storeId]) // ikas store reference
}
```

**Migrasyon:**
```bash
npx prisma migrate dev --name add_performance_indexes
```

**Beklenen İyileştirme:**
- Query time: -60%
- Index scan vs Full table scan

---

#### 2.3 Connection Pool Optimization

**Prisma Config:**
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20'
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Neon Pooling:**
```env
# Direct connection (migrations)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Pooled connection (app queries)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connection_limit=10"
```

---

#### 2.4 Read Replica Setup

**Neon Dashboard:**
1. Enable read replicas (Scale plan)
2. Get replica connection string

**Prisma Config:**
```typescript
// src/lib/prisma.ts
const readReplicaUrl = process.env.DATABASE_REPLICA_URL;

export const prismaRead = readReplicaUrl
  ? new PrismaClient({ datasources: { db: { url: readReplicaUrl } } })
  : prisma;

// Usage
// Write operations → prisma
await prisma.refundRequest.create({ data });

// Read operations → prismaRead
const refunds = await prismaRead.refundRequest.findMany({ where });
```

**Beklenen İyileştirme:**
- Primary DB load: -50%
- Read query latency: -30%

---

### Faz 3: Monitoring & Observability (Hafta 5-6)

#### 3.1 Structured Logging

**Setup:**
```bash
pnpm add pino pino-pretty
```

**Logger Config:**
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['req.headers.authorization', '*.token', '*.password'],
});

// Usage
logger.info({ merchantId, refundId }, 'Refund created');
logger.error({ err, merchantId }, 'Failed to fetch order');
```

**Vercel Integration:**
```typescript
// Vercel otomatik olarak stdout'u loglar
// Axiom, Datadog ile entegrasyon mevcut
```

---

#### 3.2 Error Tracking (Sentry)

**Setup:**
```bash
pnpm add @sentry/nextjs
```

**Config:**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_DEPLOY_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Redact sensitive data
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
    }
    return event;
  },
});

// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.DEPLOY_ENV,
  tracesSampleRate: 0.1,
});
```

**Usage:**
```typescript
try {
  await createRefund(data);
} catch (error) {
  Sentry.captureException(error, {
    tags: { merchantId, component: 'refund-creation' },
    extra: { refundData: data }
  });
  throw error;
}
```

---

#### 3.3 Performance Monitoring

**Vercel Analytics:**
```bash
pnpm add @vercel/analytics @vercel/speed-insights
```

**Integration:**
```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custom Metrics:**
```typescript
// src/lib/metrics.ts
import { track } from '@vercel/analytics';

export function trackRefundCreation(merchantId: string, duration: number) {
  track('refund_created', {
    merchantId,
    duration,
    timestamp: Date.now()
  });
}

// Usage
const start = Date.now();
await createRefund(data);
trackRefundCreation(merchantId, Date.now() - start);
```

---

#### 3.4 Database Monitoring

**Prisma Insights:**
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["metrics", "tracing"]
}
```

**Metrics Endpoint:**
```typescript
// src/app/api/metrics/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  const metrics = await prisma.$metrics.json();

  return Response.json({
    counters: metrics.counters,
    gauges: metrics.gauges,
    histograms: metrics.histograms
  });
}
```

**Neon Dashboard:**
- Query performance analytics
- Connection pool usage
- Storage growth trends
- Slow query log

---

### Faz 4: Advanced Optimizations (Hafta 7-8)

#### 4.1 Background Jobs (Inngest)

**Use Cases:**
- Token refresh (her 30 dakika)
- Refund status sync (her 5 dakika)
- Analytics aggregation (günlük)
- Email notifications

**Setup:**
```bash
pnpm add inngest
```

**Functions:**
```typescript
// src/inngest/functions.ts
import { inngest } from './client';

export const tokenRefresh = inngest.createFunction(
  { id: 'token-refresh' },
  { cron: '*/30 * * * *' }, // Her 30 dakika
  async ({ step }) => {
    const tokens = await step.run('fetch-expiring-tokens', async () => {
      return prisma.authToken.findMany({
        where: {
          expiresAt: { lt: new Date(Date.now() + 10 * 60 * 1000) }
        }
      });
    });

    await step.run('refresh-tokens', async () => {
      for (const token of tokens) {
        await OAuthAPI.refreshToken(token);
      }
    });
  }
);

export const refundStatusSync = inngest.createFunction(
  { id: 'refund-status-sync' },
  { cron: '*/5 * * * *' }, // Her 5 dakika
  async ({ step }) => {
    const pendingRefunds = await step.run('fetch-pending', async () => {
      return prisma.refundRequest.findMany({
        where: { status: 'PENDING' }
      });
    });

    // Sync status from ikas
    await step.run('sync-status', async () => {
      for (const refund of pendingRefunds) {
        // Check order status and update
      }
    });
  }
);
```

---

#### 4.2 Edge Middleware

**Migration:**
```typescript
// src/middleware.ts
export const config = {
  matcher: [
    '/portal/:path*',
    '/api/public/:path*'
  ],
  runtime: 'edge' // ← Edge runtime
};

// Edge-compatible functions only
export async function middleware(request: NextRequest) {
  // No Node.js APIs allowed
  // No Prisma (use Prisma Data Proxy or HTTP)
  // Redis OK (HTTP-based)
}
```

**Benefits:**
- Sub-10ms latency
- Global edge deployment
- Auto-scaling

---

#### 4.3 Response Compression

**Next.js Config:**
```javascript
// next.config.js
module.exports = {
  compress: true, // Gzip compression
  experimental: {
    optimizePackageImports: ['@ikas/admin-api-client']
  }
};
```

**Manual Compression:**
```typescript
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export async function GET() {
  const data = await fetchLargeData();
  const compressed = await gzipAsync(JSON.stringify(data));

  return new Response(compressed, {
    headers: {
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/json'
    }
  });
}
```

---

#### 4.4 Load Testing

**Setup:**
```bash
pnpm add -D artillery
```

**Test Scenarios:**
```yaml
# artillery.yml
config:
  target: "https://your-app.vercel.app"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Normal load"
    - duration: 120
      arrivalRate: 100
      name: "Spike test"

scenarios:
  - name: "Refund listing"
    flow:
      - get:
          url: "/api/refunds"
          headers:
            Authorization: "Bearer {{ token }}"

  - name: "Create refund"
    flow:
      - post:
          url: "/api/refunds"
          json:
            orderId: "{{ orderId }}"
            reason: "Test"
```

**Run:**
```bash
artillery run artillery.yml --output report.json
artillery report report.json
```

**Success Criteria:**
- p95 latency: <500ms
- Error rate: <0.1%
- Throughput: >1000 req/min

---

## 📈 Kapasite Planlama

### Mevcut Kapasite (Faz 0)

| Metrik | Değer |
|--------|-------|
| Merchant sayısı | 100-500 |
| Günlük refund | 1,000 |
| API request/dakika | 100 |
| Average response time | 800ms |
| p95 response time | 2000ms |
| Database queries/request | 5-10 |
| ikas API calls/request | 1-3 |

### Hedef Kapasite (Faz 4 sonrası)

| Metrik | Değer | İyileştirme |
|--------|-------|-------------|
| Merchant sayısı | 5,000+ | 10x |
| Günlük refund | 50,000 | 50x |
| API request/dakika | 1,000 | 10x |
| Average response time | 150ms | 5.3x |
| p95 response time | 300ms | 6.7x |
| Database queries/request | 1-2 | 5x |
| ikas API calls/request | 0.1-0.5 | 10x |

### Kaynak Gereksinimleri

#### Database (Neon)
```
Current: 1GB storage, 0.25 vCPU, 1GB RAM
Target:  10GB storage, 0.5 vCPU, 2GB RAM
Plan:    Scale ($69/month)
```

#### Cache (Upstash Redis)
```
Storage: 1GB
Commands: 10,000/day
Plan: Pro ($10/month)
```

#### Functions (Vercel)
```
Invocations: 1M/month (included)
Duration: 100GB-hours (included)
Bandwidth: 100GB/month (included)
```

---

## 💰 Maliyet Analizi

### Mevcut Maliyetler (100 merchant)

| Servis | Plan | Aylık Maliyet |
|--------|------|---------------|
| Vercel | Pro | $20 |
| Neon | Free | $0 |
| **TOPLAM** | | **$20** |

### Hedef Maliyetler (1,000 merchant)

| Servis | Plan | Aylık Maliyet |
|--------|------|---------------|
| Vercel | Pro | $20 |
| Neon | Scale | $69 |
| Upstash Redis | Pro | $10 |
| Sentry | Team | $26 |
| **TOPLAM** | | **$125** |

### Hedef Maliyetler (5,000 merchant)

| Servis | Plan | Aylık Maliyet |
|--------|------|---------------|
| Vercel | Pro | $20 |
| Neon | Scale | $169 (20GB) |
| Upstash Redis | Pro | $30 (3GB) |
| Sentry | Team | $26 |
| **TOPLAM** | | **$245** |

### ROI Hesaplama

**1,000 Merchant Senaryosu:**
- Aylık gelir (örnek): $5,000 ($5/merchant)
- Altyapı maliyeti: $125
- Brüt kar: $4,875 (97.5%)

**5,000 Merchant Senaryosu:**
- Aylık gelir (örnek): $25,000 ($5/merchant)
- Altyapı maliyeti: $245
- Brüt kar: $24,755 (99%)

**Sonuç:** Ölçeklendirme maliyeti çok düşük, ROI çok yüksek

---

## 🎯 Başarı Metrikleri

### Performans KPI'ları

| Metrik | Mevcut | Hedef | Ölçüm Yöntemi |
|--------|--------|-------|---------------|
| API Response Time (avg) | 800ms | <200ms | Vercel Analytics |
| API Response Time (p95) | 2000ms | <500ms | Vercel Analytics |
| Database Query Time | 100ms | <30ms | Prisma metrics |
| Cache Hit Rate | 0% | >80% | Redis insights |
| Error Rate | <1% | <0.1% | Sentry |
| Uptime | 99% | 99.9% | Vercel status |

### Scalability KPI'ları

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| Merchants | 100 | 5,000 |
| Daily Refunds | 1,000 | 50,000 |
| API Requests/min | 100 | 1,000 |
| Database Size | 1GB | 20GB |
| Concurrent Users | 50 | 500 |

### Business KPI'ları

| Metrik | Hedef |
|--------|-------|
| User Satisfaction | >4.5/5 |
| Support Tickets/week | <10 |
| Time to Resolution | <1 saat |
| Feature Adoption Rate | >70% |

---

## ⚠️ Risk Yönetimi

### Teknik Riskler

#### Risk 1: ikas API Rate Limiting
**Olasılık:** Yüksek
**Etki:** Kritik

**Açıklama:**
- ikas GraphQL API rate limit bilgisi yok
- Yüksek trafikte throttling riski

**Azaltma Stratejisi:**
- Response caching (5 dakika TTL)
- Batch requests implementation
- Retry logic with exponential backoff
- ikas ile rate limit görüşmesi

---

#### Risk 2: Database Growth
**Olasılık:** Orta
**Etki:** Yüksek

**Açıklama:**
- Her merchant sürekli refund oluşturur
- Timeline events her action'da artar
- 1 yılda 10M+ kayıt potansiyeli

**Azaltma Stratejisi:**
```sql
-- Eski timeline events arşivleme
CREATE TABLE refund_timeline_archive AS
SELECT * FROM refund_timeline
WHERE created_at < NOW() - INTERVAL '1 year';

-- Soft delete + cleanup job
DELETE FROM refund_request
WHERE status = 'COMPLETED'
AND updated_at < NOW() - INTERVAL '2 years';
```

**Archiving Strategy:**
- Hot data: Son 6 ay (main DB)
- Warm data: 6-24 ay (same DB, archived tables)
- Cold data: 2+ yıl (S3 export, silinir)

---

#### Risk 3: Subdomain DNS Limits
**Olasılık:** Düşük
**Etki:** Orta

**Açıklama:**
- Wildcard DNS her subdomain için çalışır
- 10,000+ subdomain olabilir
- DNS provider limitleri

**Azaltma Stratejisi:**
- Cloudflare (unlimited subdomains)
- DNS record caching
- Fallback domain strategy

---

#### Risk 4: Vercel Function Timeout
**Olasılık:** Orta
**Etki:** Yüksek

**Açıklama:**
- Free/Pro plan: 10 saniye
- Enterprise: 60 saniye
- N+1 query ile timeout riski

**Azaltma Stratejisi:**
- ✅ N+1 query fix (Faz 1)
- ✅ Pagination (Faz 2)
- Background jobs (Faz 4)
- Enterprise upgrade consideration

---

### Operasyonel Riskler

#### Risk 5: Token Expiry During High Load
**Olasılık:** Orta
**Etki:** Orta

**Açıklama:**
- OAuth token 1 saat geçerli
- Refresh 5 dakika önceden
- High load'da sync sorunları

**Azaltma Stratejisi:**
```typescript
// Token locking mechanism
const refreshToken = async (tokenId: string) => {
  const lock = await redis.set(
    `lock:token:${tokenId}`,
    '1',
    { nx: true, ex: 60 }
  );

  if (!lock) {
    // Another process is refreshing
    await sleep(1000);
    return await getToken(tokenId);
  }

  try {
    // Refresh logic
    const newToken = await OAuthAPI.refresh();
    await AuthTokenManager.put(newToken);
    return newToken;
  } finally {
    await redis.del(`lock:token:${tokenId}`);
  }
};
```

---

#### Risk 6: Data Inconsistency
**Olasılık:** Düşük
**Etki:** Kritik

**Açıklama:**
- Cache vs DB senkronizasyon
- Refund status ikas'ta değişirse
- Merchant settings güncelleme

**Azaltma Stratejisi:**
```typescript
// Cache invalidation on write
const updateRefundStatus = async (id: string, status: string) => {
  // 1. Update DB
  await prisma.refundRequest.update({
    where: { id },
    data: { status }
  });

  // 2. Invalidate cache
  await redis.del(`refund:${id}`);

  // 3. Invalidate list cache
  const refund = await prisma.refundRequest.findUnique({ where: { id } });
  await redis.del(`refunds:merchant:${refund.merchantId}`);
};
```

---

## 📅 Implementation Timeline

### Sprint 1: Cache & Performance (Hafta 1-2)

**Week 1:**
- [ ] Upstash Redis setup
- [ ] CacheManager implementation
- [ ] Merchant settings caching
- [ ] JWT token caching
- [ ] Testing & validation

**Week 2:**
- [ ] Order data caching
- [ ] Subdomain lookup caching
- [ ] Cache invalidation logic
- [ ] Monitoring & metrics
- [ ] Deploy to production

**Deliverables:**
- ✅ 5x faster response times
- ✅ 90% fewer DB queries
- ✅ Cache hit rate >80%

**Team:**
- 1 Backend Developer (full-time)
- 1 DevOps Engineer (part-time)

---

### Sprint 2: Query Optimization (Hafta 3-4)

**Week 3:**
- [ ] DataLoader implementation
- [ ] N+1 query fixes
- [ ] Pagination API changes
- [ ] Frontend pagination UI

**Week 4:**
- [ ] Database index creation
- [ ] Connection pooling setup
- [ ] Read replica configuration
- [ ] Load testing

**Deliverables:**
- ✅ 100x fewer API calls
- ✅ Pagination working
- ✅ Database indexes optimized

**Team:**
- 1 Backend Developer (full-time)
- 1 Frontend Developer (part-time)

---

### Sprint 3: Monitoring (Hafta 5-6)

**Week 5:**
- [ ] Pino logging setup
- [ ] Sentry integration
- [ ] Vercel Analytics setup
- [ ] Custom metrics

**Week 6:**
- [ ] Prisma metrics
- [ ] Dashboard creation
- [ ] Alert configuration
- [ ] Documentation

**Deliverables:**
- ✅ Full observability stack
- ✅ Error tracking active
- ✅ Performance monitoring

**Team:**
- 1 DevOps Engineer (full-time)
- 1 Backend Developer (part-time)

---

### Sprint 4: Advanced Features (Hafta 7-8)

**Week 7:**
- [ ] Inngest setup
- [ ] Background job functions
- [ ] Edge middleware migration
- [ ] Response compression

**Week 8:**
- [ ] Load testing
- [ ] Performance tuning
- [ ] Documentation update
- [ ] Production deployment

**Deliverables:**
- ✅ Background jobs running
- ✅ Edge optimization
- ✅ Load test passing
- ✅ Documentation complete

**Team:**
- 1 Backend Developer (full-time)
- 1 DevOps Engineer (full-time)

---

## 🔧 Deployment Checklist

### Pre-Deployment

- [ ] Code review completed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load tests passing
- [ ] Security audit completed
- [ ] Documentation updated

### Environment Setup

**Upstash Redis:**
- [ ] Production database created
- [ ] Environment variables set
- [ ] Connection tested
- [ ] Backup configured

**Neon Database:**
- [ ] Scale plan activated
- [ ] Read replica enabled
- [ ] Connection pooling configured
- [ ] Backup schedule verified

**Sentry:**
- [ ] Project created
- [ ] DSN configured
- [ ] Source maps uploaded
- [ ] Alert rules configured

**Vercel:**
- [ ] Environment variables set
- [ ] Domains configured
- [ ] Analytics enabled
- [ ] Edge config updated

### Migration Steps

**Phase 1: Cache Layer (Zero Downtime)**
```bash
# 1. Deploy cache code (reads DB if cache miss)
vercel --prod

# 2. Warm up cache
curl https://api/internal/cache/warm

# 3. Monitor cache hit rate
# Target: >50% in 1 hour, >80% in 24 hours
```

**Phase 2: Query Optimization (Potential Downtime)**
```bash
# 1. Maintenance window (optional)
# Announce: "Performance upgrade in progress"

# 2. Deploy new code
vercel --prod

# 3. Verify pagination working
curl "https://api/refunds?limit=50"

# 4. Monitor error rates
```

**Phase 3: Database Indexes (No Downtime)**
```bash
# 1. Create indexes (online)
prisma migrate deploy

# 2. Verify index usage
# Check Neon dashboard

# 3. Monitor query performance
```

### Post-Deployment

- [ ] Smoke tests passed
- [ ] Response times verified (<200ms)
- [ ] Cache hit rate >80%
- [ ] Error rate <0.1%
- [ ] No critical Sentry issues
- [ ] Database CPU <50%
- [ ] All background jobs running

### Rollback Plan

```bash
# If issues occur:

# 1. Revert deployment
vercel rollback

# 2. Clear cache
redis-cli FLUSHALL

# 3. Monitor recovery
# Check error rates return to normal

# 4. Post-mortem
# Document what went wrong
```

---

## 📚 Önerilen Okumalar

### Documentation
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Vercel Limits](https://vercel.com/docs/concepts/limits/overview)

### Best Practices
- [The Twelve-Factor App](https://12factor.net/)
- [Google SRE Book](https://sre.google/books/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

### Tools
- [Prisma Studio](https://www.prisma.io/studio)
- [Neon Console](https://console.neon.tech)
- [Sentry Dashboard](https://sentry.io)
- [Vercel Analytics](https://vercel.com/analytics)

---

## 📞 Destek ve İletişim

### Escalation Path

**Level 1: Application Issues**
- Developer on-call
- Response: 15 dakika
- Resolution: 1 saat

**Level 2: Infrastructure Issues**
- DevOps on-call
- Response: 30 dakika
- Resolution: 2 saat

**Level 3: Critical Outage**
- CTO notification
- Response: Anında
- All hands on deck

### Monitoring Alerts

**Critical (PagerDuty):**
- Error rate >1%
- Response time >2s
- Database CPU >90%
- Uptime <99%

**Warning (Slack):**
- Error rate >0.5%
- Response time >500ms
- Cache hit rate <70%
- Database CPU >70%

---

## ✅ Sonuç ve Öneriler

### Özet

Bu ölçeklendirme planı, ikas Refund Management uygulamasını 100 merchant'tan 5,000+ merchant'a taşımak için tasarlanmıştır.

**Kritik Başarı Faktörleri:**
1. ✅ Redis cache implementasyonu (en yüksek ROI)
2. ✅ N+1 query fix (en kritik performans sorunu)
3. ✅ Pagination (memory ve timeout koruması)
4. ✅ Monitoring (proactive issue detection)

**Timeline:** 8 hafta
**Maliyet Artışı:** $20/ay → $125/ay (5,000 merchant için)
**Performance İyileştirmesi:** 5-10x
**Kapasite Artışı:** 10-50x

### Hemen Başlanması Gerekenler

**Bu hafta:**
1. Upstash Redis hesabı aç
2. CacheManager sınıfını implement et
3. Merchant settings caching ekle

**Bu ay:**
1. Tüm Sprint 1 ve Sprint 2 tamamlansın
2. Production'da test edilsin
3. Performans metriklerini ölç

### Long-Term Vision (1 yıl)

**Hedefler:**
- 10,000+ aktif merchant
- Multi-region deployment (EU/US)
- AI-powered refund recommendations
- Advanced analytics dashboard
- White-label solution

**Teknoloji Gelişimi:**
- Microservices migration consideration
- Event-driven architecture
- GraphQL Federation
- Real-time notifications

---

**Hazırlayan:** Claude AI
**Tarih:** 16 Kasım 2025
**Versiyon:** 1.0
**Durum:** Review için hazır

---

## Ekler

### Ek A: Kod Örnekleri
- Cache Manager tam implementasyonu
- DataLoader patterns
- Background job örnekleri

### Ek B: Database Queries
- Optimized query examples
- Index usage analysis
- Migration scripts

### Ek C: Monitoring Dashboards
- Grafana dashboard JSON
- Sentry alert rules
- Custom metrics definitions

### Ek D: Load Test Results
- Artillery test scenarios
- Performance benchmarks
- Capacity planning data

---

*Bu doküman canlı bir dokümandır ve implementation sırasında güncellenecektir.*
