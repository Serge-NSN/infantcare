// src/app/dashboard/doctor/awaiting-review/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, AlertTriangle, ArrowLeft, ListFilter } from 'lucide-react';
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

export default function DoctorAwaitingReviewPage() {
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
          where('feedbackStatus', 'in', ['Pending Doctor Review', 'Specialist Feedback Provided']), // Doctors need to act on these
          orderBy('registrationDateTime', 'desc') // Or sort by a 'lastActionRequiredAt' timestamp
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
        console.error("Error fetching patients for doctor review:", err);
        let specificError = "Could not load patient list for review. Please try again later. Check the browser console for more details.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load patients: Database is offline. Please check your internet connection.";
        } else if (err.code === "failed-precondition") {
          specificError = "Could not load patients: This most likely means a required Firestore index is missing. Please check your browser's developer console for a link to create the index in your Firebase project, or create it manually in Firestore. The index should be on the 'patients' collection, for 'feedbackStatus' (IN operator might need multiple single-field indexes or a composite one like feedbackStatus ASC, registrationDateTime DESC).";
        } else if (err.code === "permission-denied") {
            specificError = "Could not load patients: Permission denied. Please check your Firestore security rules.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    fetchPatientsForReview();
  }, [currentUser, authLoading]);

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Specialist Feedback Provided') return 'default'; // e.g. purple
    return 'outline';
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/doctor">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <ListFilter className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Patients Requiring Your Action</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Pending Cases</CardTitle>
          <CardDescription className="font-body">
            List of patients whose information requires your medical feedback or review of specialist consultation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authLoading || loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
             <Card className="border-destructive bg-destructive/10 p-4">
              <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                <AlertTriangle /> Error Loading Patients
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </Card>
          ) : patients.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No patients currently requiring your action.</p>
          ) : (
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
                    <TableCell>{patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString('en-US') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)}>
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

    