
// src/app/dashboard/doctor/patient/[id]/page.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, UserCircle, Stethoscope, FlaskConical, FileScan, Activity, MailIcon, Info, CalendarDays, FileText as FileIcon, MessageSquare, AlertTriangle, Fingerprint, Send, Microscope, Hospital, PlusCircle, Loader2, UserCheck } from "lucide-react";
import Image from "next/image";
import { EmailButton } from '@/components/shared/EmailButton';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FeedbackList, type FeedbackItem } from '@/components/dashboard/shared/FeedbackList';
import { TestRequestDialog } from '@/components/dashboard/doctor/TestRequestDialog';
import { TestRequestList, type TestRequestItem } from '@/components/dashboard/shared/TestRequestList';

interface PatientData {
  id: string;
  patientName: string;
  patientId: string; 
  hospitalId: string;
  patientAge: string;
  patientGender: string;
  patientAddress: string;
  patientPhoneNumber: string;
  patientReligion?: string;
  hospitalName: string;
  previousDiseases?: string;
  currentMedications?: string;
  insuranceDetails?: string;
  uploadedFileNames?: string[]; // Assumed to be URLs now
  registrationDateTime: Timestamp;
  feedbackStatus: string; 
  caregiverUid: string;
  caregiverName?: string;
}

interface CaregiverProfile {
  email?: string;
  fullName?: string;
}

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const patientDocId = params.id as string;
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [caregiverProfile, setCaregiverProfile] = useState<CaregiverProfile | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newFeedbackText, setNewFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const [testRequests, setTestRequests] = useState<TestRequestItem[]>([]);
  const [loadingTestRequests, setLoadingTestRequests] = useState(true);

  const fetchPatientData = useCallback(async () => {
    if (!currentUser || !patientDocId) {
      setError("Authentication error or missing patient ID.");
      setLoadingPatient(false);
      return;
    }
    setLoadingPatient(true);
    setError(null);
    try {
      const patientDocRef = doc(db, "patients", patientDocId);
      const patientDocSnap = await getDoc(patientDocRef);

      if (patientDocSnap.exists()) {
        const data = patientDocSnap.data() as Omit<PatientData, 'id'>;
        setPatient({ id: patientDocSnap.id, ...data });

        if (data.caregiverUid) {
          const caregiverDocRef = doc(db, "users", data.caregiverUid);
          const caregiverDocSnap = await getDoc(caregiverDocRef);
          if (caregiverDocSnap.exists()) {
            setCaregiverProfile(caregiverDocSnap.data() as CaregiverProfile);
          }
        }
      } else {
        setError("Patient not found.");
        setPatient(null);
      }
    } catch (err: any) {
      console.error("Error fetching patient data (raw):", err);
      let specificError = "Could not load patient details. Please try again.";
      if (err.code === 'permission-denied') {
        specificError = `Permission denied when trying to read patient data. (Error: ${err.code})`;
      } else if (err.code === 'unavailable') {
        specificError = "Could not connect to the database to read patient data.";
      }
      setError(specificError);
      console.error("Fetch Patient - Error code:", err.code);
      console.error("Fetch Patient - Error message:", err.message);
    } finally {
      setLoadingPatient(false);
    }
  }, [currentUser, patientDocId]);

  useEffect(() => {
    if (!authLoading) {
      fetchPatientData();
    }
  }, [authLoading, fetchPatientData]);

  useEffect(() => {
    let unsubscribeFeedbacks: Unsubscribe | undefined;
    let unsubscribeTestRequests: Unsubscribe | undefined;

    if (patientDocId && currentUser) {
      setLoadingFeedbacks(true);
      const feedbacksQuery = query(collection(db, "patients", patientDocId, "patientFeedbacks"), orderBy("createdAt", "desc"));
      unsubscribeFeedbacks = onSnapshot(feedbacksQuery, (snapshot) => {
        const fetchedFeedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackItem));
        setFeedbacks(fetchedFeedbacks);
        setLoadingFeedbacks(false);
      }, (error) => {
        console.error("Error fetching feedbacks:", error);
        toast({ title: "Error loading feedback history", description: error.message, variant: "destructive" });
        setLoadingFeedbacks(false);
      });

      setLoadingTestRequests(true);
      const testRequestsQuery = query(collection(db, "patients", patientDocId, "testRequests"), orderBy("requestedAt", "desc"));
      unsubscribeTestRequests = onSnapshot(testRequestsQuery, (snapshot) => {
        const fetchedTestRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestRequestItem));
        setTestRequests(fetchedTestRequests);
        setLoadingTestRequests(false);
      }, (error) => {
        console.error("Error fetching test requests:", error);
        toast({ title: "Error loading test requests", description: error.message, variant: "destructive" });
        setLoadingTestRequests(false);
      });
    }
    return () => {
      if (unsubscribeFeedbacks) unsubscribeFeedbacks();
      if (unsubscribeTestRequests) unsubscribeTestRequests();
    };
  }, [patientDocId, currentUser, toast]);


  const handleFeedbackSubmit = async () => {
    if (!patient || !currentUser || !newFeedbackText.trim()) {
      toast({ title: "Error", description: "Feedback cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmittingFeedback(true);

    const feedbackData = {
      patientId: patient.id,
      feedbackNotes: newFeedbackText.trim(),
      doctorId: currentUser.uid,
      doctorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'N/A',
      createdAt: serverTimestamp()
    };
    
    try {
      const feedbacksCollectionRef = collection(db, "patients", patient.id, "patientFeedbacks");
      await addDoc(feedbacksCollectionRef, feedbackData);

      // Update the main patient document's feedbackStatus
      const patientDocRef = doc(db, "patients", patient.id);
      await updateDoc(patientDocRef, { 
        feedbackStatus: 'Reviewed by Doctor', 
        lastFeedbackAt: serverTimestamp() // Optional: track last feedback time on main doc
      });


      toast({ title: "Feedback Added", description: "Your feedback has been recorded." });
      setNewFeedbackText(''); 
    } catch (err: any) {
      console.error("Error submitting feedback (raw):", err);
      let description = "Could not submit feedback. Please try again.";
      if (err.code === 'permission-denied') {
        description = "Permission denied. Please check Firestore security rules for adding feedback.";
      }
      toast({ title: "Submission Failed", description, variant: "destructive" });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  
  const getStatusBadgeVariant = (status: string) => {
    const hasFeedback = feedbacks.length > 0;
    if (status === 'Pending Doctor Review' && !hasFeedback) return 'destructive';
    if (hasFeedback || status === 'Reviewed by Doctor') return 'secondary'; 
    return 'outline';
  };

  const DetailItem = ({ label, value, icon: IconComponent }: { label: string; value?: string | string[] | null; icon?: React.ElementType }) => (
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
        {IconComponent && <IconComponent className="mr-2 h-4 w-4 text-primary" />}
        {label}
      </h4>
      {Array.isArray(value) ? (
        value.length > 0 ? (
          <ul className="list-disc list-inside ml-4 text-sm">
            {value.map((item, index) => <li key={index}>{item || 'N/A'}</li>)}
          </ul>
        ) : <p className="text-sm text-foreground">N/A</p>
      ) : (
        <p className="text-sm text-foreground">{value || 'N/A'}</p>
      )}
    </div>
  );

  const overallLoading = authLoading || loadingPatient;

  if (overallLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-xl">
                 <CardHeader><Skeleton className="h-20 w-full" /></CardHeader>
                 <CardContent className="space-y-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                 </CardContent>
            </Card>
            <Card className="shadow-xl h-fit">
                <CardHeader><Skeleton className="h-10 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                     <Skeleton className="h-20 w-full" />
                     <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
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
            <Button className="mt-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-headline">Patient Not Found</h1>
        <p className="font-body">The patient with ID {patientDocId} could not be found.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/doctor">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/doctor/view-all-patients">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Image
                        src={`https://placehold.co/80x80.png?text=${patient.patientName.substring(0,1)}`}
                        alt="Patient Avatar" width={80} height={80}
                        className="rounded-full border-2 border-primary"
                        data-ai-hint="child face"
                    />
                    <div>
                        <CardTitle className="text-3xl font-headline">{patient.patientName}</CardTitle>
                        <CardDescription className="font-body">
                        Patient Record ID: {patient.patientId} &bull; Age: {patient.patientAge} &bull; Gender: {patient.patientGender}
                        </CardDescription>
                        <div className="mt-2">
                            <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)} className="text-sm px-3 py-1">
                                {feedbacks.length > 0 ? `${feedbacks.length} Feedback entr${feedbacks.length === 1 ? 'y' : 'ies'}` : patient.feedbackStatus}
                            </Badge>
                        </div>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <Card className="p-4 bg-secondary/30">
                        <CardTitle className="text-xl font-headline mb-3 flex items-center"><Hospital className="mr-2 h-5 w-5 text-primary" />Hospital & Registration</CardTitle>
                        <DetailItem label="Hospital Name" value={patient.hospitalName} />
                        <DetailItem label="Hospital ID" value={patient.hospitalId} icon={Fingerprint} />
                         <DetailItem
                            label="Registered On"
                            value={patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleString() : 'N/A'}
                            icon={CalendarDays}
                        />
                        <DetailItem label="Registered By (Caregiver)" value={patient.caregiverName} icon={UserCheck} />
                    </Card>
                     <Card className="p-4 bg-secondary/30">
                        <CardTitle className="text-xl font-headline mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Patient Demographics</CardTitle>
                        <DetailItem label="Address" value={patient.patientAddress} />
                        <DetailItem label="Guardian Phone" value={patient.patientPhoneNumber} />
                        <DetailItem label="Religion" value={patient.patientReligion} />
                    </Card>
                </div>
                 <Card className="p-4 bg-secondary/30">
                    <CardTitle className="text-xl font-headline mb-3 flex items-center"><Stethoscope className="mr-2 h-5 w-5 text-primary" />Medical Information</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailItem label="Previous Diseases" value={patient.previousDiseases} />
                        <DetailItem label="Current Medications" value={patient.currentMedications} />
                        <DetailItem label="Insurance Details" value={patient.insuranceDetails} />
                    </div>
                </Card>

                <Card className="p-4 bg-secondary/30">
                  <CardTitle className="text-xl font-headline mb-3 flex items-center"><FileIcon className="mr-2 h-5 w-5 text-primary" />Uploaded Files by Caregiver</CardTitle>
                  {patient.uploadedFileNames && patient.uploadedFileNames.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {patient.uploadedFileNames.map((fileSrc, index) => {
                        const isImageFile = typeof fileSrc === 'string' && /\.(jpe?g|png|gif|webp)$/i.test(fileSrc);
                        const fileNameFromUrl = typeof fileSrc === 'string' ? fileSrc.substring(fileSrc.lastIndexOf('/') + 1).split('?')[0] : 'File';

                        return (
                          <div key={index} className="flex flex-col items-center text-center p-2 border rounded-md bg-background shadow-sm">
                            {isImageFile && fileSrc ? ( // Ensure fileSrc is not empty
                              <Image
                                src={fileSrc} // Use the fileSrc (assumed URL) directly
                                alt={fileNameFromUrl || 'Uploaded image'}
                                width={150}
                                height={150}
                                className="rounded-md object-cover mb-1"
                                data-ai-hint="medical scan"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/150x150.png?text=Error';
                                  (e.target as HTMLImageElement).alt = 'Error loading image';
                                }}
                              />
                            ) : (
                              <div className="w-[150px] h-[150px] bg-muted rounded-md flex items-center justify-center mb-1">
                                <FileIcon className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-foreground truncate w-full max-w-[140px]">{fileNameFromUrl || 'Unnamed file'}</p>
                                </TooltipTrigger>
                                <TooltipContent><p>{fileNameFromUrl || 'Unnamed file'}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">No files uploaded by caregiver.</p>
                  )}
                </Card>

                 <FeedbackList feedbacks={feedbacks} isLoading={loadingFeedbacks} title="Patient Feedback History" />
                 <TestRequestList requests={testRequests} isLoading={loadingTestRequests} title="Test Request History" userRole="doctor" />
                 
              </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2"><MessageSquare className="w-5 h-5"/>Add New Feedback</CardTitle>
                    <CardDescription>Enter your diagnosis, notes, or recommendations for this patient.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea
                        value={newFeedbackText}
                        onChange={(e) => setNewFeedbackText(e.target.value)}
                        placeholder="Enter your detailed feedback here..."
                        rows={6}
                        className="font-body"
                        disabled={isSubmittingFeedback}
                    />
                    <Button
                        onClick={handleFeedbackSubmit}
                        disabled={isSubmittingFeedback || !newFeedbackText.trim()}
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/80"
                    >
                        {isSubmittingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {isSubmittingFeedback ? 'Submitting...' : 'Add Feedback'}
                    </Button>
                </CardContent>
            </Card>
            
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2"><FileScan className="w-5 h-5"/>Test Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <TestRequestDialog 
                        patientId={patient.id} 
                        patientName={patient.patientName}
                        onTestRequested={() => { /* Optionally refresh list or give feedback */ }}
                    />
                </CardContent>
            </Card>

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Communication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                     <EmailButton
                        receiverEmail={caregiverProfile?.email || "caregiver-email-not-found@example.com"}
                        subject={`Regarding Patient: ${patient.patientName} (ID: ${patient.patientId}) - Request for Information`}
                        body={`Dear Caregiver,\n\nCould you please provide additional information or clarification regarding patient ${patient.patientName} (ID: ${patient.patientId})?\n\nSpecifically, I need...\n\nThank you,\nDr. ${currentUser?.displayName || currentUser?.email?.split('@')[0]}\n`}
                        buttonText="Request Info from Caregiver"
                        icon={<Send className="mr-2 h-4 w-4" />}
                        className="w-full"
                        disabled={!caregiverProfile?.email}
                        title={!caregiverProfile?.email ? "Caregiver email not available" : ""}
                    />
                    <EmailButton
                        receiverEmail="specialist-consult@infantcare.example.com" // Placeholder
                        subject={`Specialist Consultation Request for Patient: ${patient.patientName} (ID: ${patient.patientId})`}
                        body={`Dear Specialist,\n\nI would like to request your consultation for patient ${patient.patientName} (ID: ${patient.patientId}).\n\nCase details: ...\n\nThank you,\nDr. ${currentUser?.displayName || currentUser?.email?.split('@')[0]}\n`}
                        buttonText="Contact Specialist"
                        icon={<MailIcon className="mr-2 h-4 w-4" />}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground text-center">Specialist email is a placeholder.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
