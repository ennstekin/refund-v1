# 🔄 ikas İade Yönetim Sistemi

> **Multi-tenant subdomain-based self-service refund portal for ikas e-commerce platform**

ikas e-ticaret platformu için geliştirilmiş kapsamlı iade yönetim ve self-service portal uygulaması. Next.js 15 App Router, OAuth, Prisma, GraphQL (codegen), Tailwind CSS ile modern ve güvenli bir altyapı üzerine kurulmuştur.

[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://paen.enestekin.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎉 What's New (November 13, 2025)

### Multi-Tenant Subdomain System
- **Subdomain-based portals**: Each merchant gets their own subdomain (e.g., `paen.enestekin.com`)
- **Automatic subdomain generation**: OAuth onboarding automatically creates URL-safe subdomains with Turkish character support
- **Wildcard domain support**: Configured on Vercel with `*.enestekin.com`
- **Middleware routing**: Next.js 15 Edge middleware for subdomain detection and routing

### Performance Improvements
- **10x faster portal**: Response time reduced from 30+ seconds to 3-5 seconds
- **Proactive token refresh**: Tokens refresh 5 minutes before expiry to avoid timeouts
- **Lightweight GraphQL queries**: Optimized queries with only essential fields
- **Retry mechanism**: Automatic retry with 2-second delay for transient failures

### Security Enhancements
- **Rate limiting**: IP-based rate limiting to prevent brute force attacks and DDoS
  - Portal verification: 10 requests/minute
  - Refund tracking: 20 requests/minute
- **Security logging**: Comprehensive logging for rate limit violations
- **Rate limit headers**: Standard HTTP headers (X-RateLimit-*) in responses

### Developer Experience
- **Detailed changelog**: Comprehensive documentation of all changes in [CHANGELOG_2025_11_13.md](./docs/CHANGELOG_2025_11_13.md)
- **Better error handling**: Improved error messages and user feedback
- **Vercel timeout optimization**: Increased function timeout to 30 seconds

## 📖 Dokümantasyon

| Dosya | Açıklama |
|-------|----------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Sistem mimarisi, veri akışları, teknoloji stack ve tasarım kararları |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Production deployment adımları, environment setup ve konfigürasyon |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Karşılaşılan sorunlar, çözümler ve debugging ipuçları |
| **[CHANGELOG.md](./CHANGELOG.md)** | Değişiklik geçmişi ve planlanan özellikler |
| **[docs/CHANGELOG_2025_11_13.md](./docs/CHANGELOG_2025_11_13.md)** | 13 Kasım 2025 detaylı değişiklik listesi (subdomain, performance, security) |
| **[.docs/DEVELOPMENT_LOG.md](.docs/DEVELOPMENT_LOG.md)** | Detaylı geliştirme süreci notları |

## ✨ İade Yönetim Sistemi Özellikleri

### 🛍️ Admin Panel
- **İki Sekme ile İade Yönetimi:**
  - **ikas Siparişleri:** Son 90 günde iade durumundaki siparişler (otomatik çekiliyor)
  - **Manuel Kayıtlar:** Yöneticiler tarafından manuel oluşturulan iade talepleri
- **Manuel İade Kaydı Oluşturma:**
  - Sipariş arama (numara, müşteri ismi, e-posta)
  - 7 farklı iade nedeni (Hasarlı, Yanlış, Kusurlu, vb.)
  - Kargo takip numarası girişi
  - Otomatik timeline event oluşturma
- **İade Detay Sayfası:**
  - Sipariş bilgileri ve müşteri detayları
  - Durum güncelleme (Beklemede, İşlemde, Tamamlandı, Reddedildi)
  - Not ekleme sistemi
  - Zaman çizelgesi (timeline) görüntüleme
- **Ayarlar:**
  - Portal aktif/pasif yapma
  - **Otomatik subdomain oluşturma** (örn: paen.enestekin.com)
  - Özel domain ayarlama (örn: iade.magaza.com)
  - Entegrasyon örnekleri (e-posta, web sitesi, WhatsApp/SMS)

### 🌐 Müşteri Self-Service Portalı
4 adımlı kolay iade süreci:
1. **Sipariş Doğrulama:** Sipariş numarası + e-posta ile doğrulama
2. **İade Nedeni Seçimi:** 7 farklı iade nedeni kartları
3. **Fotoğraf Yükleme:** Hasarlı/yanlış/kusurlu ürünler için (max 5 fotoğraf)
4. **İade Talimatları:** Paket nasıl gönderilir + talep gönderimi

### 🔧 Teknik Özellikler
- **Next.js 15 + App Router** with React 19 and TypeScript
- **Multi-tenant Subdomain System**: Wildcard domain support with automatic subdomain generation
- **Next.js Middleware**: Edge runtime for subdomain routing and tenant identification
- **OAuth for ikas**: end-to-end flow (authorize → callback → session/JWT)
- **Admin GraphQL client**: `@ikas/admin-api-client` with codegen
- **Prisma ORM**: SQLite (dev) / PostgreSQL (production ready)
- **Tailwind CSS v4**: Modern ve responsive UI
- **Iron Session**: Server-side session management
- **Timeline System**: Event-based activity tracking
- **Multi-step Forms**: SessionStorage ile state management
- **Public API Endpoints**: JWT gerektirmeyen müşteri endpoint'leri
- **Rate Limiting**: IP-based in-memory rate limiting for security
- **Performance Optimizations**: Proactive token refresh, lightweight queries, retry mechanism

## 📁 Project Structure

```
src/
├─ app/
│  ├─ api/
│  │  ├─ ikas/
│  │  │  ├─ get-merchant/route.ts       # Example secure API route (JWT required)
│  │  │  ├─ orders/route.ts             # Sipariş arama endpoint
│  │  │  └─ refund-orders/route.ts      # İade durumundaki siparişler (90 gün)
│  │  ├─ public/                         # JWT gerektirmeyen public endpoints
│  │  │  ├─ verify-order/route.ts       # Müşteri sipariş doğrulama
│  │  │  └─ submit-refund/route.ts      # Müşteri iade gönderimi
│  │  ├─ refunds/
│  │  │  ├─ route.ts                     # İade listesi ve oluşturma
│  │  │  └─ [id]/
│  │  │     ├─ route.ts                  # İade detay ve güncelleme
│  │  │     └─ timeline/route.ts         # İade timeline eventleri
│  │  ├─ settings/route.ts               # Mağaza ayarları
│  │  └─ oauth/
│  │     ├─ authorize/ikas/route.ts     # OAuth başlatma
│  │     └─ callback/ikas/route.ts      # OAuth callback
│  │
│  ├─ dashboard/page.tsx                 # Ana dashboard (3 navigasyon kartı)
│  ├─ refunds/
│  │  ├─ page.tsx                        # İki sekme: ikas + manuel kayıtlar
│  │  ├─ new/page.tsx                    # Manuel iade kaydı oluşturma
│  │  └─ [id]/page.tsx                   # İade detay sayfası
│  ├─ settings/page.tsx                  # Ayarlar sayfası (portal URL vb.)
│  ├─ portal/                            # Müşteri self-service portalı
│  │  ├─ page.tsx                        # Adım 1: Sipariş doğrulama
│  │  ├─ reason/page.tsx                 # Adım 2: İade nedeni seçimi
│  │  ├─ upload/page.tsx                 # Adım 3: Fotoğraf yükleme
│  │  └─ complete/page.tsx               # Adım 4: Tamamlama
│  ├─ authorize-store/page.tsx           # Manual store authorization
│  ├─ callback/page.tsx                  # OAuth callback handler
│  ├─ page.tsx                           # Entry point
│  └─ hooks/use-base-home-page.ts        # Auth/bootstrap logic
│
├─ components/
│  ├─ home-page/index.tsx                # Simple authenticated UI
│  └─ ui/*                               # shadcn/ui components
│
├─ helpers/
│  ├─ api-helpers.ts                     # getIkas(), onCheckToken()
│  ├─ jwt-helpers.ts                     # JWT create/verify
│  ├─ token-helpers.ts                   # Token utilities
│  └─ subdomain-helpers.ts               # Subdomain generation, validation, lookup
│
├─ lib/
│  ├─ api-requests.ts                    # Frontend → backend bridge
│  ├─ auth-helpers.ts                    # getUserFromRequest()
│  ├─ ikas-client/
│  │  ├─ graphql-requests.ts             # GraphQL queries/mutations
│  │  └─ generated/graphql.ts            # Generated types
│  ├─ prisma.ts                          # Prisma client
│  ├─ rate-limit.ts                      # Rate limiting utilities
│  └─ session.ts                         # iron-session wrappers
│
├─ middleware.ts                         # Next.js Edge middleware (subdomain routing)
│
└─ models/
   └─ auth-token/                        # Token management
```

### Veritabanı Modelleri (Prisma)
```
- AuthToken             # OAuth token'ları
- RefundRequest         # İade talepleri (orderId, status, reason, trackingNumber)
- RefundNote            # İade notları
- RefundTimeline        # İade event history
- Merchant              # Mağaza ayarları (subdomain, portalUrl, portalEnabled)
- RestrictedSubdomain   # Yasaklı subdomain listesi (www, api, admin, vb.)
```

## 🌐 Production

**Live URLs**:
- Main App: https://refund-v1.vercel.app
- Example Portal: https://paen.enestekin.com (subdomain-based multi-tenant portal)

**Deployment Platform**: Vercel (Serverless)
**Database**: Neon PostgreSQL
**Domain**: enestekin.com with wildcard support (*.enestekin.com)

**Deployment Status**: ✅ Aktif ve çalışıyor

> **📚 Deployment Rehberi**: Production ortamına deploy etmek için [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) dosyasına bakın.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/refund-v1)

---

## 🛠️ Setup

1) Install dependencies

```bash
pnpm install
```

2) Create env file and set variables

```bash
cp .env.example .env.local
```

Required envs (see `src/globals/config.ts`):

- `NEXT_PUBLIC_GRAPH_API_URL` — ikas Admin GraphQL URL (e.g. `https://api.myikas.com/api/v2/admin/graphql`)
- `NEXT_PUBLIC_ADMIN_URL` — ikas Admin base with `{storeName}` placeholder (e.g. `https://{storeName}.myikas.com/admin`)
- `NEXT_PUBLIC_CLIENT_ID` — your ikas app client id
- `CLIENT_SECRET` — your ikas app client secret
- `NEXT_PUBLIC_DEPLOY_URL` — public base URL of this app (e.g. `https://yourapp.example.com`)
- `SECRET_COOKIE_PASSWORD` — long random string for iron-session

3) Initialize Prisma (first run)

```bash
pnpm prisma:init
```

4) Generate GraphQL types (whenever you change `graphql-requests.ts`)

```bash
pnpm codegen
```

5) Start dev server

```bash
pnpm dev
```

Port and redirect path are also defined in `ikas.config.json`:

```json
{
  "portMapping": { "default": 3000 },
  "oauthRedirectPath": "/api/oauth/callback/ikas",
  "runCommand": "pnpm run dev"
}
```

## 📦 Scripts

- `pnpm dev` — start Next.js in dev
- `pnpm build` — build production
- `pnpm start` — start production server
- `pnpm lint` — run ESLint
- `pnpm codegen` — GraphQL Codegen using `src/lib/ikas-client/codegen.ts`
- `pnpm prisma:init` — generate client and push schema to local DB
- `pnpm prisma:migrate` — create/apply migrations
- `pnpm prisma:generate` — regenerate Prisma client
- `pnpm prisma:studio` — open Prisma Studio
- `pnpm apply:ai-rules` — apply Ruler agent configs

## 🌍 Multi-Tenant Subdomain System

### How It Works

The application uses a subdomain-based multi-tenant architecture where each merchant gets their own subdomain:

1. **Automatic Generation**: When a merchant completes OAuth onboarding, a subdomain is automatically generated from their store name
   - Example: "Paen Mağazası" → `paen.enestekin.com`
   - Turkish character support: "Çiçek Dünyası" → `cicek-dunyasi.enestekin.com`
   - Conflict resolution: If subdomain exists, appends number (`paen-2.enestekin.com`)

2. **Middleware Routing**: Next.js Edge middleware detects subdomains and routes requests
   - System subdomains pass through: `www`, `api`, `admin`, `app`, `dashboard`
   - Tenant subdomains redirect root (`/`) to `/portal`
   - Adds `x-subdomain` header for downstream processing

3. **Wildcard DNS**: Vercel configured with `*.enestekin.com` to handle all subdomains

4. **Database Schema**:
   ```typescript
   model Merchant {
     subdomain            String?   @unique
     subdomainStatus      String    @default("pending") // pending, active
     subdomainChangedAt   DateTime?
     subdomainChangeCount Int       @default(0)
   }
   ```

### SubdomainHelpers API

```typescript
// Generate URL-safe subdomain from store name
const subdomain = await SubdomainHelpers.generateSubdomain("Paen Mağazası");
// Returns: "paen"

// Check if subdomain is available
const available = await SubdomainHelpers.isSubdomainAvailable("paen");
// Returns: true/false

// Get merchant ID from subdomain
const merchantId = await SubdomainHelpers.getMerchantBySubdomain("paen");
// Returns: merchantId or null

// Build full portal URL
const url = SubdomainHelpers.buildPortalUrl("paen");
// Returns: "https://paen.enestekin.com"
```

### Security Architecture

1. **Middleware Layer** (Edge Runtime):
   - Detects subdomain from `Host` header
   - Validates against system subdomains
   - Adds headers for tenant identification
   - No database calls (Edge runtime limitation)

2. **API Layer** (Serverless Functions):
   - Reads `x-subdomain` header from middleware
   - Performs database lookup for merchant
   - Validates subdomain status (`active` only)
   - Rate limiting per IP address

3. **Database Layer**:
   - Unique subdomain constraint
   - Subdomain status tracking
   - Restricted subdomain table for blocked names

## 🔐 OAuth Flow

- User starts at `/` which runs `use-base-home-page`:
  - If embedded (iFrame) and a valid token exists via `TokenHelpers.getTokenForIframeApp()`, redirect to `/dashboard`.
  - Otherwise, if `storeName` is present in query, redirect to `/api/oauth/authorize/ikas?storeName=...`.
  - Else route to `/authorize-store` where user enters store name.

- `GET /api/oauth/authorize/ikas` validates `storeName`, sets `state` in session, and redirects to ikas authorize URL.
- `GET /api/oauth/callback/ikas` validates the `signature` parameter using HMAC-SHA256 (via `TokenHelpers.validateCodeSignature`), optionally validates `state` for CSRF protection, exchanges `code` for tokens, fetches `getMerchant` and `getAuthorizedApp`, upserts token via `AuthTokenManager`, sets session, builds a short-lived JWT via `JwtHelpers.createToken`, and redirects to `/callback?...`.
- `/callback` (client) reads `token`, `redirectUrl`, `authorizedAppId`, stores token in `sessionStorage`, then redirects back to Admin.

### OAuth Callback Security
The OAuth callback endpoint requires a `signature` query parameter to validate the authorization code:
- **Signature Generation**: `HMAC-SHA256(code, clientSecret)` in hex format
- **Validation**: `TokenHelpers.validateCodeSignature(code, signature, clientSecret)`
- **State Parameter**: Optional but recommended for additional CSRF protection

## 🔑 Auth and API Calls

- Browser obtains JWT via AppBridge or OAuth callback and stores it in `sessionStorage`.
- Frontend calls backend routes with `Authorization: JWT <token>`.
- Example backend route: `GET /api/ikas/get-merchant` uses `getUserFromRequest()` to extract `merchantId` and `authorizedAppId`, loads the stored token via `AuthTokenManager`, creates GraphQL client with `getIkas()`, then calls `ikasClient.queries.getMerchant()`.

Frontend bridge (`src/lib/api-requests.ts`):

```ts
ApiRequests.ikas.getMerchant(token) // -> GET /api/ikas/get-merchant
```

## 🧠 GraphQL Workflow (ikas Admin)

- Define documents in `src/lib/ikas-client/graphql-requests.ts` using `gql`:

```ts
export const GET_MERCHANT = gql`
  query getMerchant { getMerchant { id email storeName } }
`;
```

- Run `pnpm codegen` to regenerate `src/lib/ikas-client/generated/graphql.ts`.
- Create client via `getIkas(token)` which auto-refreshes tokens in `onCheckToken`.
- Use: `ikasClient.queries.getMerchant()` or `ikasClient.mutations.someMutation(vars)`.

MCP guidance (required before adding new ops):
- Discover operation with ikas MCP list, then introspect shape.
- Add to `graphql-requests.ts`, then run `pnpm codegen`.

## ⚡ Performance Optimizations

The system has been optimized for performance with the following improvements:

### Token Management
- **Proactive Token Refresh**: Tokens are refreshed 5 minutes BEFORE expiry (not after)
- **Cached Token Checks**: Reduces API calls during high-traffic periods
- **Token expiry calculation**:
  ```typescript
  const fiveMinutesBeforeExpiry = expireDate.getTime() - (5 * 60 * 1000);
  if (now.getTime() >= fiveMinutesBeforeExpiry) {
    // Refresh token proactively
  }
  ```

### GraphQL Query Optimization
- **Lightweight Queries**: Portal uses minimal field queries (7 fields instead of 20+)
- **Pagination**: All list queries use pagination limits
- **Example optimized query**:
  ```graphql
  query verifyOrder($orderNumber: StringFilterInput, $pagination: PaginationInput) {
    listOrder(orderNumber: $orderNumber, pagination: $pagination) {
      data {
        id
        orderNumber
        totalFinalPrice
        currencySymbol
        orderedAt
        customer { email firstName lastName }
      }
    }
  }
  ```

### Database Optimization
- **Simplified Merchant Lookup**: Single query instead of multiple joins
- **Indexed Fields**: Unique indexes on `subdomain`, `orderId` for fast lookups
- **Connection Pooling**: Prisma connection pooling for Neon PostgreSQL

### Error Handling
- **Retry Mechanism**: Automatic retry with 2-second delay for transient failures
- **Timeout Configuration**: Vercel function timeout increased to 30 seconds
- **Graceful Degradation**: User-friendly error messages with retry suggestions

### Performance Results
- Portal response time: **30+ seconds → 3-5 seconds** (10x improvement)
- Token refresh overhead: **Eliminated during peak requests**
- Database query time: **Reduced by 60%** with optimized queries

## 🗃️ Database (Prisma)

- Local SQLite DB located under `prisma/dev.db` with schema managed by `schema.prisma`.
- `AuthTokenManager` persists tokens (`models/auth-token/*`).
- Use Prisma Studio to inspect tokens:

```bash
pnpm prisma:studio
```

## 🧩 UI and Styling

- Tailwind v4 with CSS file at `src/app/globals.css`.
- shadcn/ui components under `src/components/ui/*`.

## 🧰 MCP Helpers

- UI scaffolding: use shadcn MCP to fetch components/demos and place under `src/components/ui/*`.
- ikas GraphQL: use ikas MCP list + introspect before adding operations.

## 🔒 Security

- Never log secrets or tokens. Do not expose access/refresh tokens to the client.
- Use the short-lived JWT for browser → server auth; server uses stored OAuth tokens.
- `onCheckToken` auto-refreshes tokens server-side (5 minutes before expiry).
- OAuth callback uses HMAC-SHA256 signature validation to verify authorization code authenticity before token exchange.
- **Rate Limiting**: IP-based rate limiting on public endpoints to prevent abuse:
  - Order verification: 10 requests/minute per IP
  - Refund tracking: 20 requests/minute per IP
  - Rate limit headers included in responses (X-RateLimit-*)
  - Security logging for rate limit violations
- **Multi-tenant isolation**: Subdomain-based tenant identification with database-level isolation

## 📝 License

MIT

## 🤝 Contributing

- Use Conventional Commits. Example: `feat(auth): add token refresh on client`
- Ensure type-safety and linter cleanliness.

## 📞 Support

- ikas Admin GraphQL: `https://api.myikas.com/api/v2/admin/graphql`
- File issues or questions in this repo.
