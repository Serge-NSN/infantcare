// src/app/dashboard/specialist/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, UserCheck, AlertTriangle, Eye, Clock, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientForSpecialistList {
  id: string; 
  patientName: string;
  patientAge: string;
  registrationDateTime: Timestamp; 
  feedbackStatus: string; 
  consultationRequestId?: string; 
  requestDetails?: string; 
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
        const patientsCollectionRef = collection(db, 'patients');
        const qPatients = query(
          patientsCollectionRef,
          where('feedbackStatus', '==', 'Pending Specialist Consultation'),
          orderBy('registrationDateTime', 'desc') 
        );

        const patientsSnapshot = await getDocs(qPatients);
        const fetchedPatients: PatientForSpecialistList[] = [];

        for (const patientDoc of patientsSnapshot.docs) {
          const patientData = patientDoc.data();
          const consultationsQuery = query(
            collection(db, "patients", patientDoc.id, "specialistConsultations"),
            where("status", "==", "Pending Specialist Review"),
            orderBy("requestedAt", "desc"),
          );
          const consultationSnapshot = await getDocs(consultationsQuery);
          
          if (!consultationSnapshot.empty) {
            const firstPendingRequest = consultationSnapshot.docs[0].data();
            fetchedPatients.push({
              id: patientDoc.id,
              patientName: patientData.patientName,
              patientAge: patientData.patientAge,
              registrationDateTime: patientData.registrationDateTime,
              feedbackStatus: patientData.feedbackStatus,
              consultationRequestId: consultationSnapshot.docs[0].id, 
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
    <div className="container mx-auto py-10 px-4">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-headline text-foreground flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-primary"/>
            Specialist Portal
          </h1>
          <div className="text-lg text-muted-foreground font-body">Welcome, Dr. {specialistName || <Skeleton className="h-8 w-32 inline-block"/>}! Review consultation requests.</div>
        </div>
      </div>

      {error && (
        <Card className="mb-8 border-destructive bg-destructive/10 rounded-lg">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Error Loading Data</CardTitle></CardHeader>
          <CardContent><p className="text-destructive">{error}</p></CardContent>
        </Card>
      )}

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2 text-foreground">
            <ListChecks className="w-7 h-7 text-primary" /> Patients Awaiting Specialist Consultation
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            Review cases referred by doctors for your expert feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
           {(authLoading || loading) ? (
            <div className="space-y-4 mt-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : patientsForReview.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No patients currently awaiting your specialist review.</p>
          ) : (
            <div className="space-y-6 mt-4">
              {patientsForReview.map(patient => (
                <Card key={patient.id} className="bg-card hover:shadow-lg transition-shadow duration-300 rounded-lg border border-border">
                   <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <CardTitle className="text-xl font-headline text-primary">
                                {patient.patientName}
                                <span className="text-base font-normal text-muted-foreground ml-2">(Age: {patient.patientAge})</span>
                            </CardTitle>
                            <Badge variant="outline" className="mt-1 sm:mt-0 border-orange-500 text-orange-600 bg-orange-500/10">
                                <Clock className="w-4 h-4 mr-1.5"/>{patient.feedbackStatus}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs font-body text-muted-foreground pt-1">
                            Registered: {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString() : 'N/A'}
                            <br />
                            Requested by: Dr. {patient.requestingDoctorName || 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                        <p className="text-sm font-body text-foreground line-clamp-3 mb-4">
                            <span className="font-semibold text-muted-foreground">Request Details: </span>{patient.requestDetails || "No specific details provided."}
                        </p>
                        <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-md">
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
