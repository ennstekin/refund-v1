'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenHelpers } from '@/helpers/token-helpers';
import Loading from '@/components/Loading';

/**
 * Home page - ikas App Entry Point
 *
 * Checks if user has authorized the app:
 * - If authorized (token exists) → redirects to dashboard
 * - If not authorized → redirects to authorize-store for OAuth flow
 */
export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        console.log('[Home] Checking authorization...');

        // Try to get token from ikas app bridge
        const token = await TokenHelpers.getTokenForIframeApp();
        console.log('[Home] Token received:', token ? 'YES' : 'NO');

        if (token) {
          // Token exists, user is authorized → go to dashboard
          console.log('[Home] Redirecting to /dashboard');
          router.replace('/dashboard');
        } else {
          // No token, need to authorize → go to authorize-store
          console.log('[Home] Redirecting to /authorize-store');
          router.replace('/authorize-store');
        }
      } catch (error) {
        console.error('[Home] Error checking authorization:', error);
        // On error, redirect to authorize-store to start OAuth flow
        console.log('[Home] Redirecting to /authorize-store (error)');
        router.replace('/authorize-store');
      } finally {
        setChecking(false);
      }
    };

    checkAuthorization();
  }, [router]);

  return <Loading />;
}