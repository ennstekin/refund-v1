import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 Client
 * S3-compatible storage service
 */
class R2ClientClass {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'refund-images';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    // Development mode: Skip R2 setup if credentials not provided
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('⚠️ R2 credentials not found. Running in MOCK mode (images will be base64).');
      return; // Skip S3Client initialization
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to R2
   * @param file - File buffer or base64 string
   * @param key - File path in bucket (e.g., "refunds/order-123/image-1.jpg")
   * @param contentType - MIME type (e.g., "image/jpeg")
   * @returns Public URL of uploaded file
   */
  async uploadFile(
    file: Buffer | string,
    key: string,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    // Mock mode: Return base64 as-is (for development without R2)
    if (!this.client) {
      console.warn(`📸 MOCK: Image upload skipped for key: ${key}`);
      // Return the base64 string itself (will work for display but not ideal)
      if (typeof file === 'string') {
        return file; // Return base64 data URL
      }
      // Convert buffer to base64 data URL
      const base64 = file.toString('base64');
      return `data:${contentType};base64,${base64}`;
    }

    let buffer: Buffer;

    // Convert base64 to buffer if needed
    if (typeof file === 'string') {
      // Remove data:image/jpeg;base64, prefix if exists
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = file;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);

    // Return public URL
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    } else {
      // Fallback: generate signed URL (expires in 7 days)
      return await this.getSignedUrl(key, 7 * 24 * 60 * 60);
    }
  }

  /**
   * Delete a file from R2
   * @param key - File path in bucket
   */
  async deleteFile(key: string): Promise<void> {
    // Mock mode: No-op
    if (!this.client) {
      console.warn(`🗑️ MOCK: Delete skipped for key: ${key}`);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Generate a signed URL for private files
   * @param key - File path in bucket
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Mock mode: Return mock URL
    if (!this.client) {
      console.warn(`🔗 MOCK: Signed URL skipped for key: ${key}`);
      return `data:image/jpeg;base64,mock-url-for-${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generate a unique key for refund images
   * @param merchantId - Merchant ID
   * @param orderId - Order ID
   * @param filename - Original filename
   */
  generateKey(merchantId: string, orderId: string, filename: string): string {
    const timestamp = Date.now();
    const ext = filename.split('.').pop() || 'jpg';
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);

    return `refunds/${merchantId}/${orderId}/${timestamp}-${sanitizedFilename}.${ext}`;
  }

  /**
   * Extract key from public URL
   * @param url - Public URL
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    // Extract key from URL
    // https://pub-xxxxx.r2.dev/refunds/merchant-123/order-456/image.jpg
    // → refunds/merchant-123/order-456/image.jpg
    const match = url.match(/\/refunds\/(.+)$/);
    return match ? `refunds/${match[1]}` : null;
  }
}

// Singleton instance
export const R2Client = new R2ClientClass();
