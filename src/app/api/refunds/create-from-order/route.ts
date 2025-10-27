import { getIkas } from '@/helpers/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST - Creates a refund request from an iKAS order
 * This is used when clicking "Create Refund" from the iKAS orders tab
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authToken = await AuthTokenManager.get(user.authorizedAppId);
    if (!authToken) {
      return NextResponse.json({ error: 'Auth token not found' }, { status: 404 });
    }

    const body = await request.json();
    const { orderId, orderNumber } = body;

    if (!orderId || !orderNumber) {
      return NextResponse.json({ error: 'orderId and orderNumber are required' }, { status: 400 });
    }

    // Check if refund already exists for this order
    const existingRefund = await prisma.refundRequest.findFirst({
      where: {
        orderId,
        merchantId: user.merchantId,
      },
    });

    if (existingRefund) {
      // Return existing refund instead of creating duplicate
      return NextResponse.json({
        data: {
          id: existingRefund.id,
          message: 'Refund request already exists for this order',
          existing: true,
        },
      });
    }

    // Verify order exists in iKAS
    const ikasClient = getIkas(authToken);
    const orderResponse = await ikasClient.queries.listOrderDetail({
      id: { eq: orderId },
    });

    if (!orderResponse.isSuccess || !orderResponse.data?.listOrder?.data?.[0]) {
      return NextResponse.json({ error: 'Order not found in iKAS' }, { status: 404 });
    }

    // Create refund request
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        orderNumber,
        merchantId: user.merchantId,
        status: 'pending',
        source: 'dashboard', // Created from dashboard, not portal
        trackingNumber: null,
        reason: null,
        reasonNote: null,
      },
    });

    // Create timeline event
    await prisma.refundTimeline.create({
      data: {
        refundRequestId: refundRequest.id,
        eventType: 'created',
        description: 'İade kaydı iKAS siparişinden oluşturuldu',
        eventData: JSON.stringify({
          orderId,
          orderNumber,
          createdFrom: 'ikas_orders_tab',
        }),
        createdBy: user.merchantId,
      },
    });

    return NextResponse.json({
      data: {
        id: refundRequest.id,
        message: 'Refund request created successfully',
        existing: false,
      },
    });
  } catch (error) {
    console.error('Error creating refund from order:', error);
    return NextResponse.json(
      { error: 'Failed to create refund request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
