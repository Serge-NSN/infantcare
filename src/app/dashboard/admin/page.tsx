// src/app/dashboard/admin/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { BarChart3, AlertTriangle, ListFilter, Users, ClipboardCheck, Clock, ShieldCheck, Users2, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

interface AdminDashboardStats {
  totalPatients: number;
  pendingCasesCount: number; // Patients with 'Pending Doctor Review' or 'Pending Specialist Consultation' or 'Specialist Feedback Provided'
  totalCaregivers: number;
  totalDoctors: number;
  totalSpecialists: number;
}

export default function AdminDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && currentUser) {
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'Admin') {
            router.replace(getDashboardLink(userRole)); // Redirect if not admin
            return;
        }
        setAdminName(currentUser.displayName || localStorage.getItem('userFullName') || currentUser.email?.split('@')[0] || 'Admin');
    } else if (!authLoading && !currentUser) {
        router.replace('/login');
        return;
    }

    async function fetchAdminStats() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) setLoadingStats(false);
        return;
      }

      setLoadingStats(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');
        const usersCollectionRef = collection(db, 'users');

        const totalPatientsSnapshot = await getCountFromServer(patientsCollectionRef);
        const totalPatients = totalPatientsSnapshot.data().count;

        const pendingCasesQuery = query(
            patientsCollectionRef, 
            where('feedbackStatus', 'in', ['Pending Doctor Review', 'Pending Specialist Consultation', 'Specialist Feedback Provided'])
        );
        const pendingCasesSnapshot = await getCountFromServer(pendingCasesQuery);
        const pendingCasesCount = pendingCasesSnapshot.data().count;

        const caregiversQuery = query(usersCollectionRef, where('role', '==', 'Caregiver'));
        const caregiversSnapshot = await getCountFromServer(caregiversQuery);
        const totalCaregivers = caregiversSnapshot.data().count;
        
        const doctorsQuery = query(usersCollectionRef, where('role', '==', 'Medical Doctor'));
        const doctorsSnapshot = await getCountFromServer(doctorsQuery);
        const totalDoctors = doctorsSnapshot.data().count;

        const specialistsQuery = query(usersCollectionRef, where('role', '==', 'Specialist'));
        const specialistsSnapshot = await getCountFromServer(specialistsQuery);
        const totalSpecialists = specialistsSnapshot.data().count;

        setStats({
          totalPatients,
          pendingCasesCount,
          totalCaregivers,
          totalDoctors,
          totalSpecialists,
        });
      } catch (err: any) {
        console.error("Error fetching admin dashboard stats:", err);
        let specificError = "Could not load dashboard statistics. Please try again later.";
         if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load statistics: Database is offline. Please check your internet connection.";
        } else if (err.code === "failed-precondition") {
          specificError = "Could not load statistics: This often indicates a missing database index. Please check your browser's developer console for a link to create the necessary Firestore indexes. Example: for 'users' collection an index on 'role' (ASC) might be needed. For 'patients' collection, an index for 'feedbackStatus' (ASC) might be needed for 'IN' queries.";
        } else if (err.code === "permission-denied") {
            specificError = "Permission Denied: Could not load statistics. Ensure admin role has appropriate Firestore read permissions.";
        }
        setError(specificError);
      } finally {
        setLoadingStats(false);
      }
    }
    
    if (currentUser && localStorage.getItem('userRole') === 'Admin') {
        fetchAdminStats();
    }

  }, [currentUser, authLoading, router]);


  if (authLoading || loadingStats) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full md:col-span-1 lg:col-span-1" />
            <Skeleton className="h-36 w-full md:col-span-1 lg:col-span-1" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!currentUser || localStorage.getItem('userRole') !== 'Admin') {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Access Denied. Redirecting...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-headline flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary"/>
            Admin Dashboard - Welcome, {adminName || <Skeleton className="h-8 w-40 inline-block" />}!
          </h1>
          <p className="text-muted-foreground font-body">System overview and management tools.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Total Patients
              <Users className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>All registered patients in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalPatients ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Pending Cases
              <Clock className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Cases awaiting doctor or specialist action.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.pendingCasesCount ?? 0}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Registered Caregivers
              <Users2 className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Total number of caregivers.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalCaregivers ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Registered Doctors
              <Users2 className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Total number of medical doctors.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalDoctors ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Registered Specialists
              <Users2 className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Total number of specialists.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.totalSpecialists ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" /> Quick Management Actions
          </CardTitle>
          <CardDescription className="font-body">
            Navigate to system-wide record views.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild variant="default" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/dashboard/admin/view-all-patients">
              <ListFilter className="mr-2 h-5 w-5" /> View All Patient Records
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/admin/view-all-users">
              <Users className="mr-2 h-5 w-5" /> View All User Accounts
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
