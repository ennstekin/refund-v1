import { NextRequest, NextResponse } from 'next/server';
import { getIkas } from '@/helpers/api-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { prisma } from '@/lib/prisma';

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

    // Get the merchant's authorized app ID from query params or headers
    // For now, we'll get the first available merchant (in production, you'd identify by domain)
    const merchants = await prisma.merchant.findMany({
      take: 1,
    });

    if (merchants.length === 0) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı' },
        { status: 404 }
      );
    }

    const merchant = merchants[0];
    const authToken = await AuthTokenManager.get(merchant.authorizedAppId);

    if (!authToken) {
      return NextResponse.json(
        { error: 'Yetkilendirme hatası' },
        { status: 500 }
      );
    }

    // Search for order in ikas
    const ikasClient = getIkas(authToken);
    const orderResponse = await ikasClient.queries.listOrder({
      pagination: { limit: 1 },
      search: orderNumber.trim(),
    });

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
