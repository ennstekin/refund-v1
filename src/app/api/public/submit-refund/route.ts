import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST - Public endpoint to submit refund request from customer portal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, orderNumber, merchantId, customerEmail, reason, reasonNote, images } = body;

    if (!orderId || !orderNumber || !merchantId || !customerEmail || !reason) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik', success: false },
        { status: 400 }
      );
    }

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
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        orderNumber,
        merchantId,
        status: 'pending',
        reason,
        reasonNote: reasonNote || null,
        trackingNumber: null,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
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
