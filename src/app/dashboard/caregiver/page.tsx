
// src/app/dashboard/caregiver/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { BarChart3, PlusCircle, Users, AlertTriangle, Clock } from 'lucide-react'; // Changed ClockHistory to Clock
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientStats {
  totalPatients: number;
  waitingListCount: number;
}

export default function CaregiverDashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatientStats() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');
        
        // Query for total patients
        const totalPatientsQuery = query(patientsCollectionRef, where('caregiverUid', '==', currentUser.uid));
        const totalSnapshot = await getCountFromServer(totalPatientsQuery);
        const totalPatients = totalSnapshot.data().count;

        // Query for waiting list patients
        const waitingListQuery = query(
          patientsCollectionRef, 
          where('caregiverUid', '==', currentUser.uid),
          where('feedbackStatus', '==', 'Pending Doctor Review')
        );
        const waitingSnapshot = await getCountFromServer(waitingListQuery);
        const waitingListCount = waitingSnapshot.data().count;

        setStats({
          totalPatients,
          waitingListCount,
        });
      } catch (err: any) {
        console.error("Error fetching patient stats:", err);
        let specificError = "Could not load patient statistics. Please try again later.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load statistics: Database is offline. Please check your internet connection.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }

    fetchPatientStats();
  }, [currentUser]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Caregiver Dashboard</h1>
      </div>

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Total Patients
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Number of patients you manage.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-1/4" />
            ) : (
              <p className="text-4xl font-bold">{stats?.totalPatients ?? 0}</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <Link href="/dashboard/caregiver/waiting-list" className="block h-full">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center justify-between">
                Waiting List
                <Clock className="h-6 w-6 text-muted-foreground" /> {/* Changed ClockHistory to Clock */}
              </CardTitle>
              <CardDescription>Patients pending doctor review.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-10 w-1/4" />
              ) : (
                <p className="text-4xl font-bold">{stats?.waitingListCount ?? 0}</p>
              )}
              <p className="text-xs text-primary hover:underline mt-2">View Waiting List &rarr;</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Patient Management</CardTitle>
          <CardDescription>Access tools to manage your patients.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/dashboard/caregiver/add-patient">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Patient
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/caregiver/view-patients">
              <Users className="mr-2 h-5 w-5" /> View All Patients
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    
