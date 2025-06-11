// src/app/dashboard/doctor/view-all-patients/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, AlertTriangle, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientForDoctorList {
  id: string; // Firestore document ID
  patientName: string;
  patientAge: string;
  registrationDateTime: Timestamp;
  feedbackStatus: string;
}

export default function DoctorViewAllPatientsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientForDoctorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllPatients() {
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
        const q = query(patientsCollectionRef, orderBy('registrationDateTime', 'desc'));

        const querySnapshot = await getDocs(q);
        const fetchedPatients: PatientForDoctorList[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            patientName: data.patientName,
            patientAge: data.patientAge,
            registrationDateTime: data.registrationDateTime,
            feedbackStatus: data.feedbackStatus || 'N/A',
          } as PatientForDoctorList;
        });
        setPatients(fetchedPatients);
      } catch (err: any) {
        console.error("Error fetching all patients for doctor:", err);
        let specificError = "Could not load patient list. Please try again later.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load patients: Database is offline. Please check your internet connection.";
        } else if (err.code === "permission-denied") {
            specificError = "Could not load patients: Permission denied. Please check Firestore security rules for doctors reading patient data.";
        } else if (err.code === "failed-precondition" && err.message?.includes("index")) {
            specificError = "Could not load patients: A required Firestore index is missing. Please check your browser's developer console for a link to create the index, or create it manually for the 'patients' collection (orderBy 'registrationDateTime' DESC).";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    fetchAllPatients();
  }, [currentUser, authLoading]);

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Reviewed by Doctor') return 'secondary';
    if (status === 'Pending Specialist Consultation') return 'outline';
    if (status === 'Specialist Feedback Provided') return 'default';
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
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">All Patient Records</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Accessible Patient List</CardTitle>
          <CardDescription className="font-body">
            Browse all patient records you have access to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authLoading || loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
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
            <p className="text-muted-foreground text-center py-4">No patient records found.</p>
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
                        <Link href={`/dashboard/doctor/patient/${patient.id}`}><Eye className="mr-1 h-4 w-4" /> View & Manage</Link>
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

    