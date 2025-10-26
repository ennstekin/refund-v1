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
    const search = searchParams.get('search');

    // Fetch orders from ikas
    const ikasClient = getIkas(authToken);

    console.log('Fetching orders with params:', { limit, search, sort: '-orderedAt' });

    // Build query parameters - only include search if it exists
    const queryParams: any = {
      pagination: {
        limit,
      },
      sort: '-orderedAt',
    };

    if (search) {
      queryParams.search = search;
    }

    const ordersResponse = await ikasClient.queries.listOrder(queryParams);

    console.log('iKAS response:', {
      isSuccess: ordersResponse.isSuccess,
      hasData: !!ordersResponse.data,
      dataCount: ordersResponse.data?.listOrder?.data?.length || 0,
      errors: ordersResponse.errors,
    });

    if (!ordersResponse.isSuccess) {
      console.error('iKAS query failed:', ordersResponse.errors);
      return NextResponse.json({
        error: 'iKAS siparişleri getiremedi',
        details: ordersResponse.errors
      }, { status: 500 });
    }

    if (!ordersResponse.data?.listOrder?.data) {
      console.log('No orders data in response');
      return NextResponse.json({ data: [] });
    }

    console.log(`Found ${ordersResponse.data.listOrder.data.length} orders`);
    return NextResponse.json({ data: ordersResponse.data.listOrder.data });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    return NextResponse.json({
      error: 'Sipariş listesi alınırken hata oluştu',
      details: error.message
    }, { status: 500 });
  }
}
