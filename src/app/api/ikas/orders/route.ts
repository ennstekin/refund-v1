import { getIkas } from '@/helpers/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Fetches orders from ikas
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

    // Development mode - return mock orders
    if (process.env.DEV_MODE === 'true' && authToken.accessToken === 'mock_access_token_for_development') {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';

      const mockOrders = Array.from({ length: 15 }, (_, i) => {
        const orderNumber = `${1001 + i}`;
        const daysAgo = [2, 5, 1, 10, 3, 7, 15, 4, 20, 6, 12, 8, 25, 9, 30][i];
        const prices = [150.00, 250.00, 89.99, 399.90, 599.00, 129.50, 799.99, 199.00, 449.00, 99.90, 1299.00, 349.50, 899.00, 179.90, 2499.00];
        const statuses = ['DELIVERED', 'DELIVERED', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'DELIVERED'];

        return {
          id: orderNumber,
          orderNumber,
          status: 'COMPLETED',
          orderPaymentStatus: 'PAID',
          orderPackageStatus: statuses[i],
          totalFinalPrice: prices[i],
          currencyCode: 'TRY',
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        };
      });

      const filtered = search
        ? mockOrders.filter(o => o.orderNumber.includes(search) || o.customer.email?.includes(search))
        : mockOrders;

      return NextResponse.json({ data: filtered });
    }

    // Get params from query
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || undefined;

    // Fetch orders from ikas
    const ikasClient = getIkas(authToken);
    const ordersResponse = await ikasClient.queries.listOrder({
      pagination: {
        limit,
      },
      sort: '-orderedAt',
      search, // Search by order number, customer name, email, etc.
    });

    if (!ordersResponse.isSuccess || !ordersResponse.data?.listOrder?.data) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({ data: ordersResponse.data.listOrder.data });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
