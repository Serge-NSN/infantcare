// src/app/dashboard/caregiver/waiting-list/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Clock, AlertTriangle, Eye } from 'lucide-react'; 
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Patient {
  id: string; // Firestore document ID
  patientName: string;
  patientId: string; 
  patientAge: string;
  registrationDateTime: Timestamp;
  feedbackStatus: string; // To display the specific status
}

export default function WaitingListPage() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWaitingListPatients() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const patientsCollectionRef = collection(db, 'patients');
        const q = query(
          patientsCollectionRef, 
          where('caregiverUid', '==', currentUser.uid),
          where('feedbackStatus', 'in', ['Pending Doctor Review', 'Pending Specialist Consultation', 'Specialist Feedback Provided']) // Include all "waiting" states for doctor
        );
        const querySnapshot = await getDocs(q);
        const fetchedPatients: Patient[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            patientName: data.patientName,
            patientId: data.patientId,
            patientAge: data.patientAge,
            registrationDateTime: data.registrationDateTime,
            feedbackStatus: data.feedbackStatus,
          } as Patient;
        });
        // Sort so "Pending Doctor Review" comes first, then others
        fetchedPatients.sort((a, b) => {
            if (a.feedbackStatus === 'Pending Doctor Review' && b.feedbackStatus !== 'Pending Doctor Review') return -1;
            if (a.feedbackStatus !== 'Pending Doctor Review' && b.feedbackStatus === 'Pending Doctor Review') return 1;
            return (b.registrationDateTime?.toMillis() || 0) - (a.registrationDateTime?.toMillis() || 0); // Secondary sort by date
        });
        setPatients(fetchedPatients);
      } catch (err: any) {
        console.error("Error fetching waiting list patients:", err);
        let specificError = "Could not load waiting list. Please try again later.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Could not load waiting list: Database is offline. Please check your internet connection.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    fetchWaitingListPatients();
  }, [currentUser]);

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Pending Specialist Consultation') return 'outline';
    if (status === 'Specialist Feedback Provided') return 'default';
    return 'outline';
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/caregiver">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Caregiver Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <Clock className="h-8 w-8 text-primary" /> 
        <h1 className="text-3xl font-headline">Patient Waiting List</h1>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Patients Awaiting Doctor/Specialist Action</CardTitle>
          <CardDescription>
            These patients are awaiting review or feedback from a medical doctor or specialist.
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
                <AlertTriangle /> Error Loading Waiting List
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </Card>
          )}
          {!loading && !error && patients.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No patients currently on the waiting list.</p>
          )}
          {!loading && !error && patients.length > 0 && (
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
                    <TableCell>
                      {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString('en-US') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)}>{patient.feedbackStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/caregiver/patient/${patient.id}`}>
                          <Eye className="mr-1 h-4 w-4" /> View Details
                        </Link>
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

    