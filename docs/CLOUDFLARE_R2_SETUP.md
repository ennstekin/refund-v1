# Cloudflare R2 Setup Guide

This guide explains how to set up Cloudflare R2 for storing refund images.

## Why Cloudflare R2?

- ✅ **Free 10GB storage** per month
- ✅ **No egress fees** (unlike AWS S3)
- ✅ **10M Class A operations/month** (uploads)
- ✅ **S3-compatible API** (easy integration)
- ✅ **Global CDN** (fast image delivery)
- ✅ **Public URLs** (CSP-compliant)

## Setup Steps

### 1. Create Cloudflare Account

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Create a free account
3. Verify your email

### 2. Create R2 Bucket

1. Go to **R2** from the Cloudflare dashboard sidebar
2. Click **"Create bucket"**
3. Bucket configuration:
   - **Bucket name**: `refund-images` (or your preferred name)
   - **Location**: Automatic (recommended)
4. Click **"Create bucket"**

### 3. Configure Public Access

By default, R2 buckets are private. To allow public access to images:

1. Go to your bucket → **Settings**
2. Find **"Public access"** section
3. Click **"Allow Access"** or **"Connect Domain"**

#### Option A: R2.dev subdomain (Easiest)
1. Click **"Allow Access"**
2. Enable R2.dev subdomain
3. You'll get a URL like: `https://pub-xxxxx.r2.dev`
4. Copy this URL for `R2_PUBLIC_URL` env variable

#### Option B: Custom Domain (Advanced)
1. Click **"Connect Domain"**
2. Enter your domain (e.g., `images.yourdomain.com`)
3. Follow DNS configuration steps
4. Use this domain for `R2_PUBLIC_URL`

### 4. Generate API Tokens

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **"Create API Token"**
3. Configuration:
   - **Token name**: `refund-app-token`
   - **Permissions**:
     - ✅ Object Read
     - ✅ Object Write
   - **TTL**: Never expire (or custom)
   - **Bucket scope**: Select `refund-images` bucket
4. Click **"Create API Token"**
5. **IMPORTANT**: Copy the credentials immediately:
   - **Access Key ID**: `xxxxxxxxxxxx`
   - **Secret Access Key**: `yyyyyyyyyyyy`
   - You won't be able to see the secret again!

### 5. Get Account ID

1. Go to Cloudflare dashboard
2. Account ID is visible in the right sidebar
3. Or go to **R2** and it's in the S3 API endpoint:
   - Endpoint: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`

### 6. Update Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=refund-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### 7. Test the Integration

Run the development server:

```bash
pnpm dev
```

Test image upload:
1. Go to `/portal`
2. Submit a refund request with images
3. Check if images are uploaded to R2
4. Verify images display correctly in `/refunds/[id]` page

### 8. Production Deployment

#### Vercel Environment Variables

Add the R2 credentials to Vercel:

```bash
vercel env add R2_ACCOUNT_ID production
vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_BUCKET_NAME production
vercel env add R2_PUBLIC_URL production
```

Or via Vercel Dashboard:
1. Go to Project → Settings → Environment Variables
2. Add each variable for Production environment

## Cost Estimation

### Free Tier Limits

- **Storage**: 10 GB/month - FREE
- **Class A operations** (uploads): 10M/month - FREE
- **Class B operations** (reads): 100M/month - FREE
- **Egress**: FREE (unlimited!)

### Example Usage

**Scenario**: 1000 refunds/month, 3 images each, 2MB per image

- **Storage**: 1000 × 3 × 2MB = 6 GB/month ✅ FREE
- **Uploads**: 3000/month ✅ FREE
- **Downloads**: ~10,000/month (merchants viewing) ✅ FREE

**Monthly cost: $0** 🎉

### When you need to pay?

Only if you exceed free tier:
- **Storage**: $0.015/GB/month after 10GB
- **Class A ops**: $4.50/million after 10M
- **Class B ops**: $0.36/million after 100M

## Troubleshooting

### Error: "R2 credentials are not configured"

- Check if all R2 environment variables are set
- Restart your development server after adding env vars

### Error: "Access Denied"

- Verify API token permissions (Read + Write)
- Check if bucket name matches
- Ensure token hasn't expired

### Images not displaying

- Check if `R2_PUBLIC_URL` is correct
- Verify public access is enabled on bucket
- Check browser console for CSP errors

### Upload fails silently

- Check bucket quota (10GB free tier)
- Verify image size (max 5MB configured in upload handler)
- Check server logs for errors

## Security Best Practices

1. **Never commit** `.env` files to git
2. **Rotate API tokens** periodically
3. **Use separate buckets** for dev/staging/production
4. **Enable CORS** if accessing from different domains:

```bash
# CORS configuration (if needed)
# Go to R2 bucket → Settings → CORS policy
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Monitoring

### Check R2 Usage

1. Go to Cloudflare dashboard → R2
2. View **Analytics** tab
3. Monitor:
   - Storage usage
   - Request counts
   - Bandwidth (egress is free, but good to monitor)

### Set up Alerts

1. Go to Cloudflare → Notifications
2. Create alert for R2 storage usage
3. Set threshold (e.g., 8GB to warn before hitting 10GB limit)

## Migration from Existing System

If you have existing base64 images in database:

1. Create a migration script:

```typescript
// scripts/migrate-images-to-r2.ts
import { prisma } from '@/lib/prisma';
import { R2Client } from '@/lib/r2-client';

async function migrateImages() {
  const refunds = await prisma.refundRequest.findMany({
    where: {
      images: { not: null },
    },
  });

  for (const refund of refunds) {
    if (!refund.images) continue;

    try {
      const base64Images = JSON.parse(refund.images);

      // Skip if already URLs
      if (base64Images[0]?.startsWith('http')) {
        console.log(`Skipping ${refund.id} - already migrated`);
        continue;
      }

      const urls: string[] = [];

      for (let i = 0; i < base64Images.length; i++) {
        const key = R2Client.generateKey(
          refund.merchantId,
          refund.orderId,
          `migrated-${i}.jpg`
        );

        const url = await R2Client.uploadFile(
          base64Images[i],
          key,
          'image/jpeg'
        );

        urls.push(url);
      }

      // Update database with URLs
      await prisma.refundRequest.update({
        where: { id: refund.id },
        data: { images: JSON.stringify(urls) },
      });

      console.log(`Migrated ${refund.id} - ${urls.length} images`);
    } catch (error) {
      console.error(`Error migrating ${refund.id}:`, error);
    }
  }

  console.log('Migration complete!');
}

migrateImages();
```

2. Run migration:

```bash
pnpm tsx scripts/migrate-images-to-r2.ts
```

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [AWS S3 SDK for R2](https://developers.cloudflare.com/r2/api/s3/api/)

## Support

If you encounter issues:

1. Check Cloudflare R2 status page
2. Review server logs
3. Contact Cloudflare support (for R2 issues)
4. Create an issue in this repository
