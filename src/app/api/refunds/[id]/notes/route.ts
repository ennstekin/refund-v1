import { getUserFromRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST - Adds a note to a refund request
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { content, createdBy } = body;

    if (!content || !createdBy) {
      return NextResponse.json({ error: 'content and createdBy are required' }, { status: 400 });
    }

    // Verify refund request exists and belongs to this merchant
    const refundRequest = await prisma.refundRequest.findFirst({
      where: {
        id,
        merchantId: user.merchantId,
      },
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // Create note
    const note = await prisma.refundNote.create({
      data: {
        refundRequestId: id,
        content,
        createdBy,
      },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

/**
 * GET - Fetches all notes for a refund request
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify refund request exists and belongs to this merchant
    const refundRequest = await prisma.refundRequest.findFirst({
      where: {
        id,
        merchantId: user.merchantId,
      },
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // Get all notes
    const notes = await prisma.refundNote.findMany({
      where: {
        refundRequestId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}
