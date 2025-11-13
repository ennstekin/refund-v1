import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/helpers/api-helpers';
import { prisma } from '@/lib/prisma';
import { SubdomainHelpers } from '@/helpers/subdomain-helpers';

/**
 * GET - Check subdomain availability
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const check = searchParams.get('check');

  if (!check) {
    return NextResponse.json({ error: 'Missing subdomain parameter' }, { status: 400 });
  }

  // Validate format
  const validation = SubdomainHelpers.validateSubdomainFormat(check);
  if (!validation.valid) {
    return NextResponse.json(
      {
        available: false,
        error: validation.error,
      },
      { status: 200 }
    );
  }

  // Check availability
  const isAvailable = await SubdomainHelpers.isSubdomainAvailable(check);

  return NextResponse.json({
    subdomain: check,
    available: isAvailable,
    error: isAvailable ? undefined : 'Bu subdomain kullanılamaz',
  });
}

/**
 * PATCH - Update merchant subdomain (limited to 1 change)
 */
export async function PATCH(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { subdomain } = body;

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain gerekli' }, { status: 400 });
  }

  // Validate format
  const validation = SubdomainHelpers.validateSubdomainFormat(subdomain);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Get current merchant
  const merchant = await prisma.merchant.findUnique({
    where: { authorizedAppId: user.authorizedAppId },
    select: {
      id: true,
      subdomain: true,
      subdomainChangeCount: true,
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant bulunamadı' }, { status: 404 });
  }

  // Check if subdomain is same as current
  if (merchant.subdomain === subdomain.toLowerCase()) {
    return NextResponse.json({ error: 'Bu subdomain zaten kullanılıyor' }, { status: 400 });
  }

  // Check change limit (max 1 change allowed)
  if (merchant.subdomainChangeCount >= 1) {
    return NextResponse.json(
      { error: 'Subdomain değişiklik hakkınız dolmuştur (maksimum 1 değişiklik)' },
      { status: 403 }
    );
  }

  // Check availability
  const isAvailable = await SubdomainHelpers.isSubdomainAvailable(subdomain);
  if (!isAvailable) {
    return NextResponse.json({ error: 'Bu subdomain kullanılamaz' }, { status: 409 });
  }

  // Update subdomain
  const updated = await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      subdomain: subdomain.toLowerCase(),
      subdomainStatus: 'active',
      subdomainChangedAt: new Date(),
      subdomainChangeCount: merchant.subdomainChangeCount + 1,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      subdomain: updated.subdomain,
      subdomainChangeCount: updated.subdomainChangeCount,
      canChangeAgain: updated.subdomainChangeCount < 1,
    },
  });
}
