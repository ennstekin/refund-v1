import { NextRequest, NextResponse } from 'next/server';
import { getIkas } from '@/helpers/api-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';
import { SubdomainHelpers } from '@/helpers/subdomain-helpers';

/**
 * POST - Public endpoint to verify order by order number and email
 * This endpoint doesn't require JWT authentication as it's for customers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, email } = body;

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: 'Sipariş numarası ve email adresi gerekli' },
        { status: 400 }
      );
    }

    // Get the merchant's authorized app ID from subdomain (header), query params, or fallback
    // Priority: subdomain > storeId > storeName > fallback
    const subdomain = request.headers.get('x-subdomain');
    const url = new URL(request.url);
    const storeId = url.searchParams.get('storeId');
    const storeName = url.searchParams.get('storeName');

    let merchant;

    // 1. Try subdomain first (most secure, multi-tenant)
    if (subdomain) {
      const merchantId = await SubdomainHelpers.getMerchantBySubdomain(subdomain);
      if (merchantId) {
        merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      }
    }

    // 2. Development mode - use mock merchant
    if (!merchant && process.env.DEV_MODE === 'true' && storeId === process.env.DEV_MERCHANT_ID) {
      merchant = {
        id: process.env.DEV_MERCHANT_ID || '',
        authorizedAppId: process.env.DEV_AUTHORIZED_APP_ID || '',
        storeName: 'dev-test-store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 3. Find by merchant ID (backward compatibility)
    if (!merchant && storeId) {
      merchant = await prisma.merchant.findUnique({ where: { id: storeId } });
    }

    // 4. Find by store name (backward compatibility)
    if (!merchant && storeName) {
      merchant = await prisma.merchant.findFirst({ where: { storeName } });
    }

    // 5. Fallback: get first available merchant (backward compatibility)
    if (!merchant) {
      merchant = await prisma.merchant.findFirst();
    }

    if (!merchant) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı' },
        { status: 404 }
      );
    }
    const authToken = await AuthTokenManager.get(merchant.authorizedAppId);

    if (!authToken) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 500 }
      );
    }

    // Development mode - return mock order data
    if (process.env.DEV_MODE === 'true' && authToken.accessToken === 'mock_access_token_for_development') {
      const mockOrders = [
        {
          id: '1001',
          orderNumber: '1001',
          totalFinalPrice: 150.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1002',
          orderNumber: '1002',
          totalFinalPrice: 250.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1003',
          orderNumber: '1003',
          totalFinalPrice: 89.99,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1004',
          orderNumber: '1004',
          totalFinalPrice: 399.90,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1005',
          orderNumber: '1005',
          totalFinalPrice: 599.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1006',
          orderNumber: '1006',
          totalFinalPrice: 129.50,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 1 hafta önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1007',
          orderNumber: '1007',
          totalFinalPrice: 799.99,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 15 * 86400000).toISOString(), // 15 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1008',
          orderNumber: '1008',
          totalFinalPrice: 199.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1009',
          orderNumber: '1009',
          totalFinalPrice: 449.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 20 * 86400000).toISOString(), // 20 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1010',
          orderNumber: '1010',
          totalFinalPrice: 99.90,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 6 * 86400000).toISOString(), // 6 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1011',
          orderNumber: '1011',
          totalFinalPrice: 1299.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 12 * 86400000).toISOString(), // 12 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1012',
          orderNumber: '1012',
          totalFinalPrice: 349.50,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 8 * 86400000).toISOString(), // 8 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1013',
          orderNumber: '1013',
          totalFinalPrice: 899.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 25 * 86400000).toISOString(), // 25 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1014',
          orderNumber: '1014',
          totalFinalPrice: 179.90,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 9 * 86400000).toISOString(), // 9 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
        {
          id: '1015',
          orderNumber: '1015',
          totalFinalPrice: 2499.00,
          currencySymbol: '₺',
          orderedAt: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 gün önce
          customer: {
            firstName: 'Test',
            lastName: 'Müşteri',
            email: 'test@test.com',
          },
        },
      ];

      const order = mockOrders.find(o => o.orderNumber === orderNumber.trim());

      if (!order) {
        return NextResponse.json(
          { error: 'Sipariş bulunamadı', verified: false },
          { status: 404 }
        );
      }

      // Verify email matches
      const orderEmail = order.customer?.email?.toLowerCase();
      const providedEmail = email.trim().toLowerCase();

      if (orderEmail !== providedEmail) {
        return NextResponse.json(
          { error: 'Email adresi sipariş ile eşleşmiyor', verified: false },
          { status: 400 }
        );
      }

      // Check if refund already exists
      const existingRefund = await prisma.refundRequest.findUnique({
        where: { orderId: order.id },
      });

      if (existingRefund) {
        return NextResponse.json(
          {
            error: 'Bu sipariş için zaten bir iade talebi mevcut',
            verified: false,
            refundExists: true,
            refundId: existingRefund.id,
          },
          { status: 409 }
        );
      }

      // Return verified order data
      return NextResponse.json({
        verified: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalFinalPrice: order.totalFinalPrice,
          currencySymbol: order.currencySymbol,
          orderedAt: order.orderedAt,
          customer: order.customer,
          merchantId: merchant.id,
        },
      });
    }

    // Search for order using lightweight query (faster performance)
    const ikasClient = getIkas(authToken);

    let orderResponse;
    let lastError: any;

    // Retry mechanism: Try up to 2 times with 2 second delay
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Attempt ${attempt}/2] Querying order ${orderNumber.trim()}`);

        // Use minimal field query for faster response
        orderResponse = await ikasClient.queries.verifyOrder({
          orderNumber: { eq: orderNumber.trim() },
          pagination: { limit: 1 },
        });

        console.log(`[Attempt ${attempt}/2] Success!`);
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`[Attempt ${attempt}/2] ikas API error:`, error.message || error);

        // If it's the last attempt, don't retry
        if (attempt === 2) {
          // Handle timeout or network errors
          if (error.code === 'ERR_BAD_RESPONSE' || error.status === 504) {
            return NextResponse.json(
              { error: 'Mağaza sistemi şu an çok yoğun. Lütfen 1 dakika sonra tekrar deneyin.', verified: false },
              { status: 503 }
            );
          }

          return NextResponse.json(
            { error: 'Sipariş sorgulanırken bir hata oluştu. Lütfen tekrar deneyin.', verified: false },
            { status: 500 }
          );
        }

        // Wait 2 seconds before retry
        console.log(`[Attempt ${attempt}/2] Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!orderResponse.isSuccess || !orderResponse.data?.listOrder?.data?.[0]) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı', verified: false },
        { status: 404 }
      );
    }

    const order = orderResponse.data.listOrder.data[0];

    // Verify email matches
    const orderEmail = order.customer?.email?.toLowerCase();
    const providedEmail = email.trim().toLowerCase();

    if (orderEmail !== providedEmail) {
      return NextResponse.json(
        { error: 'Email adresi sipariş ile eşleşmiyor', verified: false },
        { status: 400 }
      );
    }

    // Check if refund already exists
    const existingRefund = await prisma.refundRequest.findUnique({
      where: { orderId: order.id },
    });

    if (existingRefund) {
      return NextResponse.json(
        {
          error: 'Bu sipariş için zaten bir iade talebi mevcut',
          verified: false,
          refundExists: true,
          refundId: existingRefund.id,
        },
        { status: 409 }
      );
    }

    // Return verified order data
    return NextResponse.json({
      verified: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalFinalPrice: order.totalFinalPrice,
        currencySymbol: order.currencySymbol,
        orderedAt: order.orderedAt,
        customer: {
          firstName: order.customer?.firstName,
          lastName: order.customer?.lastName,
          email: order.customer?.email,
        },
        merchantId: merchant.id,
      },
    });
  } catch (error) {
    console.error('Error verifying order:', error);
    return NextResponse.json(
      { error: 'Sipariş doğrulama sırasında bir hata oluştu', verified: false },
      { status: 500 }
    );
  }
}
