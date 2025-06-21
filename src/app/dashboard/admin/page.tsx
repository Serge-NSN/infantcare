// src/app/dashboard/admin/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { BarChart3, AlertTriangle, ListFilter, Users, ClipboardCheck, Clock, ShieldCheck, Users2, Settings2, BriefcaseMedical, UserPlus, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { getDashboardLink } from '@/lib/utils/getDashboardLink';

interface AdminDashboardStats {
  totalPatients: number;
  pendingCasesCount: number; 
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
            router.replace(getDashboardLink(userRole)); 
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
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (!currentUser || localStorage.getItem('userRole') !== 'Admin') {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Access Denied. Redirecting...</p>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, description, colorClass = "text-primary", bgColorClass = "bg-primary/10" }: { title: string, value: number | string, icon: React.ElementType, description: string, colorClass?: string, bgColorClass?: string }) => (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-xl overflow-hidden h-full">
      <CardHeader className={`pb-2 ${bgColorClass}`}>
        <CardTitle className={`text-xl font-headline flex items-center justify-between ${colorClass}`}>
          {title}
          <Icon className={`h-7 w-7 ${colorClass} opacity-80`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className={`text-5xl font-bold ${colorClass}`}>{value}</div>
        <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
      </CardContent>
    </Card>
  );


  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-headline text-foreground flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-primary"/>
            Admin Dashboard
          </h1>
          <div className="text-lg text-muted-foreground font-body">Welcome, {adminName || <Skeleton className="h-8 w-40 inline-block" />}! System overview and management.</div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
        <Link href="/dashboard/admin/view-all-patients" className="block">
            <StatCard title="Total Patients" value={stats?.totalPatients ?? 0} icon={Users} description="All registered patients." colorClass="text-blue-600" bgColorClass="bg-blue-600/10" />
        </Link>
        <Link href="/dashboard/admin/view-pending-cases" className="block">
            <StatCard title="Pending Cases" value={stats?.pendingCasesCount ?? 0} icon={Activity} description="Awaiting doctor/specialist action." colorClass="text-orange-600" bgColorClass="bg-orange-600/10" />
        </Link>
        <Link href="/dashboard/admin/view-users-by-role?role=Caregiver" className="block">
            <StatCard title="Caregivers" value={stats?.totalCaregivers ?? 0} icon={UserPlus} description="Registered caregivers." colorClass="text-green-600" bgColorClass="bg-green-600/10"/>
        </Link>
        <Link href="/dashboard/admin/view-users-by-role?role=Medical+Doctor" className="block">
            <StatCard title="Doctors" value={stats?.totalDoctors ?? 0} icon={BriefcaseMedical} description="Registered medical doctors." colorClass="text-purple-600" bgColorClass="bg-purple-600/10" />
        </Link>
        <Link href="/dashboard/admin/view-users-by-role?role=Specialist" className="block">
            <StatCard title="Specialists" value={stats?.totalSpecialists ?? 0} icon={Users2} description="Registered specialists." colorClass="text-teal-600" bgColorClass="bg-teal-600/10" />
        </Link>
      </div>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Settings2 className="w-7 h-7 text-primary" /> Quick Management Actions
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            Navigate to system-wide record views.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button asChild variant="default" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base rounded-lg shadow-md hover:shadow-lg transition-all">
            <Link href="/dashboard/admin/view-all-patients">
              <ListFilter className="mr-2 h-5 w-5" /> View All Patient Records
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base rounded-lg shadow-md hover:shadow-lg transition-all">
            <Link href="/dashboard/admin/view-all-users">
              <Users className="mr-2 h-5 w-5" /> View All User Accounts
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
