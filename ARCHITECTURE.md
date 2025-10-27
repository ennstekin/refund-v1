# iKAS İade Yönetim Sistemi - Mimari Dokümantasyon

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Teknoloji Stack](#teknoloji-stack)
3. [Sistem Mimarisi](#sistem-mimarisi)
4. [Veri Akışı](#veri-akışı)
5. [Veritabanı Şeması](#veritabanı-şeması)
6. [API Endpoints](#api-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Multi-Tenant Yapı](#multi-tenant-yapı)

---

## 🎯 Genel Bakış

Bu proje, iKAS e-ticaret platformu için geliştirilmiş **Multi-Tenant** bir iade yönetim sistemidir. Sistem iki ana kullanıcı grubuna hizmet verir:

1. **Mağaza Yöneticileri**: iKAS admin paneli içinde çalışan dashboard üzerinden iade taleplerini yönetir
2. **Müşteriler**: Public portal üzerinden self-service iade talebi oluşturur

### Temel Özellikler
- ✅ Multi-tenant SaaS mimarisi (tek deployment, çoklu mağaza)
- ✅ OAuth 2.0 ile iKAS entegrasyonu
- ✅ Self-service müşteri portalı
- ✅ Manuel iade oluşturma
- ✅ iKAS sipariş senkronizasyonu
- ✅ Real-time durum takibi
- ✅ Timeline ve not sistemi

---

## 🛠 Teknoloji Stack

### Frontend
- **Next.js 15** - App Router ile modern React framework
- **React 19** - UI kütüphanesi
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database client
- **Iron Session** - Encrypted cookie-based sessions
- **@ikas/admin-api-client** - iKAS GraphQL client
- **GraphQL Code Generator** - Auto-generate TypeScript types

### Database
- **PostgreSQL** - Relational database
- **Neon** - Serverless Postgres hosting

### External Services
- **iKAS Admin API** - GraphQL API for e-commerce operations
- **iKAS OAuth 2.0** - Authentication and authorization
- **Vercel** - Deployment and hosting platform

---

## 🏗 Sistem Mimarisi

### High-Level Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│                          VERCEL DEPLOYMENT                          │
│                         (Multi-Tenant SaaS)                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
         ┌──────────▼─────────┐        ┌─────────▼──────────┐
         │   iKAS Admin UI    │        │   Public Portal    │
         │    (Iframe App)    │        │  (Self-Service)    │
         └──────────┬─────────┘        └─────────┬──────────┘
                    │                             │
         ┌──────────▼─────────────────────────────▼──────────┐
         │           Next.js 15 Application                  │
         │                                                    │
         │  ┌───────────────┐       ┌──────────────────┐   │
         │  │  Dashboard    │       │  Portal Routes   │   │
         │  │  - /dashboard │       │  - /portal       │   │
         │  │  - /refunds   │       │  - /portal/track │   │
         │  │  - /settings  │       │  - /portal/reason│   │
         │  └───────┬───────┘       └────────┬─────────┘   │
         │          │                        │              │
         │  ┌───────▼────────────────────────▼─────────┐   │
         │  │        API Routes Layer                  │   │
         │  │  ┌────────────┐    ┌─────────────────┐  │   │
         │  │  │ Protected  │    │ Public Endpoints│  │   │
         │  │  │ /api/ikas  │    │ /api/public     │  │   │
         │  │  │ /api/refunds   │ - verify-order   │  │   │
         │  │  │ /api/settings  │ - submit-refund  │  │   │
         │  │  └──────┬─────┘    │ - track-refund  │  │   │
         │  │         │          └─────────┬───────┘  │   │
         │  └─────────┼────────────────────┼──────────┘   │
         │            │                    │              │
         └────────────┼────────────────────┼──────────────┘
                      │                    │
         ┌────────────▼────────────────────▼──────────┐
         │         Business Logic Layer               │
         │  ┌──────────────┐  ┌────────────────────┐ │
         │  │  Auth Token  │  │  Refund Request    │ │
         │  │  Manager     │  │  Manager           │ │
         │  └──────┬───────┘  └────────┬───────────┘ │
         │         │                   │             │
         └─────────┼───────────────────┼─────────────┘
                   │                   │
      ┌────────────▼───────┐  ┌────────▼─────────────┐
      │   iKAS GraphQL     │  │  PostgreSQL (Neon)   │
      │   Admin API        │  │  - AuthToken         │
      │   - Orders         │  │  - RefundRequest     │
      │   - Refunds        │  │  - Merchant          │
      │   - Merchant Info  │  │  - Timeline/Notes    │
      └────────────────────┘  └──────────────────────┘
\`\`\`

---

## 🔄 Veri Akışı

### 1. OAuth Authentication Flow

\`\`\`
┌─────────┐                    ┌──────────┐                  ┌─────────┐
│  iKAS   │                    │   App    │                  │  iKAS   │
│  Admin  │                    │  Server  │                  │  OAuth  │
└────┬────┘                    └─────┬────┘                  └────┬────┘
     │                               │                            │
     │  1. Install App               │                            │
     ├──────────────────────────────>│                            │
     │                               │                            │
     │                        2. Redirect to OAuth                │
     │                               ├───────────────────────────>│
     │                               │                            │
     │                               │   3. Authorization Code    │
     │                               │<───────────────────────────┤
     │                               │      + HMAC Signature      │
     │                               │                            │
     │          4. Validate Signature│                            │
     │                               │                            │
     │       5. Exchange Code for    │                            │
     │          Access Token         │                            │
     │                               ├───────────────────────────>│
     │                               │                            │
     │                               │   6. Access + Refresh      │
     │                               │<───────────────────────────┤
     │                               │       Tokens               │
     │                               │                            │
     │      7. Store in Database     │                            │
     │          (AuthToken model)    │                            │
     │                               │                            │
     │   8. Redirect to Dashboard    │                            │
     │<──────────────────────────────┤                            │
     │                               │                            │
\`\`\`

### 2. Admin Dashboard Flow (iKAS Iframe)

\`\`\`
┌──────────┐          ┌───────────┐          ┌──────────┐          ┌─────────┐
│  iKAS    │          │  Browser  │          │   API    │          │  iKAS   │
│  Admin   │          │  (Client) │          │  Server  │          │   API   │
└────┬─────┘          └─────┬─────┘          └────┬─────┘          └────┬────┘
     │                      │                     │                     │
     │ 1. Load /dashboard   │                     │                     │
     │      in iframe       │                     │                     │
     ├─────────────────────>│                     │                     │
     │                      │                     │                     │
     │                      │ 2. AppBridge:       │                     │
     │                      │    closeLoader()    │                     │
     │                      │                     │                     │
     │                      │ 3. TokenHelpers:    │                     │
     │                      │    getToken()       │                     │
     │                      │    (from AppBridge) │                     │
     │                      │                     │                     │
     │                      │ 4. GET /api/ikas/*  │                     │
     │                      │    Authorization:   │                     │
     │                      │    JWT {token}      │                     │
     │                      ├────────────────────>│                     │
     │                      │                     │                     │
     │                      │           5. Validate JWT                 │
     │                      │              Extract merchantId           │
     │                      │                     │                     │
     │                      │          6. Get AuthToken from DB         │
     │                      │             (authorizedAppId)             │
     │                      │                     │                     │
     │                      │                     │  7. GraphQL Query   │
     │                      │                     ├────────────────────>│
     │                      │                     │                     │
     │                      │                     │  8. Response        │
     │                      │                     │<────────────────────┤
     │                      │                     │                     │
     │                      │ 9. Format & Return  │                     │
     │                      │<────────────────────┤                     │
     │                      │                     │                     │
     │ 10. Render UI        │                     │                     │
     │<─────────────────────┤                     │                     │
     │                      │                     │                     │
\`\`\`

### 3. Customer Portal Flow

\`\`\`
┌──────────┐          ┌────────────┐          ┌──────────┐
│ Customer │          │   Portal   │          │   API    │
│ Browser  │          │   (Client) │          │  Server  │
└────┬─────┘          └─────┬──────┘          └────┬─────┘
     │                      │                      │
     │ 1. Visit Portal      │                      │
     │   /portal?storeId=XX │                      │
     ├─────────────────────>│                      │
     │                      │                      │
     │                      │ 2. Enter Order #     │
     │                      │    + Email           │
     │                      │                      │
     │                      │ 3. POST /api/public/ │
     │                      │    verify-order      │
     │                      ├─────────────────────>│
     │                      │                      │
     │                      │          4. Validate Order via iKAS
     │                      │             Check 15-day window
     │                      │             Check no existing refund
     │                      │                      │
     │                      │ 5. Session Token     │
     │                      │<─────────────────────┤
     │                      │                      │
     │ 6. Select Reason     │                      │
     │                      │                      │
     │ 7. Upload Photos     │                      │
     │    (optional)        │                      │
     │                      │                      │
     │                      │ 8. POST /api/public/ │
     │                      │    submit-refund     │
     │                      ├─────────────────────>│
     │                      │                      │
     │                      │          9. Create RefundRequest
     │                      │             Save to Database
     │                      │             Create Timeline
     │                      │                      │
     │                      │ 10. Tracking URL     │
     │                      │<─────────────────────┤
     │                      │                      │
     │ 11. Confirmation     │                      │
     │     Page             │                      │
     │<─────────────────────┤                      │
     │                      │                      │
\`\`\`

---

## 🗄 Veritabanı Şeması

### Entity Relationship Diagram

\`\`\`
┌─────────────────────┐
│     Merchant        │
├─────────────────────┤
│ id (PK)             │
│ authorizedAppId     │──────┐
│ storeName           │      │
│ email               │      │
│ portalUrl           │      │
│ portalEnabled       │      │
│ createdAt           │      │
│ updatedAt           │      │
└─────────────────────┘      │
                             │
                             │ 1:1
                             │
┌─────────────────────┐      │
│    AuthToken        │      │
├─────────────────────┤      │
│ id (PK)             │      │
│ merchantId          │      │
│ authorizedAppId     │<─────┘
│ salesChannelId      │
│ type                │
│ accessToken         │
│ tokenType           │
│ expiresIn           │
│ expireDate          │
│ refreshToken        │
│ scope               │
│ createdAt           │
│ updatedAt           │
│ deleted             │
└─────────────────────┘


┌──────────────────────┐
│   RefundRequest      │
├──────────────────────┤
│ id (PK)              │──────┐
│ orderId (unique)     │      │
│ orderNumber          │      │
│ merchantId           │      │ 1:N
│ status               │      │
│ reason               │      ├──────┐
│ reasonNote           │      │      │
│ trackingNumber       │      │      │
│ images (JSON)        │      │      │
│ source               │      │      │
│ createdAt            │      │      │
│ updatedAt            │      │      │
└──────────────────────┘      │      │
                              │      │
                              │      │
               ┌──────────────┘      │
               │                     │
               │                     │
    ┌──────────▼─────────┐  ┌────────▼─────────┐
    │   RefundNote       │  │  RefundTimeline  │
    ├────────────────────┤  ├──────────────────┤
    │ id (PK)            │  │ id (PK)          │
    │ refundRequestId(FK)│  │ refundRequestId  │
    │ content            │  │ eventType        │
    │ createdBy          │  │ eventData (JSON) │
    │ createdAt          │  │ description      │
    └────────────────────┘  │ createdBy        │
                            │ createdAt        │
                            └──────────────────┘
\`\`\`

### Veri Modelleri

#### AuthToken
OAuth token bilgilerini saklar. Her merchant için bir AuthToken kaydı vardır.
- Otomatik token refresh mekanizması ile çalışır
- \`expireDate\` kontrolü ile token geçerliliği kontrol edilir

#### RefundRequest
İade taleplerinin ana kaydıdır.
- **status**: pending, processing, completed, rejected
- **reason**: damaged_product, wrong_size, changed_mind, defective, not_as_described, other
- **source**: dashboard (manuel), portal (müşteri self-service)
- **images**: Base64 veya URL array (JSON format)

#### RefundNote
İade taleplerine eklenen notlar.
- Admin kullanıcılar tarafından eklenir
- \`createdBy\` ile kim eklediği takip edilir

#### RefundTimeline
İade talebinin tüm geçmişi.
- Her durum değişikliği, not ekleme, tracking güncelleme kaydedilir
- \`eventType\`: created, status_changed, note_added, tracking_updated, etc.

#### Merchant
Her mağaza için ayarlar.
- **portalUrl**: Özel domain (opsiyonel)
- **portalEnabled**: Portal aktif/pasif

---

## 🔌 API Endpoints

### Protected Endpoints (JWT Required)

#### iKAS Data Endpoints
- \`GET /api/ikas/orders\` - iKAS siparişlerini listele
  - Query: \`search\`, \`limit\`
  - OrderNumber filter + search parameter
  
- \`GET /api/ikas/refund-orders\` - iKAS'ta REFUNDED durumundaki siparişler
  - 60 günlük finansal rapor için

- \`GET /api/ikas/get-merchant\` - Merchant bilgilerini getir
  - Store name, email vb.

#### Refund Management
- \`GET /api/refunds\` - Tüm iade taleplerini listele
  - Merchant bazlı filtreleme
  
- \`POST /api/refunds\` - Yeni manuel iade oluştur
  - Body: \`{ orderId, orderNumber, reason?, reasonNote?, trackingNumber? }\`

- \`GET /api/refunds/[id]\` - Tekil iade detayı
  
- \`PATCH /api/refunds/[id]\` - İade durumu güncelle
  - Body: \`{ status, trackingNumber?, ... }\`

- \`GET /api/refunds/[id]/notes\` - İade notlarını listele

- \`POST /api/refunds/[id]/notes\` - Yeni not ekle
  - Body: \`{ content }\`

- \`GET /api/refunds/[id]/timeline\` - İade timeline'ını getir

#### Settings
- \`GET /api/settings\` - Merchant ayarlarını getir
  
- \`PATCH /api/settings\` - Ayarları güncelle
  - Body: \`{ portalUrl?, portalEnabled? }\`

### Public Endpoints (No Auth)

#### Portal Endpoints
- \`POST /api/public/verify-order\` - Sipariş doğrulama
  - Body: \`{ orderNumber, email, storeId }\`
  - Returns: Session token + order data
  - Validations:
    - 15-day return window
    - No existing refund
    - Order belongs to email

- \`POST /api/public/submit-refund\` - İade talebi oluştur
  - Body: \`{ orderNumber, email, storeId, reason, reasonNote?, images? }\`
  - Creates RefundRequest + Timeline

- \`GET /api/public/track-refund\` - İade durumu sorgula
  - Query: \`id\`, \`email\`
  - Returns: RefundRequest + Timeline

### OAuth Endpoints
- \`GET /api/oauth/authorize/ikas\` - OAuth flow başlat
  
- \`GET /api/oauth/callback/ikas\` - OAuth callback
  - Code exchange for tokens
  - HMAC signature validation
  - Store AuthToken in DB

---

## 🔐 Authentication & Authorization

### Admin Authentication (iKAS Iframe Apps)

1. **Token Acquisition**
   \`\`\`typescript
   // Client-side
   const token = await TokenHelpers.getTokenForIframeApp();
   // Gets JWT from iKAS AppBridge
   \`\`\`

2. **JWT Structure**
   \`\`\`json
   {
     "aud": "authorizedAppId",
     "sub": "merchantId",
     "iat": 1234567890,
     "exp": 1234567890
   }
   \`\`\`

3. **Server-side Validation**
   \`\`\`typescript
   // API Route
   const user = getUserFromRequest(request);
   // Extracts { authorizedAppId, merchantId } from JWT
   
   const authToken = await AuthTokenManager.get(user.authorizedAppId);
   // Fetch OAuth token for iKAS API calls
   \`\`\`

4. **Auto Token Refresh**
   \`\`\`typescript
   const ikasClient = getIkas(authToken, {
     onCheckToken: async () => {
       // Check if token expired
       // Auto-refresh if needed
     }
   });
   \`\`\`

### Customer Authentication (Portal)

1. **Session-based**
   \`\`\`typescript
   // After order verification
   const session = await getSession(request, response);
   session.orderId = orderId;
   session.merchantId = merchantId;
   await session.save();
   \`\`\`

2. **Order Verification**
   - Order number + email match
   - 15-day return window check
   - No existing refund check

---

## 🏢 Multi-Tenant Yapı

### Tenant Isolation

Her merchant için veri izolasyonu şu şekilde sağlanır:

1. **Database Level**
   \`\`\`sql
   -- Her sorgu merchantId ile filtrelenir
   SELECT * FROM "RefundRequest" WHERE "merchantId" = $1
   \`\`\`

2. **Application Level**
   \`\`\`typescript
   // JWT'den merchantId extract edilir
   const user = getUserFromRequest(request);
   
   // Tüm queries merchantId ile filtrelenir
   const refunds = await prisma.refundRequest.findMany({
     where: { merchantId: user.merchantId }
   });
   \`\`\`

3. **Portal URL Generation**
   \`\`\`typescript
   // Dinamik URL - her merchant için aynı app
   const portalUrl = \`\${window.location.origin}/portal?storeId=\${merchantId}\`
   
   // Custom domain varsa
   if (merchant.portalUrl) {
     portalUrl = \`https://\${merchant.portalUrl}\`
   }
   \`\`\`

### Deployment Architecture

\`\`\`
                    ┌─────────────────────────┐
                    │   Vercel Edge Network   │
                    │  (Single Deployment)    │
                    └───────────┬─────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
         ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
         │  Merchant A │ │  Merchant B │ │  Merchant C │
         │  storeId=1  │ │  storeId=2  │ │  storeId=3  │
         └─────────────┘ └─────────────┘ └─────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Shared PostgreSQL DB  │
                    │  (Neon Serverless)     │
                    │                        │
                    │  Tenant Isolation via  │
                    │  merchantId column     │
                    └────────────────────────┘
\`\`\`

### Benefits
- ✅ Tek deployment - tüm merchantlar için
- ✅ Kolay güncelleme - herkese aynı anda yeni feature
- ✅ Maliyet optimizasyonu - shared infrastructure
- ✅ Scalability - Vercel auto-scaling
- ✅ Data isolation - merchantId bazlı

---

## 📊 İş Akışı Örnekleri

### Scenario 1: Müşteri Self-Service İade

1. Müşteri portal'a gider: \`/portal?storeId=xxx\`
2. Sipariş numarası ve email girer
3. Backend order'ı iKAS'tan doğrular
4. 15 günlük süre kontrol edilir
5. Müşteri iade nedeni seçer
6. Fotoğraf yükler (opsiyonel)
7. İade talebi oluşturulur (status: pending)
8. Timeline event: "created"
9. Müşteriye tracking URL verilir

### Scenario 2: Admin Manuel İade

1. Admin dashboard'da "Yeni İade" butonuna tıklar
2. Sipariş numarası ile arama yapar
3. Backend iKAS API'den siparişleri getirir
4. Admin sipariş seçer
5. Opsiyonel: reason, note, tracking ekler
6. İade kaydı oluşturulur (source: dashboard)
7. Dashboard'da listede görünür

### Scenario 3: İade Durumu Güncelleme

1. Admin iade detay sayfasına gider
2. Durum değiştirir (pending → processing)
3. Not ekler: "Kargo alındı"
4. Tracking number ekler
5. Backend:
   - RefundRequest update edilir
   - RefundNote oluşturulur
   - Timeline event: "status_changed" + "note_added"
6. Müşteri tracking sayfasında güncel durumu görür

---

## 🔄 Data Synchronization

### iKAS Order Sync

iKAS'tan sipariş verisi iki şekilde gelir:

1. **On-Demand (Search)**
   - Admin sipariş ararken
   - Real-time iKAS API call
   - Cache yok

2. **Periodic (Dashboard Stats)**
   - Dashboard yüklendiğinde
   - Son 60 gün REFUNDED orders
   - Financial metrics için

### Conflict Resolution

- iKAS kaynak sistem (source of truth)
- Refund durumu iKAS'tan gelir
- Yerel RefundRequest sadece tracking ve notes için

---

## 🚀 Deployment & CI/CD

### Vercel Integration

\`\`\`yaml
# .github/workflows bağlantısı yok
# Direkt Vercel GitHub App ile:

Push to main → Auto deploy to production
Push to branch → Auto deploy preview
\`\`\`

### Environment Variables

\`\`\`bash
# Database
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# iKAS API
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_CLIENT_ID=xxx
NEXT_PUBLIC_DEPLOY_URL=http://localhost:3001  # Dev only

# OAuth
IKAS_CLIENT_SECRET=xxx  # Vercel secret
\`\`\`

### Build Process

\`\`\`bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma Client
pnpm prisma:generate

# 3. Run migrations (if needed)
pnpm prisma:migrate

# 4. Generate GraphQL types
pnpm codegen

# 5. Build Next.js
pnpm build
\`\`\`

---

## 📈 Monitoring & Logging

### Console Logging Strategy

\`\`\`typescript
// API Routes
console.log('Fetching orders with params:', { limit, search });
console.log('iKAS response:', {
  isSuccess: response.isSuccess,
  dataCount: response.data?.length
});
console.error('Error details:', { message, stack });
\`\`\`

### Vercel Logs

\`\`\`bash
# Real-time logs
vercel logs --since 10m

# Filtered logs
vercel logs | grep ERROR
\`\`\`

---

## 🎨 UI/UX Patterns

### Loading States
- Skeleton UI for dashboard stats
- Spinner for button actions
- "Yükleniyor..." messages

### Empty States
- CTA buttons for action
- Helpful descriptions
- Icons for visual clarity

### Error Handling
- Toast notifications (red/green banners)
- Inline validation messages
- Try-catch with user-friendly errors

---

## 📝 Code Organization

\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── ikas/         # Protected iKAS endpoints
│   │   ├── public/       # Public portal endpoints
│   │   ├── refunds/      # Refund CRUD
│   │   ├── settings/     # Merchant settings
│   │   └── oauth/        # OAuth flow
│   ├── dashboard/        # Admin UI (iframe)
│   ├── refunds/          # Refund pages
│   ├── portal/           # Customer portal
│   ├── settings/         # Settings page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── helpers/              # Helper utilities
│   ├── api-helpers.ts    # iKAS client factory
│   ├── jwt-helpers.ts    # JWT decode/validate
│   └── token-helpers.ts  # Token management
├── lib/                  # Core libraries
│   ├── api-requests.ts   # Frontend API caller
│   ├── auth-helpers.ts   # Server-side auth
│   ├── prisma.ts         # Database client
│   ├── session.ts        # Iron session config
│   └── ikas-client/      # GraphQL client
│       ├── graphql-requests.ts  # Query definitions
│       └── generated/    # Auto-generated types
└── models/               # Data models
    └── auth-token/       # AuthToken manager
        └── manager.ts    # CRUD + refresh logic
\`\`\`

---

## 🔧 Development Workflow

### Local Development

\`\`\`bash
# 1. Start dev server
pnpm dev

# 2. Prisma Studio (database UI)
pnpm prisma:studio

# 3. GraphQL codegen (watch mode)
pnpm codegen:watch
\`\`\`

### Adding New Features

1. **New iKAS Query/Mutation**
   \`\`\`bash
   # a. Add to graphql-requests.ts
   # b. Run codegen
   pnpm codegen
   # c. Use in API route via ikasClient.queries.xxx()
   \`\`\`

2. **New Database Model**
   \`\`\`bash
   # a. Update prisma/schema.prisma
   # b. Create migration
   pnpm prisma:migrate
   # c. Generate client
   pnpm prisma:generate
   \`\`\`

3. **New API Endpoint**
   \`\`\`typescript
   // src/app/api/new-endpoint/route.ts
   export async function GET(request: NextRequest) {
     const user = getUserFromRequest(request);
     // ... implementation
   }
   \`\`\`

---

## 🔒 Security Considerations

### HMAC Signature Validation (OAuth)
\`\`\`typescript
const isValid = TokenHelpers.validateCodeSignature(
  code, 
  signature, 
  clientSecret
);
\`\`\`

### SQL Injection Prevention
- Prisma ORM ile parametreli queries

### XSS Prevention
- React auto-escaping
- No dangerouslySetInnerHTML kullanımı

### CSRF Protection
- SameSite cookies
- State parameter in OAuth

### Rate Limiting
- Vercel edge functions (todo)

---

## 📞 İletişim & Support

- **Developer**: GitHub ennstekin/refund-v1
- **iKAS Documentation**: https://docs.myikas.com
- **Vercel Dashboard**: https://vercel.com

---

**Son Güncelleme**: 2025-01-24
**Versiyon**: 1.0.0
