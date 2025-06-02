// src/app/dashboard/caregiver/view-patients/page.tsx
"use client"; // Will likely need client-side interaction for fetching and displaying data

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
// import { useAuth } from '@/contexts/AuthContext';
// import { db } from '@/lib/firebase';
// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { useEffect, useState } from 'react';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Define Patient type if not already globally defined
// interface Patient {
//   id: string; // Firestore document ID
//   patientName: string;
//   patientId: string; // The custom generated ID
//   patientAge: string;
//   registrationDateTime: any; // Firestore Timestamp, convert to date for display
//   // Add other fields you want to display
// }

export default function ViewPatientsPage() {
  // const { currentUser } = useAuth();
  // const [patients, setPatients] = useState<Patient[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   async function fetchPatients() {
  //     if (!currentUser) {
  //       setLoading(false);
  //       return;
  //     }
  //     try {
  //       const patientsCollectionRef = collection(db, 'patients');
  //       const q = query(patientsCollectionRef, where('caregiverUid', '==', currentUser.uid));
  //       const querySnapshot = await getDocs(q);
  //       const fetchedPatients: Patient[] = querySnapshot.docs.map(doc => ({
  //         id: doc.id,
  //         ...doc.data()
  //       } as Patient));
  //       setPatients(fetchedPatients);
  //     } catch (err) {
  //       console.error("Error fetching patients:", err);
  //       setError("Could not load patient list. Please try again later.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   fetchPatients();
  // }, [currentUser]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/caregiver">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Caregiver Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">View Patients</h1>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Patient List</CardTitle>
          <CardDescription>
            A list of all patients you have registered. This feature is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Patient listing functionality will be implemented here. You will be able to see patient details, and potentially edit or view their records.
          </p>
          {/* 
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!loading && error && <p className="text-destructive">{error}</p>}
          {!loading && !error && patients.length === 0 && <p>No patients registered yet.</p>}
          {!loading && !error && patients.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.patientName}</TableCell>
                    <TableCell>{patient.patientId}</TableCell>
                    <TableCell>{patient.patientAge}</TableCell>
                    <TableCell>{new Date(patient.registrationDateTime?.toDate()).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          */}
        </CardContent>
      </Card>
    </div>
  );
}
