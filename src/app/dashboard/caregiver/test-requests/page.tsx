
// src/app/dashboard/caregiver/test-requests/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe, doc, updateDoc, serverTimestamp, Timestamp, getDoc as firebaseGetDoc } from 'firebase/firestore';
import { ArrowLeft, AlertTriangle, FileText as FileIcon, Upload, Send, Loader2 } from 'lucide-react';
import { TestRequestList, type TestRequestItem } from '@/components/dashboard/shared/TestRequestList';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface CaregiverTestRequestItem extends TestRequestItem {
  patientName?: string;
}

interface FulfillRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: CaregiverTestRequestItem;
  onSubmit: (requestId: string, notes: string, files: FileList | null) => Promise<void>;
}

// Shared function to upload a single file to Cloudinary via API route
async function uploadFileToCloudinary(file: File, toast: ReturnType<typeof useToast>['toast']): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload ${file.name}`);
      }
      const result = await response.json();
      return result.secure_url;
    } catch (error: any) {
      console.error(`Error uploading ${file.name}:`, error);
      toast({
        title: "File Upload Error",
        description: error.message || `Could not upload file "${file.name}". It will be skipped.`,
        variant: "destructive",
      });
      return null;
    }
}


function FulfillRequestDialog({ isOpen, onOpenChange, request, onSubmit }: FulfillRequestDialogProps) {
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(request.id, notes, files);
    setIsSubmitting(false);
    onOpenChange(false); 
    setNotes('');
    setFiles(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="bg-card p-0 rounded-lg shadow-xl w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Fulfill Test Request: {request.testName}</CardTitle>
          <CardDescription>For patient: {request.patientName || 'N/A'}. Upload results (images preferred, will be stored in Cloudinary) and add notes.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="resultNotes" className="block text-sm font-medium mb-1">Result Notes (Optional)</label>
              <Textarea id="resultNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes regarding the test results..." />
            </div>
            <div>
              <label htmlFor="resultFiles" className="block text-sm font-medium mb-1">Upload Result Files (Images Only)</label>
              <Input id="resultFiles" type="file" multiple onChange={(e) => setFiles(e.target.files)} accept="image/*" />
              <p className="text-xs text-muted-foreground mt-1">You can upload multiple image files. Images will be uploaded to Cloudinary.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Upload className="mr-2 h-4 w-4" /> Submit Results</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
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
  const [isUploadingFulfill, setIsUploadingFulfill] = useState(false);

  useEffect(() => {
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
    const patientTestRequestListeners: Unsubscribe[] = [];

    if (currentUser && !authLoading) {
      setLoading(true);
      const patientsQuery = query(collection(db, 'patients'), where('caregiverUid', '==', currentUser.uid));
      
      unsubscribe = onSnapshot(patientsQuery, async (patientsSnapshot) => {
        patientTestRequestListeners.forEach(listener => listener());
        patientTestRequestListeners.length = 0; 

        const managedPatientIds = patientsSnapshot.docs.map(doc => doc.id);
        const patientNamesMap = new Map(patientsSnapshot.docs.map(doc => [doc.id, doc.data().patientName]));

        if (managedPatientIds.length === 0) {
          setTestRequests([]);
          setLoading(false);
          return;
        }

        let combinedRequests: CaregiverTestRequestItem[] = [];
        
        managedPatientIds.forEach(patientId => {
          const testRequestsQuery = query(
            collection(db, 'patients', patientId, 'testRequests'),
            orderBy('requestedAt', 'desc')
          );

          const listener = onSnapshot(testRequestsQuery, (requestsSnapshot) => {
            const requestsForPatient = requestsSnapshot.docs.map(doc => ({
              id: doc.id,
              patientName: patientNamesMap.get(patientId) || 'Unknown Patient',
              ...doc.data()
            } as CaregiverTestRequestItem));
            
            combinedRequests = combinedRequests.filter(req => req.patientId !== patientId).concat(requestsForPatient);
            combinedRequests.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
            setTestRequests([...combinedRequests]); 

          }, (err) => {
            console.error(`Error fetching test requests for patient ${patientId}:`, err);
            setError(prev => prev || "Could not load some test requests. Please try again.");
          });
          patientTestRequestListeners.push(listener);
        });
        setLoading(false);

      }, (err) => {
        console.error("Error fetching caregiver's patients:", err);
        setError("Could not load patient data for test requests.");
        setLoading(false);
      });

    } else if (!currentUser && !authLoading) {
      setLoading(false);
      setTestRequests([]);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      patientTestRequestListeners.forEach(listener => listener());
    };
  }, [currentUser, authLoading]);

  const handleOpenFulfillDialog = (request: CaregiverTestRequestItem) => {
    setSelectedRequestToFulfill(request);
    setIsFulfillDialogOpen(true);
    router.replace(`/dashboard/caregiver/test-requests?patientId=${request.patientId}&requestId=${request.id}`, { scroll: false });
  };

  const handleCloseFulfillDialog = () => {
    setIsFulfillDialogOpen(false);
    setSelectedRequestToFulfill(null);
    router.replace('/dashboard/caregiver/test-requests', { scroll: false });
  }

  const handleFulfillSubmit = async (requestId: string, notes: string, files: FileList | null) => {
    if (!selectedRequestToFulfill) return;
    
    setIsUploadingFulfill(true);
    const resultCloudinaryUrls: string[] = [];
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadFileToCloudinary(file, toast);
        if (url) {
          resultCloudinaryUrls.push(url);
        }
      }
    }
    setIsUploadingFulfill(false);

    try {
      const testRequestDocRef = doc(db, 'patients', selectedRequestToFulfill.patientId, 'testRequests', requestId);
      await updateDoc(testRequestDocRef, {
        status: 'Fulfilled',
        resultNotes: notes,
        resultFileNames: resultCloudinaryUrls, // Store Cloudinary URLs
        fulfilledAt: serverTimestamp(),
      });
      toast({ title: 'Test Results Submitted', description: 'The doctor will be notified.' });
      
      // Add these new Cloudinary URLs to the main patient document as well
      if (resultCloudinaryUrls.length > 0) {
        const patientDocRef = doc(db, "patients", selectedRequestToFulfill.patientId);
        const patientDocSnap = await firebaseGetDoc(patientDocRef);
        if (patientDocSnap.exists()) {
          const existingFiles = patientDocSnap.data().uploadedFileNames || [];
          const validExistingFiles = existingFiles.filter((f: any) => typeof f === 'string');
          await updateDoc(patientDocRef, {
              uploadedFileNames: [...new Set([...validExistingFiles, ...resultCloudinaryUrls])]
          });
        }
      }
      handleCloseFulfillDialog();

    } catch (error: any) {
      console.error('Error fulfilling test request:', error);
      let errorMessage = 'Could not submit test results.';
      toast({ title: 'Submission Failed', description: errorMessage, variant: 'destructive' });
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
        isLoading={loading && testRequests.length === 0} 
        userRole="caregiver"
        onFulfillClick={(requestId) => {
            const req = testRequests.find(r => r.id === requestId);
            if (req) handleOpenFulfillDialog(req);
        }}
      />

      {selectedRequestToFulfill && (
        <FulfillRequestDialog
          isOpen={isFulfillDialogOpen}
          onOpenChange={handleCloseFulfillDialog}
          request={selectedRequestToFulfill}
          onSubmit={handleFulfillSubmit}
        />
      )}
    </div>
  );
}
