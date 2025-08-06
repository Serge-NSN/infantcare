// src/app/page.tsx
"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDashboardLink } from '@/lib/utils/getDashboardLink'; 
import { Skeleton } from '@/components/ui/skeleton'; 
import { HeartHandshake, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardTitle, CardDescription, CardHeader, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (currentUser) {
        const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        if (userRole) {
          router.replace(getDashboardLink(userRole));
        } else {
          router.replace(getDashboardLink(null)); 
        }
      } else {
        setIsRedirecting(false); 
      }
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-background">
        <Skeleton className="h-16 w-3/4 md:w-1/2 mb-6 rounded-lg" />
        <Skeleton className="h-8 w-5/6 md:w-2/3 mb-8 rounded-md" />
        <div className="flex gap-4">
          <Skeleton className="h-14 w-40 rounded-lg" />
          <Skeleton className="h-14 w-40 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-[calc(80vh-4rem)] flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-background">
        <Image
          src="https://images.unsplash.com/photo-1599045118108-bf2e0a775e13?q=80&w=2940&auto=format&fit=crop"
          alt="Pediatric care background with happy child and doctor"
          layout="fill"
          objectFit="cover"
          quality={85}
          className="opacity-20 z-0"
          data-ai-hint="happy child doctor"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-0"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center space-y-8 text-foreground max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight drop-shadow-lg">
            Welcome to the Improved Teleneonatal Care System
          </h1>
          <p className="text-xl md:text-2xl font-body text-foreground/80 drop-shadow-md leading-relaxed">
            Bridging the gap in infant healthcare through seamless collaboration and advanced technology.
            Connect with specialists, manage patient data, and provide the best care for our youngest patients.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-7 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Link href="/signup">Get Started <ArrowRight className="ml-2 h-5 w-5"/></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border text-foreground bg-background/50 hover:bg-background/80 hover:text-foreground px-10 py-7 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Link href="/education">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-headline text-center text-foreground mb-16">Why Choose InfantCare?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<HeartHandshake className="h-12 w-12 text-primary" />}
              title="Collaborative Care"
              description="Connect caregivers, doctors, and specialists on one unified platform for holistic infant healthcare."
            />
            <FeatureCard
              icon={<Users className="h-12 w-12 text-accent" />}
              title="Efficient Workflow"
              description="Streamline patient registration, data management, test requests, and feedback processes."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-12 w-12 text-green-600" />}
              title="Secure & Reliable"
              description="Built with security in mind to protect sensitive patient data and ensure reliable access."
            />
          </div>
        </div>
      </section>
    </>
  );
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <Card className="bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-xl p-8 text-center transform hover:-translate-y-2">
    <CardHeader className="p-0 mb-4">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <CardTitle className="text-2xl font-headline mb-3 text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
    </CardContent>
  </Card>
);
