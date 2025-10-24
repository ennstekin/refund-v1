import { getIkas } from '@/helpers/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Fetches all refund requests with order details from ikas
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authToken = await AuthTokenManager.get(user.authorizedAppId);
    if (!authToken) {
      return NextResponse.json({ error: 'Auth token not found' }, { status: 404 });
    }

    // Get all refund requests from database
    const refundRequests = await prisma.refundRequest.findMany({
      where: {
        merchantId: user.merchantId,
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch order details from ikas for each refund
    const ikasClient = getIkas(authToken);
    const refundsWithOrders = await Promise.all(
      refundRequests.map(async (refund) => {
        try {
          const orderResponse = await ikasClient.queries.listOrderDetail({
            id: { eq: refund.orderId },
          });

          const orderData = orderResponse.isSuccess && orderResponse.data?.listOrder?.data?.[0]
            ? orderResponse.data.listOrder.data[0]
            : null;

          return {
            ...refund,
            orderData,
          };
        } catch (error) {
          console.error(`Error fetching order ${refund.orderId}:`, error);
          return {
            ...refund,
            orderData: null,
          };
        }
      })
    );

    return NextResponse.json({ data: refundsWithOrders });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 });
  }
}

/**
 * POST - Creates a new refund request
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderNumber, status = 'pending', trackingNumber, reason, reasonNote } = body;

    if (!orderId || !orderNumber) {
      return NextResponse.json({ error: 'orderId and orderNumber are required' }, { status: 400 });
    }

    // Check if refund request already exists
    const existing = await prisma.refundRequest.findUnique({
      where: { orderId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Refund request already exists for this order' }, { status: 409 });
    }

    // Create new refund request with timeline
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        orderNumber,
        merchantId: user.merchantId,
        status,
        trackingNumber: trackingNumber || null,
        reason: reason || null,
        reasonNote: reasonNote || null,
        source: 'dashboard', // Dashboard'dan manuel oluşturulan iade
      },
    });

    // Create initial timeline event
    await prisma.refundTimeline.create({
      data: {
        refundRequestId: refundRequest.id,
        eventType: 'created',
        eventData: JSON.stringify({ orderId, orderNumber }),
        description: 'Manuel iade kaydı oluşturuldu',
        createdBy: 'Yönetici',
      },
    });

    return NextResponse.json({ data: refundRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating refund request:', error);
    return NextResponse.json({ error: 'Failed to create refund request' }, { status: 500 });
  }
}
