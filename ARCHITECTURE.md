# 🏗️ System Architecture

Bu dokümanda ikas İade Yönetim Sistemi'nin teknik mimarisi, veri akışları ve tasarım kararları detaylı şekilde açıklanmıştır.

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Yüksek Seviye Mimari](#yüksek-seviye-mimari)
- [Teknoloji Stack](#teknoloji-stack)
- [OAuth Authentication Flow](#oauth-authentication-flow)
- [Veri Akışları](#veri-akışları)
- [Veritabanı Şeması](#veritabanı-şeması)
- [API Architecture](#api-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Security Architecture](#security-architecture)
- [Performance Optimizations](#performance-optimizations)
- [Deployment Architecture](#deployment-architecture)

---

## Genel Bakış

ikas İade Yönetim Sistemi, **Next.js 15 App Router** tabanlı modern bir full-stack uygulamadır. İki ana bileşenden oluşur:

1. **Admin Panel**: ikas dashboard'a gömülü (iframe) admin arayüzü
2. **Customer Portal**: Müşterilere yönelik self-service iade portalı

### Temel Özellikler

- **Multi-tenant Architecture**: Her mağaza için ayrı token ve ayarlar
- **OAuth 2.0 Integration**: ikas platform ile güvenli entegrasyon
- **Real-time Data Sync**: ikas GraphQL API ile senkronizasyon
- **Timeline System**: Event-driven activity tracking
- **Responsive UI**: Mobile-first tasarım
- **Serverless Deployment**: Vercel edge network

---

## Yüksek Seviye Mimari

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│                         ikas Platform                                │
│  ┌─────────────┐      ┌─────────────┐      ┌──────────────────┐   │
│  │   Admin     │      │   OAuth     │      │   GraphQL API    │   │
│  │  Dashboard  │      │   Server    │      │  (Orders, etc.)  │   │
│  └──────┬──────┘      └──────┬──────┘      └────────┬─────────┘   │
│         │                    │                       │              │
└─────────┼────────────────────┼───────────────────────┼──────────────┘
          │                    │                       │
          │ (iframe)           │ (OAuth)               │ (GraphQL)
          │                    │                       │
┌─────────▼────────────────────▼───────────────────────▼──────────────┐
│                    İade Yönetim Sistemi                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 15 App Router                      │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │  │
│  │  │  Admin Panel   │  │  Public Portal │  │  API Routes   │  │  │
│  │  │   (iframe)     │  │  (standalone)  │  │ (server-side) │  │  │
│  │  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘  │  │
│  │           │                   │                   │           │  │
│  │           └───────────────────┴───────────────────┘           │  │
│  │                              │                                │  │
│  └──────────────────────────────┼────────────────────────────────┘  │
│                                 │                                   │
│  ┌──────────────────────────────▼────────────────────────────────┐ │
│  │                    Backend Services                           │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │ │
│  │  │  ikas      │  │   Auth     │  │  Prisma    │            │ │
│  │  │  Client    │  │  Manager   │  │    ORM     │            │ │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │ │
│  │        │               │               │                    │ │
│  └────────┼───────────────┼───────────────┼────────────────────┘ │
│           │               │               │                      │
└───────────┼───────────────┼───────────────┼──────────────────────┘
            │               │               │
            │               │               ▼
            │               │    ┌──────────────────────┐
            │               │    │  PostgreSQL (Neon)   │
            │               │    │  ┌────────────────┐  │
            │               │    │  │   AuthToken    │  │
            │               └────┼──┤   Merchant     │  │
            │                    │  │ RefundRequest  │  │
            └────────────────────┼──┤ RefundTimeline │  │
                                 │  │   RefundNote   │  │
                                 │  └────────────────┘  │
                                 └──────────────────────┘
\`\`\`

---

## Teknoloji Stack

### Frontend
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| **Next.js** | 15.3.0 | App Router, SSR, API Routes |
| **React** | 19.0.0 | UI Framework |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 4.1.12 | Styling, Responsive Design |
| **shadcn/ui** | - | UI Component Library |
| **Lucide React** | 0.542.0 | Icons |
| **Axios** | 1.10.0 | HTTP Client |

### Backend
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| **Node.js** | 24.x | Runtime Environment |
| **Prisma** | 6.14.0 | ORM, Database Management |
| **PostgreSQL** | - | Production Database (Neon) |
| **Iron Session** | 8.0.4 | Secure Session Management |
| **JSON Web Token** | 9.0.2 | Authentication Tokens |

### ikas Integration
| Package | Versiyon | Kullanım Amacı |
|---------|----------|----------------|
| **@ikas/admin-api-client** | 2.0.11 | GraphQL Client |
| **@ikas/app-helpers** | 1.0.6 | App Bridge Utilities |
| **GraphQL Codegen** | 5.0.7 | Type Generation |

### Development Tools
| Tool | Kullanım Amacı |
|------|----------------|
| **pnpm** | Package Manager (10.4.1) |
| **ESLint** | Code Linting |
| **Prettier** | Code Formatting |
| **Vercel** | Deployment Platform |

---

## OAuth Authentication Flow

### 1. Token Management

#### JWT Token Structure
\`\`\`typescript
{
  "aud": "authorizedAppId",      // App instance ID
  "sub": "merchantId",            // Store/Merchant ID
  "iat": 1640000000,              // Issued at
  "exp": 1640086400               // Expires (24h)
}
\`\`\`

#### OAuth Token Storage (Database)
\`\`\`typescript
{
  id: string,                     // Unique ID
  merchantId: string,             // Store ID
  authorizedAppId: string,        // App instance ID (unique)
  accessToken: string,            // ikas API access token
  refreshToken: string,           // Refresh token
  expiresIn: number,              // Seconds until expiry
  expireDate: DateTime,           // Absolute expiry time
  tokenType: "Bearer",
  scope: string
}
\`\`\`

---

## Veritabanı Şeması

### Entity Relationship Diagram

\`\`\`
┌─────────────────────────────────────┐
│           AuthToken                 │
├─────────────────────────────────────┤
│ id (PK)              String         │
│ merchantId           String         │
│ authorizedAppId      String UNIQUE  │◄──┐
│ accessToken          String         │   │
│ refreshToken         String         │   │
│ expireDate           DateTime       │   │
│ ... (token fields)                  │   │
└─────────────────────────────────────┘   │
                                           │
                                           │
┌─────────────────────────────────────┐   │
│           Merchant                  │   │
├─────────────────────────────────────┤   │
│ id (PK)              String         │   │
│ authorizedAppId      String UNIQUE  ├───┘
│ storeName            String?        │
│ email                String?        │
│ portalUrl            String?        │
│ portalEnabled        Boolean        │
│ createdAt            DateTime       │
│ updatedAt            DateTime       │
└─────────────────────────────────────┘


┌─────────────────────────────────────┐
│        RefundRequest                │
├─────────────────────────────────────┤
│ id (PK)              String         │
│ orderId              String UNIQUE  │
│ orderNumber          String         │
│ merchantId           String         │
│ status               String         │
│ reason               String?        │
│ reasonNote           String?        │
│ trackingNumber       String?        │
│ source               String         │
│ createdAt            DateTime       │
│ updatedAt            DateTime       │
└──────────┬──────────────────────────┘
           │
           │ 1:N
           │
    ┌──────┴──────┬──────────────┐
    │             │              │
    ▼             ▼              ▼
┌───────────┐ ┌──────────┐ 
│RefundNote │ │RefundTime│ 
├───────────┤ │  line    │ 
│id (PK)    │ ├──────────┤ 
│refundReq..│ │id (PK)   │ 
│content    │ │refundReq.│ 
│createdBy  │ │eventType │ 
│createdAt  │ │eventData │ 
└───────────┘ │descript..│
              │createdBy │ 
              │createdAt │ 
              └──────────┘
\`\`\`

---

## API Architecture

### API Route Structure

\`\`\`
/api/
├── oauth/
│   ├── authorize/ikas/          [GET]  Start OAuth flow
│   └── callback/ikas/           [GET]  OAuth callback handler
│
├── ikas/                        [Protected - JWT required]
│   ├── get-merchant/            [GET]  Get merchant info
│   ├── orders/                  [GET]  Search orders
│   └── refund-orders/           [GET]  Get refund status orders (90d)
│
├── public/                      [Public - No JWT]
│   ├── verify-order/            [POST] Verify customer order
│   └── submit-refund/           [POST] Submit customer refund
│
├── refunds/
│   ├── /                        [GET]  List refunds
│   ├── /                        [POST] Create manual refund
│   ├── [id]/                    [GET]  Get refund detail
│   ├── [id]/                    [PATCH] Update refund status
│   └── [id]/timeline/           [GET]  Get refund timeline
│
└── settings/                    [GET/POST] Merchant settings
\`\`\`

---

## Frontend Architecture

### Component Structure

\`\`\`
src/components/
├── ui/                    # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ... (other UI components)
│
├── home-page/             # Home page components
│   └── index.tsx
│
└── Loading.tsx            # Global loading component
\`\`\`

### Page Structure (App Router)

\`\`\`
src/app/
├── page.tsx                        # Root entry point (token check)
│
├── dashboard/                      # Admin Dashboard
│   └── page.tsx                    # 3 navigation cards
│
├── refunds/                        # Refund Management
│   ├── page.tsx                    # List view (tabs: ikas + manual)
│   ├── new/page.tsx                # Create manual refund
│   └── [id]/page.tsx               # Refund detail + timeline
│
├── settings/                       # Settings
│   └── page.tsx                    # Portal URL, enable/disable
│
├── portal/                         # Customer Portal (Public)
│   ├── page.tsx                    # Step 1: Verify order
│   ├── reason/page.tsx             # Step 2: Select reason
│   ├── upload/page.tsx             # Step 3: Upload photos
│   ├── complete/page.tsx           # Step 4: Instructions
│   └── track/[id]/page.tsx         # Track refund status
│
├── authorize-store/                # OAuth
│   └── page.tsx                    # Enter store name
│
└── callback/                       # OAuth callback
    └── page.tsx                    # Handle JWT, redirect
\`\`\`

---

## Security Architecture

### Environment Variable Security

| Variable | Exposure | Storage | Usage |
|----------|----------|---------|-------|
| \`NEXT_PUBLIC_CLIENT_ID\` | Public (bundle) | Vercel | OAuth client identification |
| \`CLIENT_SECRET\` | Private (server) | Vercel | OAuth signature validation |
| \`DATABASE_URL\` | Private (server) | Vercel | Database connection |
| \`SECRET_COOKIE_PASSWORD\` | Private (server) | Vercel | Iron session encryption |
| \`JWT_SECRET\` | Private (server) | Vercel | JWT signing/verification |

**CRITICAL**: Environment variables must NOT have trailing newlines (\`\\n\`). Use:
\`\`\`bash
echo -n "value" | vercel env add VAR_NAME production
\`\`\`

---

## Performance Optimizations

### 1. Order Search Optimization

**Problem**: \`search\` parameter yapıyor full-text search, yavaş.

**Solution**: Order number için indexed field kullan.

\`\`\`typescript
// Before (Slow)
const response = await ikasClient.queries.listOrder({
  search: '1001'  // Full-text search across all fields
});

// After (Fast)
const isOrderNumber = /^\\d+$/.test(search.trim());

const response = await ikasClient.queries.listOrder({
  ...(isOrderNumber
    ? { orderNumber: { eq: search.trim() } }  // Indexed lookup
    : { search }                               // Full-text search
  )
});
\`\`\`

**Impact**: 10x hız artışı (indexed field kullanımı)

---

## Deployment Architecture

### Vercel Deployment

\`\`\`
┌───────────────────────────────────────────────────────────────┐
│                      Vercel Platform                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Edge Network (CDN)                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │ US East  │  │ EU West  │  │ Asia     │  ...    │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘         │    │
│  └───────┼─────────────┼─────────────┼────────────────┘    │
│          │             │             │                      │
│  ┌───────▼─────────────▼─────────────▼────────────────┐    │
│  │          Serverless Functions (Node.js)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│  │  │ API      │  │ Pages    │  │ Static   │        │    │
│  │  │ Routes   │  │ (SSR)    │  │ Assets   │        │    │
│  │  └────┬─────┘  └────┬─────┘  └──────────┘        │    │
│  └───────┼─────────────┼──────────────────────────────┘    │
│          │             │                                    │
└──────────┼─────────────┼────────────────────────────────────┘
           │             │
           ▼             ▼
    ┌──────────┐   ┌──────────┐
    │   Neon   │   │  ikas    │
    │PostgreSQL│   │ GraphQL  │
    │          │   │   API    │
    └──────────┘   └──────────┘
\`\`\`

### Environment Variables (Production)

\`\`\`bash
# Public (embedded in bundle)
NEXT_PUBLIC_CLIENT_ID=d75f1f20-2c5f-48c4-914a-fad30f76d16b
NEXT_PUBLIC_DEPLOY_URL=https://refund-v1.vercel.app
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/v2/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin
NEXT_PUBLIC_PORTAL_URL=https://refund-v1.vercel.app

# Private (server-side only)
CLIENT_SECRET=s_SFP9LkQaQyZCQ1RE39xeRoB436397cbbfd124fea917afa1856e95018
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=d3bc891fcfa20e440a5c0959a2856e41768dc02790022c07cf80e6ca915de0de
SECRET_COOKIE_PASSWORD=9a3205568ca708ceabb8a1a8b598751eda641e98bdfff86f00c0c7794ae7f4bc
\`\`\`

### Build Process

\`\`\`bash
# Vercel Build Command
prisma migrate deploy && prisma generate && next build
\`\`\`

**Steps**:
1. \`prisma migrate deploy\` - Apply database migrations (production)
2. \`prisma generate\` - Generate Prisma Client
3. \`next build\` - Build Next.js application

### Deployment Checklist

- [ ] Environment variables configured (no trailing \`\\n\`)
- [ ] \`NEXT_PUBLIC_DEPLOY_URL\` points to production URL
- [ ] Database migrations applied (\`prisma migrate deploy\`)
- [ ] GraphQL types generated (\`pnpm codegen\`)
- [ ] OAuth redirect URL registered in ikas Developer Portal
- [ ] Build succeeds locally (\`pnpm build\`)

---

## Sonuç

Bu mimari, modern e-ticaret ihtiyaçlarını karşılayacak şekilde tasarlanmış, ölçeklenebilir ve güvenli bir yapı sunar.

**Güçlü Yönler**:
- ✅ Type-safe GraphQL integration
- ✅ Secure OAuth 2.0 flow
- ✅ Multi-tenant architecture
- ✅ Serverless scalability
- ✅ Real-time data sync
- ✅ Event-driven timeline system

**İyileştirme Alanları**:
- 🔄 Redis caching katmanı
- 🔄 Webhook entegrasyonu (sipariş güncellemeleri)
- 🔄 Email notification sistemi
- 🔄 Analytics ve reporting dashboard
- 🔄 Rate limiting (public endpoints)
- 🔄 File upload CDN integration

---

**Son Güncelleme:** 2025-01-24

**İlgili Dökümanlar:**
- [README.md](./README.md) - Genel bilgiler ve setup
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Sorun giderme
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment rehberi
