'use client';

import { useRouter } from 'next/navigation';

type BackButtonProps = {
  fallbackUrl?: string;
  className?: string;
  label?: string;
};

export function BackButton({ fallbackUrl, className = '', label = 'Geri' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (fallbackUrl) {
      router.push(fallbackUrl);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="font-medium">{label}</span>
    </button>
  );
}
