
// src/app/dashboard/doctor/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, Eye, BarChart3, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientForDoctorList {
  id: string; // Firestore document ID
  patientName: string;
  patientAge: string;
  registrationDateTime: Timestamp;
  feedbackStatus: string; 
}

export default function DoctorDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientForDoctorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatientsForReview() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) {
            setLoading(false); 
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');
        const q = query(
          patientsCollectionRef, 
          where('feedbackStatus', '==', 'Pending Doctor Review'),
          orderBy('registrationDateTime', 'desc') // Sorting by newest first
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedPatients: PatientForDoctorList[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            patientName: data.patientName,
            patientAge: data.patientAge,
            registrationDateTime: data.registrationDateTime,
            feedbackStatus: data.feedbackStatus,
          } as PatientForDoctorList;
        });
        setPatients(fetchedPatients); 
      } catch (err: any) {
        console.error("Error fetching patients for doctor review (full object):", err);
        console.error("Error code:", err.code); 
        console.error("Error message:", err.message); 

        let specificError = "Could not load patient list for review. Please try again later. Check the browser console for more details from Firestore.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load patients: Database is offline. Please check your internet connection.";
        } else if (err.code === "failed-precondition") {
          specificError = "Could not load patients: This most likely means a required Firestore index is missing. Please check your browser's developer console for a link to create the index in your Firebase project, or create it manually in Firestore. The index should be on the 'patients' collection, with fields: feedbackStatus (Ascending) AND registrationDateTime (Descending).";
        } else if (err.code === "permission-denied") {
            specificError = "Could not load patients: Permission denied. Please check your Firestore security rules to ensure doctors can read the 'patients' collection with the applied filters.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    fetchPatientsForReview();
  }, [currentUser, authLoading]);

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Medical Doctor Portal</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2"><Users className="w-6 h-6" /> Patients Awaiting Review</CardTitle>
          <CardDescription className="font-body">
            List of patients whose information requires your medical feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          )}
          {!loading && error && (
             <Card className="border-destructive bg-destructive/10 p-4">
              <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                <AlertTriangle /> Error Loading Patients
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </Card>
          )}
          {!loading && !error && patients.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No patients currently awaiting review.</p>
          )}
          {!loading && !error && patients.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
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
                    <TableCell>{patient.patientAge}</TableCell>
                    <TableCell>{patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={patient.feedbackStatus === 'Pending Doctor Review' ? 'destructive' : 'default'}>
                        {patient.feedbackStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/doctor/patient/${patient.id}`}><Eye className="mr-1 h-4 w-4" /> View & Provide Feedback</Link>
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

