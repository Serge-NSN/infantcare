// src/app/page.tsx
"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDashboardLink } from '@/lib/utils/getDashboardLink'; // Ensure this path is correct
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function HomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (currentUser) {
        // User is authenticated, try to get role from localStorage (set during login)
        const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        if (userRole) {
          router.replace(getDashboardLink(userRole));
        } else {
          // If role not in localStorage (e.g., direct navigation after login but before localStorage set),
          // or if a more robust role check is needed, this could be a point for Firestore fetch.
          // For now, if role is missing, we might keep them here or redirect to a generic logged-in page.
          // Or, assume logout if role cannot be determined for a logged-in user (could be an inconsistent state).
          // For simplicity, if role is missing but user is there, we assume a redirect to a default if needed,
          // but getDashboardLink will handle default cases.
          // The login process *should* set the role.
          router.replace(getDashboardLink(null)); // Redirect to login if role is unexpectedly missing
        }
      } else {
        setIsRedirecting(false); // Not authenticated, no redirect needed, show homepage
      }
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || isRedirecting) {
    // Show a full-page loading skeleton or a simpler loading message
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-3/4 mb-6" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 text-center overflow-hidden">
      {/* Background Image */}
      <Image
        src="https://images.unsplash.com/photo-1547082722-ebad0c0cb815?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt="Pediatric care background"
        layout="fill"
        objectFit="cover"
        quality={80}
        className="opacity-30 z-0"
        data-ai-hint="healthcare children"
        priority // Ensures the LCP image is prioritized
      />

      {/* Darker Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 text-white">
        <h1 className="text-5xl md:text-7xl font-headline font-bold drop-shadow-md">
          Welcome to InfantCare
        </h1>
        <p className="text-lg md:text-2xl max-w-3xl font-body drop-shadow-sm">
          Bridging the gap in infant healthcare through seamless collaboration and advanced technology.
          Connect with specialists, manage patient data, and provide the best care for our youngest patients.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/20 hover:text-white px-8 py-6 text-lg">
            <Link href="/education">Learn More</Link>
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-8 z-10 text-white/70 text-sm font-body">
        Empowering caregivers, doctors, and specialists for a healthier future.
      </div>
    </div>
  );
}
