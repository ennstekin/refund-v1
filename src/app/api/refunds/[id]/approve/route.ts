import { getIkas } from '@/helpers/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST - Approves a refund request and processes it through iKAS
 */
export async function POST(request: NextRequest, context: RouteContext) {
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
    const body = await request.json();
    const {
      refundShipping = false,
      sendNotificationToCustomer = true,
      restockItems = true,
      reason
    } = body;

    // Get refund request from database
    const refundRequest = await prisma.refundRequest.findFirst({
      where: {
        id,
        merchantId: user.merchantId,
      },
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // Check if already approved
    if (refundRequest.status === 'completed') {
      return NextResponse.json({ error: 'Refund already approved' }, { status: 400 });
    }

    // Fetch order details from ikas to get orderLineItems
    const ikasClient = getIkas(authToken);
    const orderResponse = await ikasClient.queries.listOrderDetail({
      id: { eq: refundRequest.orderId },
    });

    const orderData = orderResponse.isSuccess && orderResponse.data?.listOrder?.data?.[0];
    if (!orderData || !orderData.orderLineItems || orderData.orderLineItems.length === 0) {
      return NextResponse.json({ error: 'Order not found or has no items' }, { status: 404 });
    }

    // Prepare refund lines from order line items
    const orderRefundLines = orderData.orderLineItems.map((item: any) => ({
      orderLineItemId: item.id,
      price: item.finalPrice,
      quantity: item.quantity,
      restockItems: restockItems,
    }));

    // Call iKAS refundOrderLine mutation
    const refundResponse = await ikasClient.mutations.refundOrderLine({
      input: {
        orderId: refundRequest.orderId,
        orderRefundLines,
        reason: reason || refundRequest.reason || 'Customer requested refund',
        refundShipping,
        sendNotificationToCustomer,
      },
    });

    if (!refundResponse.isSuccess) {
      console.error('Failed to process refund in iKAS:', refundResponse.errors);
      return NextResponse.json(
        { error: 'Failed to process refund in iKAS', details: refundResponse.errors },
        { status: 500 }
      );
    }

    // Update refund status to completed
    await prisma.refundRequest.update({
      where: { id },
      data: { status: 'completed' },
    });

    // Create timeline event
    await prisma.refundTimeline.create({
      data: {
        refundRequestId: id,
        eventType: 'approved',
        description: 'İade onaylandı ve iKAS\'ta işleme alındı',
        eventData: JSON.stringify({
          refundShipping,
          sendNotificationToCustomer,
          restockItems,
          orderNumber: orderData.orderNumber,
        }),
        createdBy: user.merchantId,
      },
    });

    return NextResponse.json({
      data: {
        success: true,
        message: 'Refund approved successfully',
        refundId: id,
        orderNumber: orderData.orderNumber,
      },
    });
  } catch (error) {
    console.error('Error approving refund:', error);
    return NextResponse.json(
      { error: 'Failed to approve refund', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
