// src/app/dashboard/specialist/reviewed-cases/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Eye, AlertTriangle, ArrowLeft, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collectionGroup, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { getDashboardLink } from '@/lib/utils/getDashboardLink';

interface ReviewedCase {
  patientId: string;
  consultationId: string;
  patientName: string;
  requestingDoctorName: string;
  feedbackProvidedAt: Timestamp;
}

export default function SpecialistReviewedCasesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviewedCases, setReviewedCases] = useState<ReviewedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
      return;
    }
    const userRole = localStorage.getItem('userRole');
    if (userRole && userRole !== 'Specialist') {
      router.replace(getDashboardLink(userRole));
      return;
    }
    
    async function fetchReviewedCases() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const consultationsCollectionGroup = collectionGroup(db, 'specialistConsultations');
        const q = query(
            consultationsCollectionGroup, 
            where('specialistId', '==', currentUser.uid),
            where('status', '==', 'Feedback Provided by Specialist'),
            orderBy('feedbackProvidedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedCases: ReviewedCase[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            patientId: data.patientId,
            consultationId: doc.id,
            patientName: data.patientName,
            requestingDoctorName: data.requestingDoctorName || 'N/A',
            feedbackProvidedAt: data.feedbackProvidedAt,
          } as ReviewedCase;
        });
        setReviewedCases(fetchedCases);
      } catch (err: any) {
        console.error("Error fetching reviewed cases for specialist:", err);
        let specificError = "Could not load reviewed cases. Please try again later.";
        if (err.code === "permission-denied") {
            specificError = "Permission denied. Please check Firestore security rules.";
        } else if (err.code === "failed-precondition") {
            specificError = "A required Firestore index is missing. Please check your browser's developer console for a link to create it for the 'specialistConsultations' collection group.";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
    
    if (currentUser && userRole === 'Specialist') {
        fetchReviewedCases();
    }
  }, [currentUser, authLoading, router]);

  
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

  if (!currentUser || localStorage.getItem('userRole') !== 'Specialist') {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Access Denied. Redirecting...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/specialist">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Specialist Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <UserCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Your Reviewed Cases</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Feedback History</CardTitle>
          <CardDescription className="font-body">
            A list of all patient consultations you have provided feedback for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
             <Card className="border-destructive bg-destructive/10 p-4">
              <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                <AlertTriangle /> Error Loading Cases
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </Card>
          ) : reviewedCases.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">You have not reviewed any cases yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Requesting Doctor</TableHead>
                  <TableHead>Reviewed On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedCases.map((c) => (
                  <TableRow key={c.consultationId}>
                    <TableCell className="font-medium">{c.patientName}</TableCell>
                    <TableCell>Dr. {c.requestingDoctorName}</TableCell>
                    <TableCell>{c.feedbackProvidedAt?.toDate ? new Date(c.feedbackProvidedAt.toDate()).toLocaleDateString('en-US') : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/specialist/patient/${c.patientId}?consultationRequestId=${c.consultationId}`}><Eye className="mr-1 h-4 w-4" /> View Record</Link>
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
