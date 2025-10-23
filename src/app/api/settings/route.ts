import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getIkas } from '@/helpers/api-helpers';
import { AuthTokenManager } from '@/models/auth-token/manager';

/**
 * GET - Fetch merchant settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create merchant settings
    let merchant = await prisma.merchant.findUnique({
      where: { authorizedAppId: user.authorizedAppId },
    });

    if (!merchant) {
      // Create merchant record if doesn't exist
      const authToken = await AuthTokenManager.get(user.authorizedAppId);
      if (authToken) {
        const ikasClient = getIkas(authToken);
        const merchantResponse = await ikasClient.queries.getMerchant();

        merchant = await prisma.merchant.create({
          data: {
            id: user.merchantId,
            authorizedAppId: user.authorizedAppId,
            storeName: merchantResponse.data?.getMerchant?.storeName || null,
            email: merchantResponse.data?.getMerchant?.email || null,
            portalEnabled: true,
          },
        });
      } else {
        // Create with minimal data
        merchant = await prisma.merchant.create({
          data: {
            id: user.merchantId,
            authorizedAppId: user.authorizedAppId,
            portalEnabled: true,
          },
        });
      }
    }

    return NextResponse.json({ data: merchant });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PATCH - Update merchant settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { portalUrl, portalEnabled } = body;

    // Update merchant settings
    const merchant = await prisma.merchant.upsert({
      where: { authorizedAppId: user.authorizedAppId },
      update: {
        portalUrl: portalUrl || null,
        portalEnabled: portalEnabled !== undefined ? portalEnabled : true,
      },
      create: {
        id: user.merchantId,
        authorizedAppId: user.authorizedAppId,
        portalUrl: portalUrl || null,
        portalEnabled: portalEnabled !== undefined ? portalEnabled : true,
      },
    });

    return NextResponse.json({ data: merchant });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
