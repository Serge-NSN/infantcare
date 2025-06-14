// src/app/dashboard/admin/patient/[id]/page.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, UserCircle, Stethoscope, FlaskConical, FileScan, Activity, MailIcon, Info, CalendarDays, FileText as FileIcon, MessageSquare, AlertTriangle, Fingerprint, Send, Microscope, Hospital, PlusCircle, Loader2, UserCheck, Download, MessageCircleQuestion, GraduationCap, ListChecks, ShieldCheck, FolderOpen } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, Unsubscribe, writeBatch } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FeedbackList, type FeedbackItem } from '@/components/dashboard/shared/FeedbackList';
import { TestRequestList, type TestRequestItem } from '@/components/dashboard/shared/TestRequestList';
import { generatePatientPdf } from '@/lib/utils/generatePatientPdf';
import type { SpecialistConsultationRequest } from '@/app/dashboard/doctor/patient/[id]/page'; // Re-use type
import { getDashboardLink } from '@/lib/utils/getDashboardLink';

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


export default function AdminPatientDetailPage() {
  const params = useParams();
  const patientDocId = params.id as string;
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [caregiverProfile, setCaregiverProfile] = useState<CaregiverProfile | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]); // Doctor's feedback
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const [testRequests, setTestRequests] = useState<TestRequestItem[]>([]);
  const [loadingTestRequests, setLoadingTestRequests] = useState(true);
  
  const [specialistConsultations, setSpecialistConsultations] = useState<SpecialistConsultationRequest[]>([]);
  const [loadingSpecialistConsultations, setLoadingSpecialistConsultations] = useState(true);
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchPatientData = useCallback(async () => {
    if (!currentUser || !patientDocId || localStorage.getItem('userRole') !== 'Admin') {
      setError("Authentication error, missing patient ID, or insufficient permissions.");
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
      console.error("Error fetching patient data (admin):", err);
      let specificError = "Could not load patient details. Please try again.";
      if (err.code === 'permission-denied') {
        specificError = `Permission denied when trying to read patient data. (Error: ${err.code})`;
      }
      setError(specificError);
    } finally {
      setLoadingPatient(false);
    }
  }, [currentUser, patientDocId]);

  useEffect(() => {
    if (!authLoading && currentUser) {
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'Admin') {
            router.replace(getDashboardLink(userRole));
            return;
        }
        fetchPatientData();
    } else if (!authLoading && !currentUser) {
        router.replace('/login');
        return;
    }
  }, [authLoading, currentUser, fetchPatientData, router]);

  useEffect(() => {
    let unsubFeedbacks: Unsubscribe | undefined;
    let unsubTestRequests: Unsubscribe | undefined;
    let unsubSpecialistConsultations: Unsubscribe | undefined;

    if (patientDocId && currentUser && localStorage.getItem('userRole') === 'Admin') {
      // Doctor's Feedback
      setLoadingFeedbacks(true);
      const feedbacksQuery = query(collection(db, "patients", patientDocId, "patientFeedbacks"), orderBy("createdAt", "desc"));
      unsubFeedbacks = onSnapshot(feedbacksQuery, (snapshot) => {
        setFeedbacks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackItem)));
        setLoadingFeedbacks(false);
      }, (err) => { console.error("Feedback fetch error (admin):", err); setLoadingFeedbacks(false); });

      // Test Requests
      setLoadingTestRequests(true);
      const testRequestsQuery = query(collection(db, "patients", patientDocId, "testRequests"), orderBy("requestedAt", "desc"));
      unsubTestRequests = onSnapshot(testRequestsQuery, (snapshot) => {
        setTestRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TestRequestItem)));
        setLoadingTestRequests(false);
      }, (err) => { console.error("Test request fetch error (admin):", err); setLoadingTestRequests(false); });
      
      // Specialist Consultations
      setLoadingSpecialistConsultations(true);
      const specialistConsultationsQuery = query(collection(db, "patients", patientDocId, "specialistConsultations"), orderBy("requestedAt", "desc"));
      unsubSpecialistConsultations = onSnapshot(specialistConsultationsQuery, (snapshot) => {
        setSpecialistConsultations(snapshot.docs.map(d => ({ id: d.id, ...d.data()} as SpecialistConsultationRequest)));
        setLoadingSpecialistConsultations(false);
      }, (err) => { console.error("Specialist consultation fetch error (admin):", err); setLoadingSpecialistConsultations(false); });
    }
    return () => {
      if (unsubFeedbacks) unsubFeedbacks();
      if (unsubTestRequests) unsubTestRequests();
      if (unsubSpecialistConsultations) unsubSpecialistConsultations();
    };
  }, [patientDocId, currentUser, toast]);

  
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
      return (
        <Card className="p-4 bg-secondary/30">
          <CardTitle className="text-xl font-headline mb-3 flex items-center">
            <Icon className="mr-2 h-5 w-5 text-primary" /> {title}
          </CardTitle>
          <p className="text-sm text-foreground">No {title.toLowerCase()} uploaded.</p>
        </Card>
      );
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
            
            return (
              <div key={index} className="flex flex-col items-center text-center p-2 border rounded-md bg-background shadow-sm">
                {showActualImage && fileSrc ? ( 
                  <Image src={fileSrc} alt={fileNameFromUrl || 'Uploaded image'} width={150} height={150} className="rounded-md object-cover mb-1" data-ai-hint="medical scan" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x150.png?text=Error'; (e.target as HTMLImageElement).alt = 'Error loading image';}} />
                ) : (
                  <a href={fileSrc} target="_blank" rel="noopener noreferrer" className="w-[150px] h-[150px] bg-muted rounded-md flex items-center justify-center mb-1 hover:bg-muted/80 transition-colors">
                    <FileIcon className="h-16 w-16 text-muted-foreground" />
                  </a>
                )}
                <TooltipProvider><Tooltip><TooltipTrigger asChild><a href={fileSrc} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate w-full max-w-[140px]">{fileNameFromUrl}</a></TooltipTrigger><TooltipContent><p>{fileNameFromUrl}</p></TooltipContent></Tooltip></TooltipProvider>
              </div>
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
        displayName: currentUser.displayName || "Admin",
        email: currentUser.email,
      });
      toast({ title: "Report Generated", description: "Patient report PDF has been downloaded." });
    } catch (error: any) {
      console.error("Error generating PDF report (admin):", error);
      toast({ title: "PDF Generation Failed", description: error.message || "Could not generate the PDF report.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const overallLoading = authLoading || loadingPatient;

  if (overallLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
         <Card className="shadow-xl">
            <CardHeader><Skeleton className="h-20 w-full" /></CardHeader>
            <CardContent className="space-y-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </CardContent>
        </Card>
      </div>
    );
  }

   if (!currentUser || localStorage.getItem('userRole') !== 'Admin') {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Access Denied. Redirecting...</p>
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
            <Button asChild className="mt-4">
                <Link href="/dashboard/admin/view-all-patients"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List</Link>
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
          <Link href="/dashboard/admin/view-all-patients">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/admin/view-all-patients">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Patients
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start">
                <div className="flex items-start gap-3">
                    <UserCircle className="h-12 w-12 text-primary mt-1" />
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
                <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleDownloadReport}
                    disabled={isGeneratingPdf}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 mt-4 sm:mt-0 self-start sm:self-center"
                >
                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isGeneratingPdf ? 'Generating...' : 'Download Report'}
                </Button>
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
                    {caregiverProfile?.email && <DetailItem label="Caregiver Email" value={caregiverProfile.email} icon={MailIcon} />}
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

            <FileDisplayCard title="General Medical Images/Files" files={patient.uploadedFileNames} icon={FolderOpen} />
            <FileDisplayCard title="Lab Results" files={patient.labResultUrls} icon={Microscope} />
            <FileDisplayCard title="ECG Results" files={patient.ecgResultUrls} icon={Activity} />
            <FileDisplayCard title="Other Uploaded Medical Files" files={patient.otherMedicalFileUrls} icon={FileIcon} />
            
            <FeedbackList feedbacks={feedbacks} isLoading={loadingFeedbacks} title="Doctor Feedback History" />
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
                        <p className="text-sm text-muted-foreground italic">No specialist consultations requested for this patient.</p>
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
                                <CardDescription className="text-xs">By Dr. {consult.requestingDoctorName}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <p className="font-medium text-muted-foreground">Doctor's Request Details:</p>
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
        <CardFooter className="text-xs text-muted-foreground">
          Patient record last updated: {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString('en-US') : 'N/A'}
          . This is an admin view of the patient record.
        </CardFooter>
      </Card>
    </div>
  );
}
