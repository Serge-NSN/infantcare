// src/app/dashboard/specialist/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, UserCheck, AlertTriangle, Eye, Clock, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, collectionGroup, getCountFromServer } from 'firebase/firestore';
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

interface SpecialistDashboardStats {
    awaitingReviewCount: number;
    reviewedCount: number;
}

export default function SpecialistDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [patientsForReview, setPatientsForReview] = useState<PatientForSpecialistList[]>([]);
  const [stats, setStats] = useState<SpecialistDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialistName, setSpecialistName] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
        setSpecialistName(currentUser.displayName || localStorage.getItem('userFullName') || currentUser.email?.split('@')[0] || 'Specialist');
    }

    async function fetchSpecialistDashboardData() {
      if (authLoading || !currentUser) {
        if(!currentUser && !authLoading) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch stats
        const consultationsCollectionGroup = collectionGroup(db, 'specialistConsultations');

        const awaitingReviewQuery = query(
          consultationsCollectionGroup,
          where("status", "==", "Pending Specialist Review")
        );
        const awaitingReviewSnapshot = await getCountFromServer(awaitingReviewQuery);
        const awaitingReviewCount = awaitingReviewSnapshot.data().count;
        
        const reviewedCasesQuery = query(
          consultationsCollectionGroup,
          where("specialistId", "==", currentUser.uid),
          where("status", "==", "Feedback Provided by Specialist")
        );
        const reviewedCasesSnapshot = await getCountFromServer(reviewedCasesQuery);
        const reviewedCount = reviewedCasesSnapshot.data().count;
        
        setStats({ awaitingReviewCount, reviewedCount });

        // Fetch list of patients awaiting review (this is slightly different logic from the count)
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
        console.error("Error fetching data for specialist dashboard:", err);
        let specificError = "Could not load dashboard data. Please try again later.";
        if (err.code === "failed-precondition") {
          specificError = "Could not load data: A required Firestore index is missing. Check browser console for details. You may need to create composite indexes on the 'specialistConsultations' collection group and/or the 'patients' collection.";
        } else if (err.code === "permission-denied") {
           specificError = "Permission denied. Check Firestore rules for specialist access to patient and consultation data.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    if (currentUser) {
        fetchSpecialistDashboardData();
    }
  }, [currentUser, authLoading]);

  const StatCard = ({ title, value, icon: Icon, description, link, linkText, colorClass = "text-primary", bgColorClass = "bg-primary/10" }: { title: string, value: number | string, icon: React.ElementType, description: string, link?: string, linkText?: string, colorClass?: string, bgColorClass?: string }) => (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-xl overflow-hidden">
      {link ? (
         <Link href={link} className="block h-full">
            <CardHeader className={`pb-2 ${bgColorClass}`}>
                <CardTitle className={`text-xl font-headline flex items-center justify-between ${colorClass}`}>
                {title}
                <Icon className={`h-7 w-7 ${colorClass} opacity-80`} />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className={`text-5xl font-bold ${colorClass}`}>{loading ? <Skeleton className="h-12 w-1/2 inline-block" /> : value}</div>
                <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
                 {linkText && <p className={`text-sm ${colorClass} hover:underline mt-3 font-semibold`}>{linkText} &rarr;</p>}
            </CardContent>
         </Link>
       ) : (
        <>
            <CardHeader className={`pb-2 ${bgColorClass}`}>
                <CardTitle className={`text-xl font-headline flex items-center justify-between ${colorClass}`}>
                {title}
                <Icon className={`h-7 w-7 ${colorClass} opacity-80`} />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className={`text-5xl font-bold ${colorClass}`}>{loading ? <Skeleton className="h-12 w-1/2 inline-block" /> : value}</div>
                <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
            </CardContent>
        </>
       )}
    </Card>
  );

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

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <StatCard 
            title="Awaiting Your Review" 
            value={stats?.awaitingReviewCount ?? 0} 
            icon={Clock} 
            description="Cases referred by doctors for your feedback."
            colorClass="text-orange-600" 
            bgColorClass="bg-orange-600/10"
        />
        <StatCard 
            title="Reviewed Cases" 
            value={stats?.reviewedCount ?? 0} 
            icon={UserCheck} 
            description="Patients you have provided feedback for." 
            link="/dashboard/specialist/reviewed-cases"
            linkText="View History"
            colorClass="text-green-600" 
            bgColorClass="bg-green-600/10"
        />
      </div>


      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2 text-foreground">
            <ListChecks className="w-7 h-7 text-primary" /> Pending Consultation Queue
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            Review cases from the general pool that require specialist feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
           {(authLoading || loading) ? (
            <div className="space-y-4 mt-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : patientsForReview.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No patients currently awaiting specialist review.</p>
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
