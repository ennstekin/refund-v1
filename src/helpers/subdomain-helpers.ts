import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

/**
 * SubdomainHelpers - Utility class for subdomain management
 * Handles subdomain generation, validation, and availability checking
 */
export class SubdomainHelpers {
  /**
   * System-reserved subdomains that cannot be used by merchants
   */
  static readonly SYSTEM_SUBDOMAINS = [
    'www',
    'api',
    'admin',
    'dashboard',
    'app',
    'cdn',
    'static',
    'assets',
    'images',
    'img',
    'mail',
    'smtp',
    'ftp',
    'ssh',
    'vpn',
    'test',
    'testing',
    'staging',
    'dev',
    'development',
    'demo',
    'support',
    'help',
    'docs',
    'documentation',
    'blog',
    'status',
    'portal',
    'refund',
    'refunds',
    'iade',
    'iades',
    'auth',
    'oauth',
    'login',
    'signup',
    'register',
    'checkout',
    'payment',
    'payments',
  ];

  /**
   * Generate a valid subdomain from store name
   * @param storeName - Store name from ikas
   * @returns Promise<string> - Valid, available subdomain
   *
   * @example
   * generateSubdomain("Örnek Mağaza A.Ş.") → "ornek-magaza-as"
   * generateSubdomain("Test Store 123") → "test-store-123"
   */
  static async generateSubdomain(storeName: string): Promise<string> {
    // 1. Convert to URL-safe slug
    // Türkçe karakterleri değiştir: ö→o, ş→s, ğ→g, etc.
    const baseSlug = slugify(storeName, {
      lower: true, // Küçük harfe çevir
      strict: true, // Sadece alfanumerik ve tire
      locale: 'tr', // Türkçe locale
      remove: /[*+~.()'"!:@]/g, // Özel karakterleri kaldır
    });

    // 2. DNS limit: subdomain max 63 karakter
    let subdomain = baseSlug.substring(0, 63);

    // 3. Başında veya sonunda tire varsa temizle
    subdomain = subdomain.replace(/^-+|-+$/g, '');

    // 4. Boş ise fallback
    if (!subdomain || subdomain.length < 3) {
      subdomain = 'store';
    }

    // 5. Müsait olana kadar sayı ekle
    let counter = 1;
    let candidate = subdomain;

    while (!(await this.isSubdomainAvailable(candidate))) {
      candidate = `${subdomain}-${counter}`;
      counter++;

      // Sonsuz döngüyü önle
      if (counter > 1000) {
        throw new Error('Subdomain generation failed: too many attempts');
      }
    }

    return candidate;
  }

  /**
   * Check if a subdomain is available for use
   * @param subdomain - Subdomain to check
   * @returns Promise<boolean> - True if available
   */
  static async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    // 1. Sistem yasağında mı?
    if (this.SYSTEM_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return false;
    }

    // 2. Yasak listesinde mi?
    const restricted = await prisma.restrictedSubdomain.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });
    if (restricted) {
      return false;
    }

    // 3. Başka merchant kullanıyor mu?
    const existing = await prisma.merchant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });
    if (existing) {
      return false;
    }

    // 4. Rezerve edilmiş mi?
    const reserved = await prisma.subdomainReservation.findFirst({
      where: {
        subdomain: subdomain.toLowerCase(),
        status: { in: ['reserved', 'active'] },
      },
    });
    if (reserved) {
      return false;
    }

    // Müsait!
    return true;
  }

  /**
   * Get merchant ID from subdomain
   * @param subdomain - Subdomain to lookup
   * @returns Promise<string | null> - Merchant ID if found and active
   */
  static async getMerchantBySubdomain(subdomain: string): Promise<string | null> {
    const merchant = await prisma.merchant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: {
        id: true,
        subdomainStatus: true,
        portalEnabled: true,
      },
    });

    // Merchant bulunamadı
    if (!merchant) {
      return null;
    }

    // Subdomain aktif değil
    if (merchant.subdomainStatus !== 'active') {
      return null;
    }

    // Portal kapalı
    if (!merchant.portalEnabled) {
      return null;
    }

    return merchant.id;
  }

  /**
   * Validate subdomain format
   * @param subdomain - Subdomain to validate
   * @returns { valid: boolean, error?: string }
   */
  static validateSubdomainFormat(subdomain: string): {
    valid: boolean;
    error?: string;
  } {
    // 1. Uzunluk kontrolü (3-63 karakter)
    if (subdomain.length < 3) {
      return {
        valid: false,
        error: 'Subdomain en az 3 karakter olmalıdır',
      };
    }

    if (subdomain.length > 63) {
      return {
        valid: false,
        error: 'Subdomain en fazla 63 karakter olabilir',
      };
    }

    // 2. Karakter kontrolü (sadece alfanumerik ve tire)
    const validPattern = /^[a-z0-9-]+$/;
    if (!validPattern.test(subdomain)) {
      return {
        valid: false,
        error: 'Subdomain sadece küçük harf, rakam ve tire içerebilir',
      };
    }

    // 3. Başında veya sonunda tire olmamalı
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return {
        valid: false,
        error: 'Subdomain tire ile başlayamaz veya bitemez',
      };
    }

    // 4. Ardışık tire olmamalı
    if (subdomain.includes('--')) {
      return {
        valid: false,
        error: 'Subdomain ardışık tire içeremez',
      };
    }

    return { valid: true };
  }

  /**
   * Reserve a subdomain for a merchant (optional - for future use)
   * @param subdomain - Subdomain to reserve
   * @param merchantId - Merchant ID
   * @param expiresInMinutes - Expiration time in minutes (default: 30)
   */
  static async reserveSubdomain(
    subdomain: string,
    merchantId: string,
    expiresInMinutes: number = 30
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    await prisma.subdomainReservation.upsert({
      where: { subdomain: subdomain.toLowerCase() },
      create: {
        subdomain: subdomain.toLowerCase(),
        merchantId,
        status: 'reserved',
        expiresAt,
      },
      update: {
        merchantId,
        status: 'reserved',
        expiresAt,
        reservedAt: new Date(),
      },
    });
  }

  /**
   * Seed system-reserved subdomains to database
   * Should be run once during initial setup
   */
  static async seedRestrictedSubdomains(): Promise<void> {
    console.log('🌱 Seeding restricted subdomains...');

    let seededCount = 0;
    let skippedCount = 0;

    for (const subdomain of this.SYSTEM_SUBDOMAINS) {
      try {
        await prisma.restrictedSubdomain.upsert({
          where: { subdomain },
          create: {
            subdomain,
            reason: 'system',
          },
          update: {}, // No update needed if exists
        });
        seededCount++;
      } catch (error) {
        console.error(`Error seeding ${subdomain}:`, error);
        skippedCount++;
      }
    }

    console.log(`✅ Seeded ${seededCount} restricted subdomains`);
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} subdomains`);
    }
  }

  /**
   * Clean up expired subdomain reservations
   * Should be run periodically (e.g., via cron job)
   */
  static async cleanupExpiredReservations(): Promise<number> {
    const result = await prisma.subdomainReservation.deleteMany({
      where: {
        status: 'reserved',
        expiresAt: {
          lt: new Date(), // Expired
        },
      },
    });

    return result.count;
  }
}
