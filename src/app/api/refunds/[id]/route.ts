import { getIkas } from '@/helpers/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET - Fetches a specific refund request with order details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authToken = await AuthTokenManager.get(user.authorizedAppId);
    if (!authToken) {
      return NextResponse.json({ error: 'Auth token not found' }, { status: 404 });
    }

    const { id } = await context.params;

    // Get refund request from database
    const refundRequest = await prisma.refundRequest.findFirst({
      where: {
        id,
        merchantId: user.merchantId,
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // Fetch order details from ikas
    const ikasClient = getIkas(authToken);
    const orderResponse = await ikasClient.queries.listOrderDetail({
      id: { eq: refundRequest.orderId },
    });

    const orderData = orderResponse.isSuccess && orderResponse.data?.listOrder?.data?.[0]
      ? orderResponse.data.listOrder.data[0]
      : null;

    return NextResponse.json({
      data: {
        ...refundRequest,
        orderData,
      },
    });
  } catch (error) {
    console.error('Error fetching refund:', error);
    return NextResponse.json({ error: 'Failed to fetch refund' }, { status: 500 });
  }
}

/**
 * PATCH - Updates a refund request
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, trackingNumber, reason, reasonNote } = body;

    // Update refund request
    const refundRequest = await prisma.refundRequest.updateMany({
      where: {
        id,
        merchantId: user.merchantId,
      },
      data: {
        ...(status && { status }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(reason !== undefined && { reason }),
        ...(reasonNote !== undefined && { reasonNote }),
      },
    });

    if (refundRequest.count === 0) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // Fetch updated refund request
    const updated = await prisma.refundRequest.findUnique({
      where: { id },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating refund:', error);
    return NextResponse.json({ error: 'Failed to update refund' }, { status: 500 });
  }
}
