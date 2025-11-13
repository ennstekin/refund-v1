import { NextRequest, NextResponse } from 'next/server';
import { R2Client } from '@/lib/r2-client';

/**
 * POST - Public endpoint to upload refund images to R2
 * Accepts base64 encoded images and returns public URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, orderId, images } = body;

    if (!merchantId || !orderId || !images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided', success: false },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed', success: false },
        { status: 400 }
      );
    }

    // Upload images to R2
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i];

      // Validate base64 format
      if (!base64Image.startsWith('data:image/')) {
        continue; // Skip invalid images
      }

      // Extract content type
      const contentTypeMatch = base64Image.match(/data:(image\/[^;]+);/);
      const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/jpeg';

      // Generate unique key
      const key = R2Client.generateKey(
        merchantId,
        orderId,
        `image-${i + 1}.${contentType.split('/')[1]}`
      );

      try {
        // Upload to R2
        const url = await R2Client.uploadFile(base64Image, key, contentType);
        uploadedUrls.push(url);
      } catch (uploadError) {
        console.error(`Error uploading image ${i + 1}:`, uploadError);
        // Continue with other images
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any images', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      message: `${uploadedUrls.length} images uploaded successfully`,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images', success: false },
      { status: 500 }
    );
  }
}
