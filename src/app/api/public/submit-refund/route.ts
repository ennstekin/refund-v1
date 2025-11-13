import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp, getRateLimitMessage } from '@/lib/rate-limit';

/**
 * POST - Public endpoint to submit refund request from customer portal
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP (strict for submissions)
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, {
      max: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIp} on submit-refund`);
      return NextResponse.json(
        {
          error: getRateLimitMessage(rateLimitResult),
          success: false,
        },
        { status: 429 }
      );
    }

    // Get subdomain from middleware header
    const subdomain = request.headers.get('x-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Geçersiz portal adresi. Lütfen mağazanızın portal URL\'ini kullanın.', success: false },
        { status: 400 }
      );
    }

    // Get merchant by subdomain
    const merchant = await prisma.merchant.findUnique({
      where: {
        subdomain: subdomain.toLowerCase(),
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı', success: false },
        { status: 404 }
      );
    }

    // Validate merchant is active and portal is enabled
    if (!merchant.portalEnabled || merchant.subdomainStatus !== 'active') {
      return NextResponse.json(
        { error: 'Bu mağaza için portal hizmeti aktif değil', success: false },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, orderNumber, customerEmail, reason, reasonNote, images } = body;

    if (!orderId || !orderNumber || !customerEmail || !reason) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik', success: false },
        { status: 400 }
      );
    }

    // Use merchantId from database lookup (not from request body)
    const merchantId = merchant.id;

    // Check if refund already exists
    const existing = await prisma.refundRequest.findUnique({
      where: { orderId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu sipariş için zaten bir iade talebi mevcut', success: false },
        { status: 409 }
      );
    }

    // Create refund request
    // Note: images now contains R2 public URLs, not base64 strings
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        orderNumber,
        merchantId,
        status: 'pending',
        reason,
        reasonNote: reasonNote || null,
        trackingNumber: null,
        images: images && images.length > 0 ? JSON.stringify(images) : null, // Storing R2 URLs
        source: 'portal', // Portal'dan oluşturulan iade
      },
    });

    // Create initial timeline event
    await prisma.refundTimeline.create({
      data: {
        refundRequestId: refundRequest.id,
        eventType: 'created',
        eventData: JSON.stringify({
          orderId,
          orderNumber,
          customerEmail,
          source: 'customer_portal',
          hasImages: images && images.length > 0,
          imageCount: images?.length || 0,
        }),
        description: 'Müşteri iade talebi oluşturdu',
        createdBy: customerEmail,
      },
    });

    // In production, you would:
    // 1. Upload images to storage service (S3, Cloudinary, etc.)
    // 2. Send email notification to merchant
    // 3. Send confirmation email to customer

    // For now, we'll just store image data in a note
    if (images && images.length > 0) {
      await prisma.refundNote.create({
        data: {
          refundRequestId: refundRequest.id,
          content: `Müşteri ${images.length} adet fotoğraf yükledi`,
          createdBy: customerEmail,
        },
      });

      // Add timeline for image upload
      await prisma.refundTimeline.create({
        data: {
          refundRequestId: refundRequest.id,
          eventType: 'note_added',
          eventData: JSON.stringify({ imageCount: images.length }),
          description: `${images.length} adet fotoğraf yüklendi`,
          createdBy: customerEmail,
        },
      });
    }

    return NextResponse.json({
      success: true,
      refundId: refundRequest.id,
      message: 'İade talebiniz başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Error submitting refund:', error);
    return NextResponse.json(
      { error: 'İade talebi oluşturulurken bir hata oluştu', success: false },
      { status: 500 }
    );
  }
}
