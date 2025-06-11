// src/app/dashboard/specialist/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ListChecks, MessageSquare, Send, UserCheck, Users, AlertTriangle, ArrowLeft, Eye, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PatientForSpecialistList {
  id: string; // Firestore document ID for the patient
  patientName: string;
  patientAge: string;
  registrationDateTime: Timestamp; // Patient's registration time for sorting
  feedbackStatus: string; // Should be 'Pending Specialist Consultation'
  consultationRequestId?: string; // ID of the first pending consultation request
  requestDetails?: string; // Snippet of request details
  requestingDoctorName?: string;
}

export default function SpecialistDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [patientsForReview, setPatientsForReview] = useState<PatientForSpecialistList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialistName, setSpecialistName] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
        setSpecialistName(currentUser.displayName || localStorage.getItem('userFullName') || currentUser.email?.split('@')[0] || 'Specialist');
    }

    async function fetchPatientsForSpecialistReview() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // 1. Fetch patients with 'Pending Specialist Consultation' status
        const patientsCollectionRef = collection(db, 'patients');
        const qPatients = query(
          patientsCollectionRef,
          where('feedbackStatus', '==', 'Pending Specialist Consultation'),
          orderBy('registrationDateTime', 'desc') // Or orderBy last consultation request time
        );

        const patientsSnapshot = await getDocs(qPatients);
        const fetchedPatients: PatientForSpecialistList[] = [];

        for (const patientDoc of patientsSnapshot.docs) {
          const patientData = patientDoc.data();
          // 2. For each such patient, find their pending consultation request(s)
          //    For simplicity, we'll just fetch the latest one for display on the dashboard.
          //    A more robust solution might assign specialists or let them pick.
          const consultationsQuery = query(
            collection(db, "patients", patientDoc.id, "specialistConsultations"),
            where("status", "==", "Pending Specialist Review"),
            orderBy("requestedAt", "desc"),
            // limit(1) // To get the most recent one for the dashboard card
          );
          const consultationSnapshot = await getDocs(consultationsQuery);
          
          if (!consultationSnapshot.empty) {
            // In a real scenario, a specialist might be assigned or pick.
            // Here, we'll just list the patient if *any* pending request exists.
            // We'll pass the first pending request ID to the patient detail page.
            const firstPendingRequest = consultationSnapshot.docs[0].data();
            fetchedPatients.push({
              id: patientDoc.id,
              patientName: patientData.patientName,
              patientAge: patientData.patientAge,
              registrationDateTime: patientData.registrationDateTime,
              feedbackStatus: patientData.feedbackStatus,
              consultationRequestId: consultationSnapshot.docs[0].id, // ID of the consultation doc
              requestDetails: firstPendingRequest.requestDetails,
              requestingDoctorName: firstPendingRequest.requestingDoctorName,
            });
          }
        }
        setPatientsForReview(fetchedPatients);
      } catch (err: any) {
        console.error("Error fetching patients for specialist review:", err);
        let specificError = "Could not load patient list for review. Please try again later.";
        if (err.code === "failed-precondition") {
          specificError = "Could not load patients: A required Firestore index is missing. Check browser console for details, or create an index on 'patients' for 'feedbackStatus' (ASC) and 'registrationDateTime' (DESC). Also ensure indexes for 'specialistConsultations' subcollection on 'status' (ASC) and 'requestedAt' (DESC).";
        } else if (err.code === "permission-denied") {
           specificError = "Permission denied. Check Firestore rules for specialist access to patient and consultation data.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    fetchPatientsForSpecialistReview();
  }, [currentUser, authLoading]);

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="flex items-center gap-3 mb-6">
        <UserCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Specialist Portal - Welcome Dr. {specialistName || <Skeleton className="h-8 w-32 inline-block"/>}</h1>
      </div>

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Error Loading Data</CardTitle></CardHeader>
          <CardContent><p className="text-destructive">{error}</p></CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2"><ListChecks className="w-6 h-6" /> Patients Awaiting Specialist Consultation</CardTitle>
          <CardDescription className="font-body">
            Review cases referred by doctors for your expert feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {authLoading || loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
            </div>
          ) : patientsForReview.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No patients currently awaiting your specialist review.</p>
          ) : (
            <div className="space-y-4">
              {patientsForReview.map(patient => (
                <Card key={patient.id} className="bg-secondary/30 hover:shadow-md transition-shadow">
                   <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <CardTitle className="text-lg font-headline">
                                {patient.patientName}
                                <span className="text-sm font-normal text-muted-foreground ml-2">(Age: {patient.patientAge})</span>
                            </CardTitle>
                            <Badge variant="destructive" className="mt-1 sm:mt-0"><Clock className="w-3.5 h-3.5 mr-1.5"/>{patient.feedbackStatus}</Badge>
                        </div>
                        <CardDescription className="text-xs font-body">
                            Registered: {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString() : 'N/A'}
                            <br />
                            Requested by: Dr. {patient.requestingDoctorName || 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-body line-clamp-2 mb-3">
                            <span className="font-semibold">Request: </span>{patient.requestDetails || "No details provided."}
                        </p>
                        <Button asChild size="sm">
                            <Link href={`/dashboard/specialist/patient/${patient.id}?consultationRequestId=${patient.consultationRequestId}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Case & Provide Feedback
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    