'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

/**
 * Home page - Routes to appropriate destination based on deployment
 *
 * Vercel Deployment: Redirects to /portal (public customer portal)
 * ikas App: Will use /dashboard or /refunds as entry point
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to portal for public access
    router.replace('/portal');
  }, [router]);

  return <Loading />;
}