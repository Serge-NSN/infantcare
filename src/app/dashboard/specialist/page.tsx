
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
  specialty?: string;
}

interface SpecialistDashboardStats {
    assignedToMeCount: number;
    reviewedCount: number;
    unassignedCount: number;
}

export default function SpecialistDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [assignedToMe, setAssignedToMe] = useState<PatientForSpecialistList[]>([]);
  const [unassigned, setUnassigned] = useState<PatientForSpecialistList[]>([]);
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
        const consultationsCollectionGroup = collectionGroup(db, 'specialistConsultations');

        // Stats
        const assignedToMeQuery = query(consultationsCollectionGroup, where("status", "==", "Pending Specialist Review"), where("specialistId", "==", currentUser.uid));
        const assignedToMeSnapshot = await getCountFromServer(assignedToMeQuery);
        
        const reviewedCasesQuery = query(consultationsCollectionGroup, where("specialistId", "==", currentUser.uid), where("status", "==", "Feedback Provided by Specialist"));
        const reviewedCasesSnapshot = await getCountFromServer(reviewedCasesQuery);

        const unassignedQuery = query(consultationsCollectionGroup, where("status", "==", "Pending Specialist Review"), where("specialistId", "==", null));
        const unassignedSnapshot = await getCountFromServer(unassignedQuery);
        
        setStats({ 
            assignedToMeCount: assignedToMeSnapshot.data().count,
            reviewedCount: reviewedCasesSnapshot.data().count,
            unassignedCount: unassignedSnapshot.data().count,
        });

        // Fetch lists of patients
        const assignedToMeDocs = await getDocs(assignedToMeQuery);
        const assignedPatientsList: PatientForSpecialistList[] = [];
        for (const consultDoc of assignedToMeDocs.docs) {
            const consultData = consultDoc.data();
            const patientDoc = await getDoc(consultDoc.ref.parent.parent!);
            if (patientDoc.exists()) {
                const patientData = patientDoc.data();
                 assignedPatientsList.push({
                    id: patientDoc.id,
                    patientName: patientData.patientName,
                    patientAge: patientData.patientAge,
                    registrationDateTime: patientData.registrationDateTime,
                    feedbackStatus: patientData.feedbackStatus,
                    consultationRequestId: consultDoc.id,
                    requestDetails: consultData.requestDetails,
                    requestingDoctorName: consultData.requestingDoctorName,
                    specialty: consultData.specialty
                 });
            }
        }
        setAssignedToMe(assignedPatientsList);
        
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
            title="Assigned To You" 
            value={stats?.assignedToMeCount ?? 0} 
            icon={Clock} 
            description="Cases directly assigned to you for review."
            colorClass="text-orange-600" 
            bgColorClass="bg-orange-600/10"
        />
        <StatCard 
            title="Your Reviewed Cases" 
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
            <ListChecks className="w-7 h-7 text-primary" /> Cases Assigned To You
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            These cases have been specifically assigned to you by a doctor.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
           {(authLoading || loading) ? (
            <div className="space-y-4 mt-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : assignedToMe.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No cases are currently assigned to you.</p>
          ) : (
            <div className="space-y-6 mt-4">
              {assignedToMe.map(patient => (
                <Card key={patient.id} className="bg-card hover:shadow-lg transition-shadow duration-300 rounded-lg border border-border">
                   <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <CardTitle className="text-xl font-headline text-primary">
                                {patient.patientName}
                                <span className="text-base font-normal text-muted-foreground ml-2">(Age: {patient.patientAge})</span>
                            </CardTitle>
                             <Badge variant="outline" className="mt-1 sm:mt-0 border-purple-500 text-purple-600 bg-purple-500/10">
                                {patient.specialty}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs font-body text-muted-foreground pt-1">
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
