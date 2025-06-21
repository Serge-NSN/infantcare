// src/app/dashboard/admin/view-pending-cases/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, Timestamp, orderBy, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { getDashboardLink } from '@/lib/utils/getDashboardLink';

interface PatientForAdminList {
  id: string; // Firestore document ID
  patientName: string;
  patientId: string;
  patientAge: string;
  hospitalName: string;
  registrationDateTime: Timestamp;
  feedbackStatus: string;
  caregiverName?: string;
}

export default function AdminViewPendingCasesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<PatientForAdminList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && currentUser) {
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'Admin') {
            router.replace(getDashboardLink(userRole));
            return;
        }
    } else if (!authLoading && !currentUser) {
        router.replace('/login');
        return;
    }

    async function fetchPendingCases() {
      if (authLoading || !currentUser || localStorage.getItem('userRole') !== 'Admin') {
         if(!currentUser && !authLoading) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');
        const q = query(
            patientsCollectionRef, 
            where('feedbackStatus', 'in', ['Pending Doctor Review', 'Pending Specialist Consultation', 'Specialist Feedback Provided']),
            orderBy('registrationDateTime', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedPatients: PatientForAdminList[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            patientName: data.patientName,
            patientId: data.patientId,
            patientAge: data.patientAge,
            hospitalName: data.hospitalName,
            registrationDateTime: data.registrationDateTime,
            feedbackStatus: data.feedbackStatus || 'N/A',
            caregiverName: data.caregiverName || 'N/A',
          } as PatientForAdminList;
        });
        setPatients(fetchedPatients);
      } catch (err: any) {
        console.error("Error fetching pending cases for admin:", err);
        let specificError = "Could not load pending cases. Please try again later.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Database is offline. Please check your internet connection.";
        } else if (err.code === "permission-denied") {
            specificError = "Permission denied. Please check Firestore security rules for admin access.";
        } else if (err.code === "failed-precondition" && err.message?.includes("index")) {
            specificError = "A required Firestore index is missing. Please check your browser's developer console for a link to create the index for the 'patients' collection.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
     if (currentUser && localStorage.getItem('userRole') === 'Admin') {
        fetchPendingCases();
    }
  }, [currentUser, authLoading, router]);

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Reviewed by Doctor') return 'secondary';
    if (status === 'Pending Specialist Consultation') return 'outline';
    if (status === 'Specialist Feedback Provided') return 'default';
    return 'outline';
  };
  
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-8 w-1/2 mb-6" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-7 w-1/2 mb-1" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
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


  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/admin">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Pending Patient Cases</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Cases Awaiting Action</CardTitle>
          <CardDescription className="font-body">
            Browse all patient records awaiting review by doctors or specialists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
             <Card className="border-destructive bg-destructive/10 p-4">
              <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                <AlertTriangle /> Error Loading Patients
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </Card>
          ) : patients.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending patient cases found in the system.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.patientName}</TableCell>
                    <TableCell>{patient.patientId}</TableCell>
                    <TableCell>{patient.patientAge}</TableCell>
                    <TableCell>{patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString('en-US') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)}>
                        {patient.feedbackStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/patient/${patient.id}`}><Eye className="mr-1 h-4 w-4" /> View Full Record</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
