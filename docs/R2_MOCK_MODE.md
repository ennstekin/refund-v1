# R2 Mock Mode - Development Without Cloudflare

## Overview

The R2 client now supports **Mock Mode** for development without Cloudflare credentials.

## How It Works

### Without R2 Credentials (Mock Mode)

```typescript
// .env.local - NO R2 credentials
// R2_ACCOUNT_ID is missing
// R2_ACCESS_KEY_ID is missing
// R2_SECRET_ACCESS_KEY is missing
```

**Behavior:**
- ⚠️ Console warning: "R2 credentials not found. Running in MOCK mode"
- ✅ Images stored as **base64 in database** (not ideal, but works)
- ✅ Upload API returns base64 URLs
- ✅ Images display correctly in browser
- ❌ **Not suitable for production!**

**Use Case:** Quick development/testing without Cloudflare setup

---

### With R2 Credentials (Production Mode)

```env
# .env.local
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=refund-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Behavior:**
- ✅ Images uploaded to Cloudflare R2
- ✅ Public URLs returned
- ✅ CDN-backed fast delivery
- ✅ **Production-ready!**

**Use Case:** Production deployment

---

## Development Workflow

### Option 1: Start with Mock Mode (Faster)

```bash
# 1. No R2 setup needed
# 2. Start coding immediately
pnpm dev

# 3. Test image upload
# → Images stored as base64 (works but slow)

# 4. Later: Set up R2 and switch to production mode
# → Just add R2 env vars and restart
```

**Timeline:**
- Day 1-3: Develop with mock mode
- Day 4: Set up R2 (10 min)
- Day 5+: Production mode

---

### Option 2: Start with R2 (Recommended)

```bash
# 1. Set up R2 first (10 min)
# → Follow docs/CLOUDFLARE_R2_SETUP.md

# 2. Add R2 credentials to .env.local

# 3. Start development
pnpm dev

# 4. Images work perfectly from day 1
```

**Timeline:**
- Day 1: R2 setup (10 min) + development
- Production ready immediately

---

## When to Use Each Mode

### Use Mock Mode If:

- ✅ You want to start coding **immediately**
- ✅ You're testing non-image features
- ✅ You don't have Cloudflare account yet
- ✅ You're doing **local development only**

### Use R2 (Production) Mode If:

- ✅ You're deploying to **production**
- ✅ You're testing **image display** in ikas iframe
- ✅ You need **CSP-compliant** images
- ✅ You want **realistic performance** testing

---

## Switching Between Modes

### Mock → Production (Easy!)

```bash
# 1. Set up R2 (docs/CLOUDFLARE_R2_SETUP.md)

# 2. Add credentials to .env.local
echo "R2_ACCOUNT_ID=xxx" >> .env.local
echo "R2_ACCESS_KEY_ID=xxx" >> .env.local
echo "R2_SECRET_ACCESS_KEY=xxx" >> .env.local
echo "R2_BUCKET_NAME=refund-images" >> .env.local
echo "R2_PUBLIC_URL=https://pub-xxx.r2.dev" >> .env.local

# 3. Restart server
pnpm dev

# Done! Now using R2 storage
```

### Production → Mock (For Testing)

```bash
# 1. Comment out R2 credentials
# R2_ACCOUNT_ID=xxx
# R2_ACCESS_KEY_ID=xxx
# ...

# 2. Restart server
pnpm dev

# Back to mock mode
```

---

## Console Messages

### Mock Mode Console Output

```
⚠️ R2 credentials not found. Running in MOCK mode (images will be base64).
📸 MOCK: Image upload skipped for key: refunds/merchant-123/order-456/image-1.jpg
🗑️ MOCK: Delete skipped for key: refunds/merchant-123/order-456/image-1.jpg
```

### Production Mode Console Output

```
(No warnings - silent success)
```

---

## Limitations of Mock Mode

### Database Size Issue

**Problem:**
- Base64 images are **huge** (5MB image = 7MB base64)
- Database grows quickly
- Query performance degrades

**Impact:**
```
10 refunds × 3 images × 7MB = 210MB database

Compare to R2:
10 refunds × 3 images × 50 bytes (URL) = 1.5KB database
```

### ikas Iframe CSP Issue

**Problem:**
- Some browsers block base64 images in iframes
- CSP (Content Security Policy) restrictions
- Unpredictable behavior

**Impact:**
- Images may not display in ikas admin panel
- Only affects iframe context

### Performance Issue

**Problem:**
- Database query returns 7MB per refund
- Slow page loads
- High memory usage

**Impact:**
- Dashboard slow with many refunds
- Not suitable for production

---

## Recommendation

### For You (Now)

**Option A: Quick Start (Mock Mode)**
```bash
# Skip R2 setup for now
pnpm dev
# → Code immediately
# → Set up R2 later (before production)
```

**Option B: Proper Start (R2 Mode)** ✅ **Recommended**
```bash
# 10 min R2 setup
# → Follow docs/CLOUDFLARE_R2_SETUP.md
pnpm dev
# → Production-ready from day 1
```

### For Production

**MUST USE R2** - Mock mode not allowed:
- ❌ Database too large
- ❌ CSP issues in iframe
- ❌ Performance problems

---

## Migration Path

If you start with mock mode and have existing refunds:

```typescript
// scripts/migrate-mock-to-r2.ts
import { prisma } from '@/lib/prisma';
import { R2Client } from '@/lib/r2-client';

async function migrate() {
  const refunds = await prisma.refundRequest.findMany({
    where: {
      images: { not: null },
    },
  });

  for (const refund of refunds) {
    const images = JSON.parse(refund.images);

    // Skip if already URLs
    if (images[0]?.startsWith('http')) continue;

    // Upload base64 to R2
    const urls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const key = R2Client.generateKey(
        refund.merchantId,
        refund.orderId,
        `image-${i}.jpg`
      );
      const url = await R2Client.uploadFile(images[i], key);
      urls.push(url);
    }

    // Update with URLs
    await prisma.refundRequest.update({
      where: { id: refund.id },
      data: { images: JSON.stringify(urls) },
    });

    console.log(`Migrated ${refund.id}`);
  }
}

migrate();
```

---

## Summary

| Feature | Mock Mode | R2 Mode |
|---------|-----------|---------|
| Setup Time | 0 min | 10 min |
| Storage | Database | Cloudflare R2 |
| Database Size | 7MB/image | 50 bytes/image |
| CSP Compatible | ⚠️ Maybe | ✅ Yes |
| Performance | ⚠️ Slow | ✅ Fast |
| Production | ❌ No | ✅ Yes |
| Cost | Free | Free (10GB) |

**Bottom Line:**
- Development: Both work, R2 recommended
- Production: R2 required

**Your Choice:** Start with mock if you want to code immediately, switch to R2 before production.
