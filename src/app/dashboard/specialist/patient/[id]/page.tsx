// src/app/dashboard/specialist/patient/[id]/page.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, UserCircle, Stethoscope, FlaskConical, FileScan, Activity, MailIcon, Info, CalendarDays, FileText as FileIcon, MessageSquare, AlertTriangle, Fingerprint, Send, Microscope, Hospital, PlusCircle, Loader2, UserCheck, Download, MessageCircleQuestion, GraduationCap, HeartPulse, Palette, Eye, Wind, Weight, Thermometer, Gauge, FolderOpen, Wifi, Video } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, query, orderBy, onSnapshot, Unsubscribe, getDocs, DocumentReference } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FeedbackList, type FeedbackItem } from '@/components/dashboard/shared/FeedbackList'; // To show doctor's prior feedback
import { EmailButton } from '@/components/shared/EmailButton';


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

export interface SpecialistConsultationRequest {
    id: string; // Firestore document ID
    patientId: string;
    patientName: string; // Denormalized for easier display
    requestingDoctorId: string;
    requestingDoctorName: string;
    requestDetails: string;
    status: 'Pending Specialist Review' | 'Feedback Provided by Specialist' | 'Archived';
    requestedAt: Timestamp;
    specialistId?: string; // Assigned specialist
    specialistName?: string;
    specialistFeedback?: string;
    feedbackProvidedAt?: Timestamp;
}

interface RequestingDoctorProfile {
    fullName: string;
    email: string;
    career: string;
    hospital: string;
    address: string;
}


export default function SpecialistPatientFeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientDocId = params.id as string;
  const consultationRequestId = searchParams.get('consultationRequestId');

  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [consultationRequest, setConsultationRequest] = useState<SpecialistConsultationRequest | null>(null);
  const [doctorFeedbacks, setDoctorFeedbacks] = useState<FeedbackItem[]>([]);
  const [requestingDoctorProfile, setRequestingDoctorProfile] = useState<RequestingDoctorProfile | null>(null);
  
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newSpecialistFeedback, setNewSpecialistFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser || !patientDocId) {
      setError("Authentication error or missing patient ID.");
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setError(null);
    try {
      // Fetch Patient Data
      const patientDocRef = doc(db, "patients", patientDocId);
      const patientDocSnap = await getDoc(patientDocRef);
      if (patientDocSnap.exists()) {
        setPatient({ id: patientDocSnap.id, ...(patientDocSnap.data() as Omit<PatientData, 'id'>) });
      } else {
        throw new Error("Patient not found.");
      }

      // Fetch Consultation Request if ID is present
      if (consultationRequestId) {
        const requestDocRef = doc(db, "patients", patientDocId, "specialistConsultations", consultationRequestId);
        const requestDocSnap = await getDoc(requestDocRef);
        if (requestDocSnap.exists()) {
          const requestData = { id: requestDocSnap.id, ...(requestDocSnap.data() as Omit<SpecialistConsultationRequest, 'id'>) };
          setConsultationRequest(requestData);

          // Fetch requesting doctor's email for communication
          if (requestData.requestingDoctorId) {
            const doctorDocRef = doc(db, "users", requestData.requestingDoctorId);
            const doctorDocSnap = await getDoc(doctorDocRef);
            if (doctorDocSnap.exists()) {
              setRequestingDoctorProfile(doctorDocSnap.data() as RequestingDoctorProfile);
            }
          }
        } else {
          console.warn("Consultation request not found, but continuing to show patient data.");
        }
      }

      // Fetch Doctor's existing feedback for context
      const feedbacksQuery = query(collection(db, "patients", patientDocId, "patientFeedbacks"), orderBy("createdAt", "desc"));
      const feedbackSnapshot = await getDocs(feedbacksQuery);
      setDoctorFeedbacks(feedbackSnapshot.docs.map(d => ({id: d.id, ...d.data()} as FeedbackItem)));

    } catch (err: any) {
      console.error("Error fetching data for specialist review:", err);
      setError(err.message || "Could not load data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, [currentUser, patientDocId, consultationRequestId]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const handleFeedbackSubmit = async () => {
    if (!patient || !consultationRequest || !currentUser || !newSpecialistFeedback.trim()) {
      toast({ title: "Error", description: "Feedback cannot be empty or request is missing.", variant: "destructive" });
      return;
    }
    setIsSubmittingFeedback(true);

    const specialistFeedbackData = {
      specialistId: currentUser.uid,
      specialistName: currentUser.displayName || currentUser.email?.split('@')[0] || 'N/A',
      specialistFeedback: newSpecialistFeedback.trim(),
      feedbackProvidedAt: serverTimestamp(),
      status: 'Feedback Provided by Specialist'
    };
    
    try {
      // Update the specialistConsultations document
      const consultationDocRef = doc(db, "patients", patient.id, "specialistConsultations", consultationRequest.id);
      await updateDoc(consultationDocRef, specialistFeedbackData);

      // Update the main patient document status
      const patientDocRef = doc(db, "patients", patient.id);
      await updateDoc(patientDocRef, { 
        feedbackStatus: 'Specialist Feedback Provided',
        lastSpecialistFeedbackAt: serverTimestamp() // Optional: track last specialist activity
      });

      toast({ title: "Feedback Submitted", description: "Your specialist feedback has been recorded and the doctor notified." });
      setNewSpecialistFeedback(''); 
      // Optionally, redirect or update UI state further
      router.push('/dashboard/specialist');

    } catch (err: any) {
      console.error("Error submitting specialist feedback:", err);
      toast({ title: "Submission Failed", description: "Could not submit feedback. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingFeedback(false);
    }
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
      return null;
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
  
  const handleTelemonitoringClick = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Telemonitoring integration will be available in a future update to fetch live patient data.",
    });
  };

  const getSpecialistConsultationStatusBadgeProps = (status: SpecialistConsultationRequest['status']) => {
    if (status === 'Pending Specialist Review') {
      return { variant: 'outline' as const, className: 'text-yellow-600 border-yellow-500/70 dark:border-yellow-600/70' };
    }
    if (status === 'Feedback Provided by Specialist') {
      return { variant: 'default' as const, className: 'bg-green-600 hover:bg-green-600/90 text-primary-foreground border-green-600' };
    }
    return { variant: 'outline' as const, className: 'text-muted-foreground' }; // Default for other statuses (e.g. Archived)
  };

  const overallLoading = authLoading || loadingData;

  if (overallLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
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
                <Link href="/dashboard/specialist"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Patient data could not be loaded.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/specialist"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Specialist Dashboard</Link>
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex items-start gap-3">
                        <UserCircle className="h-12 w-12 text-primary mt-1" />
                        <div>
                            <CardTitle className="text-3xl font-headline">{patient.patientName}</CardTitle>
                            <CardDescription className="font-body">
                            Patient ID: {patient.patientId} &bull; Age: {patient.patientAge} &bull; Gender: {patient.patientGender}
                            </CardDescription>
                            {consultationRequest && (
                                <Badge variant={getSpecialistConsultationStatusBadgeProps(consultationRequest.status).variant} className={`mt-2 ${getSpecialistConsultationStatusBadgeProps(consultationRequest.status).className}`}>
                                    {consultationRequest.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                {consultationRequest && (
                  <Card className="p-4 bg-secondary/30">
                      <CardTitle className="text-xl font-headline mb-3 flex items-center"><MessageCircleQuestion className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />Doctor's Consultation Request</CardTitle>
                      <DetailItem label="Requesting Doctor" value={`Dr. ${consultationRequest.requestingDoctorName}`} icon={UserCheck}/>
                      <DetailItem label="Requested On" value={consultationRequest.requestedAt?.toDate ? new Date(consultationRequest.requestedAt.toDate()).toLocaleString('en-US') : 'N/A'} icon={CalendarDays}/>
                      <div className="mt-2">
                          <p className="text-sm font-semibold text-muted-foreground">Request Details:</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap p-2 border rounded-md bg-background">{consultationRequest.requestDetails}</p>
                      </div>
                  </Card>
                )}

                {consultationRequest?.status === 'Feedback Provided by Specialist' && consultationRequest.specialistFeedback && (
                     <Card className="p-4 bg-green-500/10 border-green-500/30">
                        <CardTitle className="text-xl font-headline mb-3 flex items-center"><GraduationCap className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />Your Submitted Feedback</CardTitle>
                        <DetailItem label="Feedback By" value={`Dr. ${consultationRequest.specialistName || 'N/A'}`} icon={UserCheck}/>
                        <DetailItem label="Provided On" value={consultationRequest.feedbackProvidedAt?.toDate ? new Date(consultationRequest.feedbackProvidedAt.toDate()).toLocaleString('en-US') : 'N/A'} icon={CalendarDays}/>
                        <div className="mt-2">
                            <p className="text-sm font-semibold text-muted-foreground">Feedback Notes:</p>
                            <p className="text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap p-2 border rounded-md bg-background">{consultationRequest.specialistFeedback}</p>
                        </div>
                    </Card>
                )}
                
                <FeedbackList feedbacks={doctorFeedbacks} isLoading={loadingData} title="Previous Doctor Feedback History (for context)" />
                
                <FileDisplayCard title="General Medical Images/Files" files={patient.uploadedFileNames} icon={FolderOpen} />
                <FileDisplayCard title="Lab Results" files={patient.labResultUrls} icon={Microscope} />
                <FileDisplayCard title="ECG Results" files={patient.ecgResultUrls} icon={Activity} />
                <FileDisplayCard title="Other Uploaded Medical Files" files={patient.otherMedicalFileUrls} icon={FileIcon} />

              </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            {consultationRequest?.status === 'Pending Specialist Review' && (
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline flex items-center gap-2"><GraduationCap className="w-5 h-5 text-accent"/>Provide Your Specialist Feedback</CardTitle>
                        <CardDescription>Review the case and provide your expert opinion for Dr. {consultationRequest.requestingDoctorName}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Textarea
                            value={newSpecialistFeedback}
                            onChange={(e) => setNewSpecialistFeedback(e.target.value)}
                            placeholder="Enter your specialist feedback, diagnosis, or recommendations here..."
                            rows={8}
                            className="font-body"
                            disabled={isSubmittingFeedback}
                        />
                        <Button
                            onClick={handleFeedbackSubmit}
                            disabled={isSubmittingFeedback || !newSpecialistFeedback.trim()}
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/80"
                        >
                            {isSubmittingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-primary"/> Requesting Doctor Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loadingData ? (
                        <Skeleton className="h-20 w-full" />
                    ) : requestingDoctorProfile ? (
                        <>
                            <DetailItem label="Name" value={`Dr. ${requestingDoctorProfile.fullName}`} />
                            <DetailItem label="Specialty" value={requestingDoctorProfile.career} />
                            <DetailItem label="Hospital" value={requestingDoctorProfile.hospital} />
                            <EmailButton
                                receiverEmail={requestingDoctorProfile.email}
                                subject={`Question regarding patient: ${patient.patientName}`}
                                body={`Dear Dr. ${requestingDoctorProfile.fullName},\n\nI have a question regarding the consultation request for patient ${patient.patientName} (ID: ${patient.patientId}).\n\n...`}
                                buttonText="Email Doctor"
                                icon={<MailIcon className="mr-2 h-4 w-4"/>}
                                className="w-full"
                            />
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Doctor details not available.</p>
                    )}
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
                    <EmailButton
                        receiverEmail={requestingDoctorProfile?.email || ''}
                        subject={`Conference for Patient: ${patient.patientName} (ID: ${patient.patientId})`}
                        body={`Dear Dr. ${consultationRequest?.requestingDoctorName},\n\nPlease join the video conference to discuss patient ${patient.patientName} (ID: ${patient.patientId}).\n\nPaste the meeting link here: [Your Google Meet Link]\n\nThank you,\nDr. ${currentUser?.displayName || currentUser?.email?.split('@')[0]}\n`}
                        buttonText="Email Conference Link to Doctor"
                        icon={<MailIcon className="mr-2 h-4 w-4" />}
                        className="w-full"
                        variant="outline"
                        disabled={!requestingDoctorProfile?.email || !consultationRequest}
                        title={!requestingDoctorProfile?.email ? "Requesting doctor's email not available" : ""}
                    />
                </CardContent>
            </Card>

             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Patient Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <DetailItem label="Hospital Name" value={patient.hospitalName} icon={Hospital} />
                    <DetailItem label="Previous Diseases" value={patient.previousDiseases} icon={Stethoscope}/>
                    <DetailItem label="Current Medications" value={patient.currentMedications} icon={FlaskConical}/>
                    <DetailItem label="Blood Pressure" value={patient.bloodPressure} icon={Gauge} />
                    <DetailItem label="Temperature" value={patient.bodyTemperature} icon={Thermometer} />
                    <DetailItem label="Heart Rate" value={patient.heartRate} icon={HeartPulse} />
                    <DetailItem label="SPO2" value={patient.oxygenSaturation} icon={Activity} />
                    <DetailItem label="Respiratory Rate" value={patient.respiratoryRate} icon={Wind} />
                    <DetailItem label="Weight" value={patient.weight} icon={Weight} />
                    <DetailItem label="Skin Tone" value={patient.skinTone} icon={Palette} />
                    <DetailItem label="Eye Colour" value={patient.colourOfEyes} icon={Eye} />
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
