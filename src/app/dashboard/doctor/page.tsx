// src/app/dashboard/doctor/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { BarChart3, AlertTriangle, ListFilter, Users, ClipboardCheck, Clock, GraduationCap, BriefcaseMedical, Activity, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DoctorDashboardStats {
  awaitingReviewCount: number; 
  myReviewedCount: number; 
  pendingSpecialistConsultationsCount: number; 
}

export default function DoctorDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DoctorDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
        setDoctorName(currentUser.displayName || localStorage.getItem('userFullName') || currentUser.email?.split('@')[0] || 'Doctor');
    }

    async function fetchDoctorStats() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) {
             setLoadingStats(false);
        }
        return;
      }

      setLoadingStats(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');

        const awaitingReviewQuery = query(
            patientsCollectionRef, 
            where('feedbackStatus', 'in', ['Pending Doctor Review', 'Specialist Feedback Provided'])
        );
        const awaitingReviewSnapshot = await getCountFromServer(awaitingReviewQuery);
        const awaitingReviewCount = awaitingReviewSnapshot.data().count;

        const myReviewedQuery = query(
            patientsCollectionRef,
            where('doctorId', '==', currentUser.uid), 
            where('feedbackStatus', '==', 'Reviewed by Doctor')
        );
        const myReviewedSnapshot = await getCountFromServer(myReviewedQuery);
        const myReviewedCount = myReviewedSnapshot.data().count;

        const pendingSpecialistQuery = query(
            patientsCollectionRef,
            where('feedbackStatus', '==', 'Pending Specialist Consultation')
        );
        const pendingSpecialistSnapshot = await getCountFromServer(pendingSpecialistQuery);
        const pendingSpecialistConsultationsCount = pendingSpecialistSnapshot.data().count;


        setStats({
          awaitingReviewCount,
          myReviewedCount,
          pendingSpecialistConsultationsCount,
        });
      } catch (err: any) {
        console.error("Error fetching doctor dashboard stats:", err);
        let specificError = "Could not load dashboard statistics. Please try again later.";
         if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load statistics: Database is offline. Please check your internet connection.";
        } else if (err.code === "failed-precondition") {
          specificError = "Could not load statistics: This often indicates a missing database index. Please check your browser's developer console for a link to create the necessary Firestore indexes. For 'My Reviewed Patients', an index on 'patients' collection for fields: doctorId (ASC) and feedbackStatus (ASC) might be needed. For 'Awaiting Review' and 'Pending Specialist Consultation', an index for feedbackStatus (ASC) might be needed.";
        }
        setError(specificError);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchDoctorStats();
  }, [currentUser, authLoading]);

  const StatCard = ({ title, value, icon: Icon, description, link, linkText, colorClass = "text-primary", bgColorClass = "bg-primary/10" }: { title: string, value: number | string, icon: React.ElementType, description: string, link?: string, linkText?: string, colorClass?: string, bgColorClass?: string }) => (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-xl overflow-hidden">
      {link ? (
         <Link href={link} className="block h-full">
            <CardHeader className={`pb-2 ${bgColorClass}`}>
                <CardTitle className={`text-xl font-headline flex items-center justify-between ${colorClass}`}>
                {title}
                <Icon className={`h-7 w-7 ${colorClass} opacity-80`} />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <p className={`text-5xl font-bold ${colorClass}`}>{loadingStats ? <Skeleton className="h-12 w-1/2 inline-block" /> : value}</p>
                <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
                 {linkText && <p className={`text-sm ${colorClass} hover:underline mt-3 font-semibold`}>{linkText} &rarr;</p>}
            </CardContent>
         </Link>
       ) : (
        <>
            <CardHeader className={`pb-2 ${bgColorClass}`}>
                <CardTitle className={`text-xl font-headline flex items-center justify-between ${colorClass}`}>
                {title}
                <Icon className={`h-7 w-7 ${colorClass} opacity-80`} />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <p className={`text-5xl font-bold ${colorClass}`}>{loadingStats ? <Skeleton className="h-12 w-1/2 inline-block" /> : value}</p>
                <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
            </CardContent>
        </>
       )}
    </Card>
  );

  if (authLoading && loadingStats) { // Show skeleton if either auth or stats are loading
    return (
      <div className="container mx-auto py-10 px-4">
        <Skeleton className="h-12 w-1/2 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
           <h1 className="text-4xl font-headline text-foreground flex items-center gap-3">
            <BriefcaseMedical className="w-10 h-10 text-primary"/>
            Doctor's Portal
          </h1>
          <p className="text-lg text-muted-foreground font-body">Welcome, Dr. {doctorName || <Skeleton className="h-8 w-40 inline-block" />}! Your medical overview.</p>
        </div>
      </div>
      
      {error && (
        <Card className="mb-8 border-destructive bg-destructive/10 rounded-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle /> Error Loading Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <StatCard 
            title="Require Action" 
            value={stats?.awaitingReviewCount ?? 0} 
            icon={ShieldAlert} 
            description="Pending reviews or specialist feedback received." 
            link="/dashboard/doctor/awaiting-review"
            linkText="View Cases"
            colorClass="text-orange-600" 
            bgColorClass="bg-orange-600/10"
        />
        <StatCard 
            title="Pending Specialist Consult." 
            value={stats?.pendingSpecialistConsultationsCount ?? 0} 
            icon={GraduationCap} 
            description="Patients awaiting specialist feedback." 
            colorClass="text-purple-600" 
            bgColorClass="bg-purple-600/10"
        />
        <StatCard 
            title="My Reviewed Cases" 
            value={stats?.myReviewedCount ?? 0} 
            icon={UserCheck} 
            description="Patients you've provided feedback for." 
            colorClass="text-green-600" 
            bgColorClass="bg-green-600/10"
        />
      </div>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2 text-foreground">
            <Activity className="w-7 h-7 text-primary" /> Quick Actions
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            Navigate to patient lists and management tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button asChild variant="default" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base rounded-lg shadow-md hover:shadow-lg transition-all">
            <Link href="/dashboard/doctor/awaiting-review">
              <ListFilter className="mr-2 h-5 w-5" /> View Patients Requiring Action
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base rounded-lg shadow-md hover:shadow-lg transition-all">
            <Link href="/dashboard/doctor/view-all-patients">
              <Users className="mr-2 h-5 w-5" /> View All Patient Records
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
