// src/app/dashboard/doctor/patient/[id]/page.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, UserCircle, Stethoscope, FlaskConical, FileScan, Activity, MailIcon, Info, CalendarDays, FileText as FileIcon, MessageSquare, AlertTriangle, Fingerprint, Send, Microscope, Hospital, PlusCircle, Loader2, UserCheck, Download, MessageCircleQuestion, GraduationCap, ListChecks, HeartPulse, Palette, Eye, Wind, Weight, Thermometer, Gauge, FolderOpen, Wifi, Video } from "lucide-react";
import Image from "next/image";
import { EmailButton } from '@/components/shared/EmailButton';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, Unsubscribe, writeBatch, where, getDocs } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FeedbackList, type FeedbackItem } from '@/components/dashboard/shared/FeedbackList';
import { TestRequestDialog } from '@/components/dashboard/doctor/TestRequestDialog';
import { TestRequestList, type TestRequestItem } from '@/components/dashboard/shared/TestRequestList';
import { generatePatientPdf } from '@/lib/utils/generatePatientPdf';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';


interface PatientData {
  id: string;
  patientName: string;
  patientId: string; 
  hospitalId: string;
  patientAge: string;
  patientGender: string;
  patientAddress: string;
  patientPhoneNumber: string;
  hospitalName: string;
  previousDiseases?: string;
  currentMedications?: string;
  
  // Vitals
  bloodPressure?: string;
  bodyTemperature?: string;
  heartRate?: string;
  oxygenSaturation?: string;
  respiratoryRate?: string;
  weight?: string;
  skinTone?: string;
  colourOfEyes?: string;

  uploadedFileNames?: string[]; 
  labResultUrls?: string[];
  ecgResultUrls?: string[];
  otherMedicalFileUrls?: string[];
  registrationDateTime: Timestamp;
  feedbackStatus: string; 
  caregiverUid: string;
  caregiverName?: string;
}

interface CaregiverProfile {
  email?: string;
  fullName?: string;
}

export interface SpecialistConsultationRequest {
    id: string; 
    patientId: string;
    patientName: string; 
    requestingDoctorId: string;
    requestingDoctorName: string;
    requestDetails: string;
    status: 'Pending Specialist Review' | 'Feedback Provided by Specialist' | 'Archived';
    requestedAt: Timestamp;
    specialistId?: string; 
    specialistName?: string;
    specialistFeedback?: string;
    feedbackProvidedAt?: Timestamp;
}

interface SpecialistUser {
    uid: string;
    fullName: string;
    email: string;
}

interface RequestConsultationDialogProps {
  patientId: string;
  patientName: string;
  onConsultationRequested: () => void;
}

function RequestConsultationDialog({ patientId, patientName, onConsultationRequested }: RequestConsultationDialogProps) {
  const [open, setOpen] = useState(false);
  const [requestDetails, setRequestDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!currentUser || !requestDetails.trim()) {
      toast({ title: "Error", description: "Consultation details cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const consultationData = {
        patientId,
        patientName, // Denormalize for easier display for specialist
        requestingDoctorId: currentUser.uid,
        requestingDoctorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'N/A',
        requestDetails: requestDetails.trim(),
        status: 'Pending Specialist Review',
        requestedAt: serverTimestamp(),
      };
      
      const batch = writeBatch(db);

      const consultationRef = doc(collection(db, "patients", patientId, "specialistConsultations"));
      batch.set(consultationRef, consultationData);

      const patientDocRef = doc(db, "patients", patientId);
      batch.update(patientDocRef, { feedbackStatus: 'Pending Specialist Consultation' });
      
      await batch.commit();

      toast({ title: "Consultation Requested", description: `Specialist consultation requested for ${patientName}.` });
      setRequestDetails('');
      setOpen(false);
      onConsultationRequested();
    } catch (error) {
      console.error("Error requesting specialist consultation:", error);
      toast({ title: "Request Failed", description: "Could not request consultation. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><MessageCircleQuestion className="mr-2 h-4 w-4" /> Request Specialist Consultation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Specialist Consultation for {patientName}</DialogTitle>
          <DialogDescription>
            Clearly describe the reason for consultation and what specific advice you are seeking from the specialist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="consultationDetails">Consultation Details</Label>
            <Textarea
              id="consultationDetails"
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="e.g., Patient presents with X, Y, Z. Seeking opinion on differential diagnosis for A, B, C and recommended advanced tests..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !requestDetails.trim()} className="bg-accent text-accent-foreground">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmailSpecialistDialog({ patientId, patientName }: { patientId: string; patientName: string }) {
    const [open, setOpen] = useState(false);
    const [specialists, setSpecialists] = useState<SpecialistUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSpecialistEmail, setSelectedSpecialistEmail] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            const fetchSpecialists = async () => {
                setIsLoading(true);
                try {
                    const q = query(collection(db, 'users'), where('role', '==', 'Specialist'));
                    const querySnapshot = await getDocs(q);
                    const fetchedSpecialists = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as SpecialistUser));
                    setSpecialists(fetchedSpecialists);
                } catch (error) {
                    console.error("Error fetching specialists:", error);
                    toast({ title: "Error", description: "Could not fetch specialist list.", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchSpecialists();
        }
    }, [open, toast]);

    const patientRecordUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/dashboard/specialist/patient/${patientId}`
        : '';

    const emailBody = `Dear Specialist,\n\nPlease join the video conference for a deep discussion about patient ${patientName}.\n\nMeeting link: ${meetingLink || '[Paste Meeting Link Here]'}\n\nFor patient details, please visit:\n${patientRecordUrl}\n`;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <MailIcon className="mr-2 h-4 w-4" /> Email Conference Link to Specialist
                </Button>
            </DialogTrigger>
            <DialogContent className="overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Email Conference Link</DialogTitle>
                    <DialogDescription>Select a specialist and enter the meeting link to send an invitation.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="specialist-select">Select Specialist</Label>
                        <Select onValueChange={setSelectedSpecialistEmail} value={selectedSpecialistEmail}>
                            <SelectTrigger id="specialist-select">
                                <SelectValue placeholder={isLoading ? "Loading specialists..." : "Select a specialist"} />
                            </SelectTrigger>
                            <SelectContent>
                                {specialists.map(s => (
                                    <SelectItem key={s.uid} value={s.email}>{s.fullName} ({s.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="meeting-link">Meeting Link</Label>
                        <Input 
                            id="meeting-link" 
                            placeholder="https://meet.google.com/xyz-abcd-efg" 
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <EmailButton 
                        receiverEmail={selectedSpecialistEmail}
                        subject={`Video Conference for Patient: ${patientName}`}
                        body={emailBody}
                        buttonText="Send Email"
                        disabled={!selectedSpecialistEmail || meetingLink.trim().length < 8}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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
  const [specialistConsultations, setSpecialistConsultations] = useState<SpecialistConsultationRequest[]>([]);
  const [loadingSpecialistConsultations, setLoadingSpecialistConsultations] = useState(true);
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
    let unsubFeedbacks: Unsubscribe | undefined;
    let unsubTestRequests: Unsubscribe | undefined;
    let unsubSpecialistConsultations: Unsubscribe | undefined;

    if (patientDocId && currentUser) {
      // Doctor's Feedback
      setLoadingFeedbacks(true);
      const feedbacksQuery = query(collection(db, "patients", patientDocId, "patientFeedbacks"), orderBy("createdAt", "desc"));
      unsubFeedbacks = onSnapshot(feedbacksQuery, (snapshot) => {
        setFeedbacks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackItem)));
        setLoadingFeedbacks(false);
      }, (err) => { console.error("Feedback fetch error:", err); setLoadingFeedbacks(false); });

      // Test Requests
      setLoadingTestRequests(true);
      const testRequestsQuery = query(collection(db, "patients", patientDocId, "testRequests"), orderBy("requestedAt", "desc"));
      unsubTestRequests = onSnapshot(testRequestsQuery, (snapshot) => {
        setTestRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TestRequestItem)));
        setLoadingTestRequests(false);
      }, (err) => { console.error("Test request fetch error:", err); setLoadingTestRequests(false); });
      
      // Specialist Consultations
      setLoadingSpecialistConsultations(true);
      const specialistConsultationsQuery = query(collection(db, "patients", patientDocId, "specialistConsultations"), orderBy("requestedAt", "desc"));
      unsubSpecialistConsultations = onSnapshot(specialistConsultationsQuery, (snapshot) => {
        setSpecialistConsultations(snapshot.docs.map(d => ({ id: d.id, ...d.data()} as SpecialistConsultationRequest)));
        setLoadingSpecialistConsultations(false);
      }, (err) => { console.error("Specialist consultation fetch error:", err); setLoadingSpecialistConsultations(false); });
    }
    return () => {
      if (unsubFeedbacks) unsubFeedbacks();
      if (unsubTestRequests) unsubTestRequests();
      if (unsubSpecialistConsultations) unsubSpecialistConsultations();
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
      const batchWrite = writeBatch(db);
      const feedbacksCollectionRef = collection(db, "patients", patient.id, "patientFeedbacks");
      const newFeedbackRef = doc(feedbacksCollectionRef); // Auto-generate ID
      batchWrite.set(newFeedbackRef, feedbackData);

      const patientDocRef = doc(db, "patients", patient.id);
      batchWrite.update(patientDocRef, { 
        feedbackStatus: 'Reviewed by Doctor', 
        lastFeedbackAt: serverTimestamp()
      });
      
      await batchWrite.commit();

      toast({ title: "Feedback Added", description: "Your feedback has been recorded." });
      setNewFeedbackText(''); 
      fetchPatientData(); // Re-fetch patient to update status display
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
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Reviewed by Doctor') return 'secondary'; 
    if (status === 'Pending Specialist Consultation') return 'outline';
    if (status === 'Specialist Feedback Provided') return 'default';
    return 'outline';
  };
  
  const getSpecialistConsultationStatusBadgeProps = (status: SpecialistConsultationRequest['status']) => {
    if (status === 'Pending Specialist Review') {
      return { variant: 'outline' as const, className: 'text-yellow-600 border-yellow-500/70 dark:border-yellow-600/70' };
    }
    if (status === 'Feedback Provided by Specialist') {
      return { variant: 'default' as const, className: 'bg-green-600 hover:bg-green-600/90 text-primary-foreground border-green-600' };
    }
    return { variant: 'outline' as const, className: 'text-muted-foreground' };
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
  
  const FileDisplayCard = ({ title, files, icon: Icon }: { title: string; files?: string[]; icon: React.ElementType }) => {
    if (!files || files.length === 0) {
      return null; // Don't render the card if there are no files
    }
    return (
      <Card className="p-4 bg-secondary/30">
        <CardTitle className="text-xl font-headline mb-3 flex items-center">
          <Icon className="mr-2 h-5 w-5 text-primary" /> {title}
        </CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((fileSrc, index) => {
            const fileNameFromUrl = (typeof fileSrc === 'string' && fileSrc.startsWith('http'))
              ? fileSrc.substring(fileSrc.lastIndexOf('/') + 1).split('?')[0] || 'File'
              : (typeof fileSrc === 'string' && fileSrc.startsWith('data:image'))
              ? `Embedded Image ${index + 1}`
              : `File ${index + 1}`;

            let showActualImage = false;
             if (typeof fileSrc === 'string' && fileSrc.trim() !== '') {
                if (fileSrc.startsWith('data:image')) {
                    showActualImage = true;
                } else if (fileSrc.startsWith('http://') || fileSrc.startsWith('https://')) {
                     if ((/\.(jpe?g|png|gif|webp)(\?|$)/i.test(fileSrc) || fileSrc.includes('cloudinary'))) {
                        try { new URL(fileSrc); showActualImage = true; } catch (e) {}
                    }
                }
            }
            const isImage = showActualImage;
            
            return (
              <a key={index} href={fileSrc} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="flex flex-col items-center text-center p-2 border rounded-md bg-background shadow-sm h-full group-hover:shadow-lg transition-shadow">
                  {isImage && fileSrc ? ( 
                    <Image src={fileSrc} alt={fileNameFromUrl || 'Uploaded image'} width={150} height={150} className="rounded-md object-cover mb-1" data-ai-hint="medical scan" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x150.png?text=Error'; (e.target as HTMLImageElement).alt = 'Error loading image';}} />
                  ) : (
                    <div className="w-[150px] h-[150px] bg-muted rounded-md flex items-center justify-center mb-1 group-hover:bg-muted/80 transition-colors">
                      <FileIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><p className="text-xs text-primary group-hover:underline truncate w-full max-w-[140px]">{fileNameFromUrl}</p></TooltipTrigger><TooltipContent><p>{fileNameFromUrl}</p></TooltipContent></Tooltip></TooltipProvider>
                </div>
              </a>
            );
          })}
        </div>
      </Card>
    );
  };

  const handleDownloadReport = async () => {
    if (!patient || !currentUser) {
      toast({ title: "Error", description: "Patient data or user information is missing.", variant: "destructive" });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generatePatientPdf(patient, feedbacks, testRequests, {
        displayName: currentUser.displayName,
        email: currentUser.email,
      });
      toast({ title: "Report Generated", description: "Patient report PDF has been downloaded." });
    } catch (error: any) {
      console.error("Error generating PDF report:", error);
      toast({ title: "PDF Generation Failed", description: error.message || "Could not generate the PDF report.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const handleTelemonitoringClick = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Telemonitoring integration will be available in a future update to fetch live patient data.",
    });
  };

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
                <div className="flex flex-col sm:flex-row justify-between items-start">
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
                                    {patient.feedbackStatus}
                                </Badge>
                            </div>
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 self-start sm:self-center">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleDownloadReport}
                            disabled={isGeneratingPdf}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isGeneratingPdf ? 'Generating...' : 'Download Report'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTelemonitoringClick}
                        >
                            <Wifi className="mr-2 h-4 w-4" />
                            Telemonitoring
                        </Button>
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
                            value={patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleString('en-US') : 'N/A'}
                            icon={CalendarDays}
                        />
                        <DetailItem label="Registered By (Caregiver)" value={patient.caregiverName} icon={UserCheck} />
                    </Card>
                     <Card className="p-4 bg-secondary/30">
                        <CardTitle className="text-xl font-headline mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Patient Demographics</CardTitle>
                        <DetailItem label="Address" value={patient.patientAddress} />
                        <DetailItem label="Guardian Phone" value={patient.patientPhoneNumber} />
                    </Card>
                </div>
                 <Card className="p-4 bg-secondary/30">
                    <CardTitle className="text-xl font-headline mb-3 flex items-center"><Stethoscope className="mr-2 h-5 w-5 text-primary" />Medical Information</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailItem label="Previous Diseases" value={patient.previousDiseases} />
                        <DetailItem label="Current Medications" value={patient.currentMedications} />
                    </div>
                </Card>

                <Card className="p-4 bg-secondary/30">
                  <CardTitle className="text-xl font-headline mb-3 flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-primary" />Vitals</CardTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2">
                    <DetailItem label="Blood Pressure" value={patient.bloodPressure} icon={Gauge} />
                    <DetailItem label="Body Temperature" value={patient.bodyTemperature} icon={Thermometer} />
                    <DetailItem label="Heart Rate" value={patient.heartRate} icon={HeartPulse} />
                    <DetailItem label="SPO2" value={patient.oxygenSaturation} icon={Activity} />
                    <DetailItem label="Respiratory Rate" value={patient.respiratoryRate} icon={Wind} />
                    <DetailItem label="Weight" value={patient.weight} icon={Weight} />
                    <DetailItem label="Skin Tone" value={patient.skinTone} icon={Palette} />
                    <DetailItem label="Colour of Eyes" value={patient.colourOfEyes} icon={Eye} />
                  </div>
                </Card>

                <FileDisplayCard title="General Medical Images/Files" files={patient.uploadedFileNames} icon={FolderOpen} />
                <FileDisplayCard title="Lab Results" files={patient.labResultUrls} icon={Microscope} />
                <FileDisplayCard title="ECG Results" files={patient.ecgResultUrls} icon={Activity} />
                <FileDisplayCard title="Other Uploaded Medical Files" files={patient.otherMedicalFileUrls} icon={FileIcon} />

                 <FeedbackList feedbacks={feedbacks} isLoading={loadingFeedbacks} title="Your Feedback History" />
                 <TestRequestList requests={testRequests} isLoading={loadingTestRequests} title="Test Request History" userRole="doctor" />
                 
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Specialist Consultations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingSpecialistConsultations ? (
                            <Skeleton className="h-16 w-full" />
                        ) : specialistConsultations.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No specialist consultations requested for this patient yet.</p>
                        ) : (
                        specialistConsultations.map(consult => {
                            const badgeProps = getSpecialistConsultationStatusBadgeProps(consult.status);
                            return (
                            <Card key={consult.id} className="bg-purple-500/10 border-purple-500/30">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-md font-semibold">
                                            Consultation requested on: {consult.requestedAt?.toDate ? new Date(consult.requestedAt.toDate()).toLocaleDateString() : 'N/A'}
                                        </CardTitle>
                                        <Badge variant={badgeProps.variant} className={badgeProps.className}>
                                            {consult.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <p className="font-medium text-muted-foreground">Your Request Details:</p>
                                        <p className="whitespace-pre-wrap p-2 border rounded-md bg-background">{consult.requestDetails}</p>
                                    </div>
                                    {consult.status === 'Feedback Provided by Specialist' && (
                                    <div>
                                        <p className="font-medium text-muted-foreground">Specialist (Dr. {consult.specialistName || 'N/A'}) Feedback ({consult.feedbackProvidedAt?.toDate ? new Date(consult.feedbackProvidedAt.toDate()).toLocaleDateString() : 'N/A'}):</p>
                                        <p className="whitespace-pre-wrap p-2 border rounded-md bg-background text-green-700 dark:text-green-400">{consult.specialistFeedback}</p>
                                    </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                        }))}
                    </CardContent>
                </Card>

              </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2"><MessageSquare className="w-5 h-5"/>Add New Feedback</CardTitle>
                    <CardDescription>Enter your diagnosis, notes, or recommendations for this patient. This will be visible to the caregiver.</CardDescription>
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
                        {isSubmittingFeedback ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {isSubmittingFeedback ? 'Submitting...' : 'Add Feedback & Update Status'}
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
                        onTestRequested={() => { fetchPatientData(); }}
                    />
                </CardContent>
            </Card>

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2"><Video className="w-5 h-5"/>Video Conference</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button asChild className="w-full">
                        <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">
                            <Video className="mr-2 h-4 w-4" /> Start Instant Meeting
                        </a>
                    </Button>
                    <EmailSpecialistDialog patientId={patient.id} patientName={patient.patientName} />
                </CardContent>
            </Card>
            
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2"><ListChecks className="w-5 h-5"/>Specialist Actions</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-3">
                    <RequestConsultationDialog
                        patientId={patient.id}
                        patientName={patient.patientName}
                        onConsultationRequested={() => fetchPatientData()} // Re-fetch to update list and status
                    />
                     <EmailButton
                        receiverEmail="specialist@example.com" // Generic, replace if actual specialist emails are stored
                        subject={`Regarding Patient: ${patient.patientName} (ID: ${patient.patientId}) - Follow-up`}
                        body={`Dear Specialist,\n\nFollowing up on the consultation for patient ${patient.patientName} (ID: ${patient.patientId}).\n\n...\n\nThank you,\nDr. ${currentUser?.displayName || currentUser?.email?.split('@')[0]}\n`}
                        buttonText="Email Specialist (General Follow-up)"
                        icon={<MailIcon className="mr-2 h-4 w-4" />}
                        className="w-full"
                        variant="outline"
                    />
                </CardContent>
            </Card>

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Caregiver Communication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                     <EmailButton
                        receiverEmail={caregiverProfile?.email || "caregiver-email-not-available@example.com"}
                        subject={`Regarding Patient: ${patient.patientName} (ID: ${patient.patientId}) - Information Request`}
                        body={`Dear Caregiver,\n\nPlease could you provide additional information or clarification regarding patient ${patient.patientName} (ID: ${patient.patientId})?\n\nSpecifically, I need...\n\nThank you,\nDr. ${currentUser?.displayName || currentUser?.email?.split('@')[0]}\n`}
                        buttonText="Request Info from Caregiver"
                        icon={<Send className="mr-2 h-4 w-4" />}
                        className="w-full"
                        disabled={!caregiverProfile?.email}
                        title={!caregiverProfile?.email ? "Caregiver email not available" : ""}
                    />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
