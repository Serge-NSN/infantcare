// src/app/dashboard/doctor/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { BarChart3, AlertTriangle, ListFilter, Users, ClipboardCheck, Clock, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DoctorDashboardStats {
  awaitingReviewCount: number; // Patients with 'Pending Doctor Review' or 'Specialist Feedback Provided'
  myReviewedCount: number; // Patients with 'Reviewed by Doctor' by this doctor
  pendingSpecialistConsultationsCount: number; // Patients with 'Pending Specialist Consultation'
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
            where('doctorId', '==', currentUser.uid), // Assuming doctorId is stored on patient when doctor gives feedback
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


  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-headline">Welcome, Dr. {doctorName || <Skeleton className="h-8 w-40 inline-block" />}!</h1>
          <p className="text-muted-foreground font-body">Your medical portal overview.</p>
        </div>
      </div>
      
      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Patients Requiring Action
              <Clock className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Cases pending your review or specialist feedback received.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-10 w-1/4" />
            ) : (
              <p className="text-4xl font-bold">{stats?.awaitingReviewCount ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Pending Specialist Consult.
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Patients awaiting feedback from specialists.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-10 w-1/4" />
            ) : (
              <p className="text-4xl font-bold">{stats?.pendingSpecialistConsultationsCount ?? 0}</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              My Reviewed Patients
              <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Patients you have personally provided feedback for.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-10 w-1/4" />
            ) : (
              <p className="text-4xl font-bold">{stats?.myReviewedCount ?? 0}</p>
            )}
          </CardContent>
        </Card>

      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Quick Actions
          </CardTitle>
          <CardDescription className="font-body">
            Navigate to patient lists and management tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild variant="default" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/dashboard/doctor/awaiting-review">
              <ListFilter className="mr-2 h-5 w-5" /> View Patients Requiring Action
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/doctor/view-all-patients">
              <Users className="mr-2 h-5 w-5" /> View All Patient Records
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    