import { NextRequest, NextResponse } from 'next/server';
import { getIkas } from '@/helpers/api-helpers';
import { AuthTokenManager } from '@/lib/auth-token-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, tagIds, authorizedAppId } = body;

    if (!customerId || !tagIds || !authorizedAppId) {
      return NextResponse.json(
        { error: 'customerId, tagIds, and authorizedAppId are required' },
        { status: 400 }
      );
    }

    // Get auth token
    const authToken = await AuthTokenManager.get(authorizedAppId);
    if (!authToken) {
      return NextResponse.json(
        { error: 'Auth token not found' },
        { status: 404 }
      );
    }

    // Get ikas client
    const ikasClient = getIkas(authToken);

    // Update customer with new tags
    const response = await ikasClient.mutations.updateCustomer({
      id: customerId,
      tagIds: tagIds,
    });

    if (response.isSuccess && response.data) {
      return NextResponse.json({
        success: true,
        data: response.data,
      });
    }

    return NextResponse.json(
      { error: 'Failed to update customer', details: response.error },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error updating customer tag:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
