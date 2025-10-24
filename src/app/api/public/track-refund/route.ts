import { NextRequest, NextResponse } from 'next/server';
import { getIkas } from '@/helpers/api-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';

/**
 * GET - Public endpoint to track refund status by refund ID
 * Query params: refundId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refundId = searchParams.get('refundId');

    if (!refundId) {
      return NextResponse.json(
        { error: 'İade takip numarası gerekli', success: false },
        { status: 400 }
      );
    }

    // Get refund request
    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        timeline: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!refund) {
      return NextResponse.json(
        { error: 'İade talebi bulunamadı', success: false },
        { status: 404 }
      );
    }

    // Get merchant and auth token to fetch order details
    const merchant = await prisma.merchant.findUnique({
      where: { id: refund.merchantId },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı', success: false },
        { status: 404 }
      );
    }

    const authToken = await AuthTokenManager.get(merchant.authorizedAppId);

    if (!authToken) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası', success: false },
        { status: 500 }
      );
    }

    // Development mode - return mock data
    if (process.env.DEV_MODE === 'true' && authToken.accessToken === 'mock_access_token_for_development') {
      const mockOrders = Array.from({ length: 15 }, (_, i) => {
        const orderNumber = `${1001 + i}`;
        const daysAgo = [2, 5, 1, 10, 3, 7, 15, 4, 20, 6, 12, 8, 25, 9, 30][i];
        const prices = [150.00, 250.00, 89.99, 399.90, 599.00, 129.50, 799.99, 199.00, 449.00, 99.90, 1299.00, 349.50, 899.00, 179.90, 2499.00];

        return {
          id: orderNumber,
          orderNumber,
          totalFinalPrice: prices[i],
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        };
      });

      const order = mockOrders.find(o => o.id === refund.orderId);

      return NextResponse.json({
        success: true,
        refund: {
          id: refund.id,
          orderNumber: refund.orderNumber,
          status: refund.status,
          reason: refund.reason,
          reasonNote: refund.reasonNote,
          trackingNumber: refund.trackingNumber,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt,
          order: order || null,
          timeline: refund.timeline,
          notes: refund.notes,
        },
      });
    }

    // Fetch order details from ikas
    const ikasClient = getIkas(authToken);
    const orderResponse = await ikasClient.queries.listOrderDetail({
      id: { eq: refund.orderId },
    });

    const orderData = orderResponse.isSuccess && orderResponse.data?.listOrder?.data?.[0]
      ? orderResponse.data.listOrder.data[0]
      : null;

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        orderNumber: refund.orderNumber,
        status: refund.status,
        reason: refund.reason,
        reasonNote: refund.reasonNote,
        trackingNumber: refund.trackingNumber,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt,
        order: orderData,
        timeline: refund.timeline,
        notes: refund.notes,
      },
    });
  } catch (error) {
    console.error('Error tracking refund:', error);
    return NextResponse.json(
      { error: 'İade takip sırasında bir hata oluştu', success: false },
      { status: 500 }
    );
  }
}
