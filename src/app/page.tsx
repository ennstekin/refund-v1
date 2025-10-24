'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

/**
 * Home page - ikas Dashboard Entry Point
 *
 * When accessed from ikas admin panel, shows the dashboard
 * Customer portal is accessed via /portal route
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard for ikas admin access
    router.replace('/dashboard');
  }, [router]);

  return <Loading />;
}