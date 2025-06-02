// src/app/dashboard/caregiver/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs,getCountFromServer } from 'firebase/firestore';
import { BarChart3, ListChecks, PlusCircle, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientStats {
  totalPatients: number;
  // waitingListCount: number; // Placeholder for future
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
      try {
        const patientsCollectionRef = collection(db, 'patients');
        const q = query(patientsCollectionRef, where('caregiverUid', '==', currentUser.uid));
        
        const snapshot = await getCountFromServer(q);
        const totalPatients = snapshot.data().count;

        setStats({
          totalPatients,
          // waitingListCount: 0 // Implement later
        });
      } catch (err: any) {
        console.error("Error fetching patient stats:", err);
        setError("Could not load patient statistics. Please try again later.");
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center justify-between">
              Waiting List (Coming Soon)
              <ListChecks className="h-6 w-6 text-muted-foreground" />
            </CardTitle>
             <CardDescription>Patients needing immediate attention.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-1/4" />
            ) : (
              <p className="text-4xl font-bold">0</p> 
            )}
             <p className="text-xs text-muted-foreground mt-2">This feature is under development.</p>
          </CardContent>
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
