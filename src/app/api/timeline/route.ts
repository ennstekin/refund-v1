import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';

/**
 * GET - Fetch recent timeline events across all refunds
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent timeline events (last 10)
    const timeline = await prisma.refundTimeline.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        refundRequest: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      where: {
        refundRequest: {
          merchantId: user.merchantId,
        },
      },
    });

    return NextResponse.json({ data: timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: 'Timeline verisi alınamadı' },
      { status: 500 }
    );
  }
}
