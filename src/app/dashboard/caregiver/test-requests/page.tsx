
// src/app/dashboard/caregiver/test-requests/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ArrowLeft, AlertTriangle, FileText as FileIcon, Upload, Send } from 'lucide-react';
import { TestRequestList, type TestRequestItem } from '@/components/dashboard/shared/TestRequestList';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

// Define a new interface for what a caregiver sees, which includes patientName
interface CaregiverTestRequestItem extends TestRequestItem {
  patientName?: string;
}

// Modal/Dialog component for fulfilling a request
interface FulfillRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: CaregiverTestRequestItem;
  onSubmit: (requestId: string, notes: string, files: FileList | null) => Promise<void>;
}

function FulfillRequestDialog({ isOpen, onOpenChange, request, onSubmit }: FulfillRequestDialogProps) {
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(request.id, notes, files);
    setIsSubmitting(false);
    onOpenChange(false); // Close dialog on submit
    setNotes('');
    setFiles(null);
  };

  return (
    <Card className={isOpen ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50" : "hidden"}>
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Fulfill Test Request: {request.testName}</CardTitle>
          <CardDescription>For patient: {request.patientName || 'N/A'}. Upload results and add notes.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="resultNotes" className="block text-sm font-medium mb-1">Result Notes (Optional)</label>
              <Textarea id="resultNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes regarding the test results..." />
            </div>
            <div>
              <label htmlFor="resultFiles" className="block text-sm font-medium mb-1">Upload Result Files (Images Preferred)</label>
              <Input id="resultFiles" type="file" multiple onChange={(e) => setFiles(e.target.files)} accept="image/*,.pdf,.doc,.docx" />
              <p className="text-xs text-muted-foreground mt-1">You can upload multiple files.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isSubmitting ? 'Submitting...' : <><Upload className="mr-2 h-4 w-4" /> Submit Results</>}
            </Button>
          </CardFooter>
        </form>
      </div>
    </Card>
  );
}


export default function CaregiverTestRequestsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [testRequests, setTestRequests] = useState<CaregiverTestRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedRequestToFulfill, setSelectedRequestToFulfill] = useState<CaregiverTestRequestItem | null>(null);
  const [isFulfillDialogOpen, setIsFulfillDialogOpen] = useState(false);

  useEffect(() => {
    // Prefill dialog if query params are present
    const patientIdParam = searchParams.get('patientId');
    const requestIdParam = searchParams.get('requestId');
    if (patientIdParam && requestIdParam && testRequests.length > 0) {
        const reqToOpen = testRequests.find(r => r.id === requestIdParam && r.patientId === patientIdParam);
        if (reqToOpen) {
            setSelectedRequestToFulfill(reqToOpen);
            setIsFulfillDialogOpen(true);
        }
    }
  }, [searchParams, testRequests]);


  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (currentUser && !authLoading) {
      setLoading(true);
      // Query all patients managed by the caregiver
      const patientsQuery = query(collection(db, 'patients'), where('caregiverUid', '==', currentUser.uid));
      
      unsubscribe = onSnapshot(patientsQuery, async (patientsSnapshot) => {
        const managedPatientIds = patientsSnapshot.docs.map(doc => doc.id);
        const patientNamesMap = new Map(patientsSnapshot.docs.map(doc => [doc.id, doc.data().patientName]));

        if (managedPatientIds.length === 0) {
          setTestRequests([]);
          setLoading(false);
          return;
        }

        // For each patient, query their testRequests subcollection
        // This can lead to many listeners if a caregiver has many patients. Consider restructuring for scale.
        // For now, this will work for a moderate number of patients.
        const allRequestsPromises = managedPatientIds.map(patientId => {
          const testRequestsQuery = query(
            collection(db, 'patients', patientId, 'testRequests'),
            // where('status', '==', 'Pending'), // Or show all and filter client-side / allow caregiver to see history
            orderBy('requestedAt', 'desc')
          );
          return new Promise<CaregiverTestRequestItem[]>((resolve, reject) => {
            onSnapshot(testRequestsQuery, (requestsSnapshot) => {
              const requestsForPatient = requestsSnapshot.docs.map(doc => ({
                id: doc.id,
                patientName: patientNamesMap.get(patientId) || 'Unknown Patient',
                ...doc.data()
              } as CaregiverTestRequestItem));
              resolve(requestsForPatient);
            }, reject);
          });
        });

        try {
          const results = await Promise.all(allRequestsPromises);
          const combinedRequests = results.flat().sort((a, b) => b.requestedAt.toMillis() - a.requestedAt.toMillis());
          setTestRequests(combinedRequests);
        } catch (err) {
          console.error("Error fetching test requests for caregiver:", err);
          setError("Could not load test requests. Please try again.");
        } finally {
          setLoading(false);
        }

      }, (err) => {
        console.error("Error fetching caregiver's patients:", err);
        setError("Could not load patient data for test requests.");
        setLoading(false);
      });

    } else if (!currentUser && !authLoading) {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      // Need to also clean up individual testRequest listeners if they were set up differently
    };
  }, [currentUser, authLoading]);

  const handleOpenFulfillDialog = (request: CaregiverTestRequestItem) => {
    setSelectedRequestToFulfill(request);
    setIsFulfillDialogOpen(true);
  };

  const handleFulfillSubmit = async (requestId: string, notes: string, files: FileList | null) => {
    if (!selectedRequestToFulfill) return;

    const resultFileNames: string[] = [];
    if (files) {
        for (let i = 0; i < files.length; i++) {
            // In a real app, upload files to Firebase Storage here and get URLs
            // For now, just storing names as an example.
            resultFileNames.push(files[i].name);
        }
    }

    try {
      await updateDoc(doc(db, 'patients', selectedRequestToFulfill.patientId, 'testRequests', requestId), {
        status: 'Fulfilled',
        resultNotes: notes,
        resultFileNames: resultFileNames,
        fulfilledAt: serverTimestamp(),
      });
      toast({ title: 'Test Results Submitted', description: 'The doctor will be notified.' });
      // Add new files to the main patient document's uploadedFileNames array
      const patientDocRef = doc(db, "patients", selectedRequestToFulfill.patientId);
      const patientDocSnap = await getDoc(patientDocRef);
      if (patientDocSnap.exists()) {
        const existingFiles = patientDocSnap.data().uploadedFileNames || [];
        await updateDoc(patientDocRef, {
            uploadedFileNames: [...existingFiles, ...resultFileNames]
        });
      }

    } catch (error) {
      console.error('Error fulfilling test request:', error);
      toast({ title: 'Submission Failed', description: 'Could not submit test results.', variant: 'destructive' });
    }
  };


  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-8 w-1/2 mb-6" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-7 w-1/2 mb-1" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <Card className="max-w-md mx-auto shadow-lg border-destructive bg-destructive/10 p-6">
          <CardHeader><CardTitle className="text-destructive flex items-center justify-center gap-2"><AlertTriangle /> Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/caregiver')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/caregiver">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <FileIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Manage Test Requests</h1>
      </div>
      
      <TestRequestList 
        requests={testRequests} 
        isLoading={loading} 
        userRole="caregiver"
        onFulfillClick={(requestId) => {
            const req = testRequests.find(r => r.id === requestId);
            if (req) handleOpenFulfillDialog(req);
        }}
      />

      {selectedRequestToFulfill && (
        <FulfillRequestDialog
          isOpen={isFulfillDialogOpen}
          onOpenChange={setIsFulfillDialogOpen}
          request={selectedRequestToFulfill}
          onSubmit={handleFulfillSubmit}
        />
      )}
    </div>
  );
}

// Helper function to get patient document - not strictly needed if patientName is passed in testRequest item
async function getDoc(docRef: any) {
    const docSnap = await firebaseGetDoc(docRef);
    return docSnap;
}
// Re-declare firebaseGetDoc if not available globally
const firebaseGetDoc = async (docRef: any) => {
    const { getDoc: actualGetDoc } = await import('firebase/firestore');
    return actualGetDoc(docRef);
};


