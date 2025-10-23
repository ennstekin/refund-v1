import { getIkas } from '@/helpers/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Fetches refund orders from ikas (last 90 days)
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

    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch refund orders from ikas
    const ikasClient = getIkas(authToken);
    const refundOrdersResponse = await ikasClient.queries.listRefundOrders({
      pagination: {
        limit: 100,
      },
      orderedAt: {
        gte: ninetyDaysAgo.toISOString(),
      },
    });

    if (!refundOrdersResponse.isSuccess) {
      console.error('Failed to fetch refund orders:', refundOrdersResponse.error);
      return NextResponse.json({ error: 'Failed to fetch refund orders' }, { status: 500 });
    }

    if (!refundOrdersResponse.data?.listOrder?.data) {
      // No refund orders found - return empty array with success status
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: refundOrdersResponse.data.listOrder.data });
  } catch (error) {
    console.error('Error fetching refund orders:', error);
    return NextResponse.json({ error: 'Failed to fetch refund orders', details: String(error) }, { status: 500 });
  }
}
