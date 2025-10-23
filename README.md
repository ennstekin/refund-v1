# ikas İade Yönetim Sistemi

ikas e-ticaret platformu için geliştirilmiş kapsamlı iade yönetim ve self-service portal uygulaması. Next.js 15 App Router, OAuth, Prisma, GraphQL (codegen), Tailwind CSS ile modern ve güvenli bir altyapı üzerine kurulmuştur.

> **📚 Detaylı Dokümantasyon:** Proje geliştirme süreci, teknik detaylar ve ileriye dönük öneriler için [.docs/DEVELOPMENT_LOG.md](.docs/DEVELOPMENT_LOG.md) dosyasına bakın.
>
> **📝 Sürüm Notları:** Değişiklik geçmişi ve planlanan özellikler için [CHANGELOG.md](CHANGELOG.md) dosyasına bakın.

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
- **OAuth for ikas**: end-to-end flow (authorize → callback → session/JWT)
- **Admin GraphQL client**: `@ikas/admin-api-client` with codegen
- **Prisma ORM**: SQLite (dev) / PostgreSQL (production ready)
- **Tailwind CSS v4**: Modern ve responsive UI
- **Iron Session**: Server-side session management
- **Timeline System**: Event-based activity tracking
- **Multi-step Forms**: SessionStorage ile state management
- **Public API Endpoints**: JWT gerektirmeyen müşteri endpoint'leri

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
│  └─ token-helpers.ts                   # Token utilities
│
├─ lib/
│  ├─ api-requests.ts                    # Frontend → backend bridge
│  ├─ auth-helpers.ts                    # getUserFromRequest()
│  ├─ ikas-client/
│  │  ├─ graphql-requests.ts             # GraphQL queries/mutations
│  │  └─ generated/graphql.ts            # Generated types
│  ├─ prisma.ts                          # Prisma client
│  └─ session.ts                         # iron-session wrappers
│
└─ models/
   └─ auth-token/                        # Token management
```

### Veritabanı Modelleri (Prisma)
```
- AuthToken          # OAuth token'ları
- RefundRequest      # İade talepleri (orderId, status, reason, trackingNumber)
- RefundNote         # İade notları
- RefundTimeline     # İade event history
- Merchant           # Mağaza ayarları (portalUrl, portalEnabled)
```

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
- `onCheckToken` auto-refreshes tokens server-side.
- OAuth callback uses HMAC-SHA256 signature validation to verify authorization code authenticity before token exchange.

## 📝 License

MIT

## 🤝 Contributing

- Use Conventional Commits. Example: `feat(auth): add token refresh on client`
- Ensure type-safety and linter cleanliness.

## 📞 Support

- ikas Admin GraphQL: `https://api.myikas.com/api/v2/admin/graphql`
- File issues or questions in this repo.
