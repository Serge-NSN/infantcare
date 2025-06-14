// src/app/dashboard/caregiver/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer, or } from 'firebase/firestore';
import { PlusCircle, Users, AlertTriangle, Clock, CheckCircle2, HeartHandshake, ListOrdered, Activity } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientStats {
  totalPatients: number;
  waitingListCount: number;
  reviewedPatientsCount: number;
}

export default function CaregiverDashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caregiverName, setCaregiverName] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setCaregiverName(currentUser.displayName || localStorage.getItem('userFullName') || currentUser.email?.split('@')[0] || 'Caregiver');
    }

    async function fetchPatientStats() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');
        
        const totalPatientsQuery = query(patientsCollectionRef, where('caregiverUid', '==', currentUser.uid));
        const totalSnapshot = await getCountFromServer(totalPatientsQuery);
        const totalPatients = totalSnapshot.data().count;

        const waitingListQuery = query(
          patientsCollectionRef, 
          where('caregiverUid', '==', currentUser.uid),
          where('feedbackStatus', '==', 'Pending Doctor Review')
        );
        const waitingSnapshot = await getCountFromServer(waitingListQuery);
        const waitingListCount = waitingSnapshot.data().count;

        const reviewedQuery = query(
          patientsCollectionRef,
          where('caregiverUid', '==', currentUser.uid),
          where('feedbackStatus', 'in', ['Reviewed by Doctor', 'Specialist Feedback Provided']) 
        );
        const reviewedSnapshot = await getCountFromServer(reviewedQuery);
        const reviewedPatientsCount = reviewedSnapshot.data().count;

        setStats({
          totalPatients,
          waitingListCount,
          reviewedPatientsCount,
        });
      } catch (err: any) {
        console.error("Error fetching patient stats:", err);
        let specificError = "Could not load patient statistics. Please try again later.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load statistics: Database is offline. Please check your internet connection.";
        } else if (err.code === "failed-precondition") {
          specificError = "Could not load statistics: This often indicates a missing database index. Please check your browser's developer console for a link to create the necessary index in your Firebase project, or create it manually in the Firestore 'Indexes' tab for the 'patients' collection (fields: caregiverUid ASC, feedbackStatus ASC). An index on these fields generally supports 'IN' queries on feedbackStatus as well.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }

    fetchPatientStats();
  }, [currentUser]);

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
                <p className={`text-5xl font-bold ${colorClass}`}>{loading ? <Skeleton className="h-12 w-1/2 inline-block" /> : value}</p>
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
                 <p className={`text-5xl font-bold ${colorClass}`}>{loading ? <Skeleton className="h-12 w-1/2 inline-block" /> : value}</p>
                <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
            </CardContent>
        </>
       )}
    </Card>
  );


  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-headline text-foreground flex items-center gap-3">
            <HeartHandshake className="w-10 h-10 text-primary"/>
            Welcome, {caregiverName || <Skeleton className="h-8 w-40 inline-block" />}!
          </h1>
          <p className="text-lg text-muted-foreground font-body">Here's an overview of your patient activities.</p>
        </div>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base rounded-lg shadow-md hover:shadow-lg transition-all w-full sm:w-auto">
          <Link href="/dashboard/caregiver/add-patient">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Patient
          </Link>
        </Button>
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
            title="Total Patients" 
            value={stats?.totalPatients ?? 0} 
            icon={Users} 
            description="Number of patients you manage." 
            colorClass="text-blue-600" 
            bgColorClass="bg-blue-600/10"
        />
        <StatCard 
            title="Waiting List" 
            value={stats?.waitingListCount ?? 0} 
            icon={Clock} 
            description="Patients pending doctor review." 
            link="/dashboard/caregiver/waiting-list"
            linkText="View Waiting List"
            colorClass="text-orange-600" 
            bgColorClass="bg-orange-600/10"
        />
        <StatCard 
            title="Reviewed Patients" 
            value={stats?.reviewedPatientsCount ?? 0} 
            icon={CheckCircle2} 
            description="Patients who have received doctor feedback." 
            colorClass="text-green-600" 
            bgColorClass="bg-green-600/10"
        />
      </div>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2 text-foreground">
            <Activity className="w-7 h-7 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-muted-foreground">Manage your patient records.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button asChild variant="outline" size="lg" className="text-base rounded-lg shadow-md hover:shadow-lg transition-all">
            <Link href="/dashboard/caregiver/view-patients">
              <ListOrdered className="mr-2 h-5 w-5" /> View All Your Patients
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
