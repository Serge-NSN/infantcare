
// src/app/dashboard/doctor/patient/[id]/page.tsx
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, UserCircle, Stethoscope, FlaskConical, FileScan, Activity, MailIcon, Info, CalendarDays, FileText as FileIcon, MessageSquare, AlertTriangle, Fingerprint, Send, Microscope, Hospital } from "lucide-react";
import Image from "next/image";
import { EmailButton } from '@/components/shared/EmailButton';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PatientData {
  id: string;
  patientName: string;
  patientId: string; // System-generated patient record ID
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
  uploadedFileNames?: string[];
  registrationDateTime: Timestamp;
  feedbackStatus: string;
  caregiverUid: string;
  doctorFeedbackNotes?: string;
  doctorId?: string;
  doctorName?: string;
  feedbackDateTime?: Timestamp;
  // Potential future fields: specialistId, specialistFeedbackNotes etc.
}

interface CaregiverProfile {
  email?: string;
  fullName?: string;
}


const testCategories = [
  { name: "Laboratory Test", icon: FlaskConical, description: "Blood work, urine tests, etc." },
  { name: "Screening Test", icon: FileScan, description: "Developmental, hearing, vision." },
  { name: "Images", icon: Activity, description: "X-rays, Ultrasounds, MRIs." },
  { name: "Grams", icon: Stethoscope, description: "EEG, ECG." },
];

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const patientDocId = params.id as string;
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [caregiverProfile, setCaregiverProfile] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    async function fetchPatientAndCaregiverData() {
      if (authLoading || !currentUser || !patientDocId) {
        if(!currentUser && !authLoading){
            setError("Authentication required to view patient details.");
            setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const patientDocRef = doc(db, "patients", patientDocId);
        const patientDocSnap = await getDoc(patientDocRef);

        if (patientDocSnap.exists()) {
          const data = patientDocSnap.data() as Omit<PatientData, 'id'>;
          const fetchedPatient = { id: patientDocSnap.id, ...data };
          setPatient(fetchedPatient);
          setFeedbackText(fetchedPatient.doctorFeedbackNotes || '');

          // Fetch caregiver's email for "Request More Info" button
          if (data.caregiverUid) {
            try {
              const caregiverDocRef = doc(db, "users", data.caregiverUid);
              const caregiverDocSnap = await getDoc(caregiverDocRef);
              if (caregiverDocSnap.exists()) {
                setCaregiverProfile(caregiverDocSnap.data() as CaregiverProfile);
              } else {
                 console.warn(`Caregiver profile not found for UID: ${data.caregiverUid}`);
              }
            } catch (caregiverError) {
               console.error("Error fetching caregiver profile:", caregiverError);
            }
          }

        } else {
          setError("Patient not found.");
          setPatient(null);
        }
      } catch (err: any) {
        console.error("Error fetching patient data:", err);
        setError("Could not load patient details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchPatientAndCaregiverData();
  }, [authLoading, currentUser, patientDocId]);

  const handleFeedbackSubmit = async () => {
    if (!patient || !currentUser || !feedbackText.trim()) {
      toast({ title: "Error", description: "Feedback cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const patientDocRef = doc(db, "patients", patient.id);
      const feedbackData: any = { // Using 'any' temporarily for flexibility, can be typed better
        doctorFeedbackNotes: feedbackText.trim(),
        feedbackStatus: 'Reviewed by Doctor',
        doctorId: currentUser.uid,
        doctorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'N/A',
        feedbackDateTime: serverTimestamp()
      };

      await updateDoc(patientDocRef, feedbackData);

      toast({ title: "Feedback Submitted", description: "Patient record updated successfully." });
      setPatient(prev => prev ? {
         ...prev, 
         ...feedbackData, // Spread the submitted data
         feedbackDateTime: Timestamp.now() // Client-side approximation
        } : null);
      // Optionally, disable form or redirect
    } catch (err: any) {
      console.error("Error submitting feedback (raw):", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);

      let description = "Could not submit feedback. Please try again.";
      if (err.code === 'permission-denied') {
        description = "Permission denied. Please check Firestore security rules for updating patient records.";
      } else if (err.code === 'unavailable') {
        description = "Could not connect to the database. Please check your internet connection.";
      } else if (err.code) { // If there's a specific code, mention it
        description = `Could not submit feedback (Error: ${err.code}). Please try again.`;
      }
      
      toast({ title: "Submission Failed", description: description, variant: "destructive" });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  
  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Reviewed by Doctor') return 'secondary'; // e.g. blue/purple
    if (status === 'Specialist Feedback Provided') return 'default'; // e.g. green
    return 'outline';
  };

  const DetailItem = ({ label, value, icon: IconComponent, fullWidth = false }: { label: string; value?: string | string[] | null; icon?: React.ElementType; fullWidth?: boolean }) => (
    <div className={`mb-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
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


  if (loading || authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-xl">
                 <CardHeader><Skeleton className="h-20 w-full" /></CardHeader>
                 <CardContent className="space-y-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                 </CardContent>
            </Card>
            <Card className="shadow-xl h-fit">
                <CardHeader><Skeleton className="h-10 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
            <Button asChild className="mt-4" onClick={() => router.back()}>
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
        <Link href="/dashboard/doctor">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Information Column */}
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
                                {patient.feedbackStatus}
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
                  <CardTitle className="text-xl font-headline mb-3 flex items-center"><FileIcon className="mr-2 h-5 w-5 text-primary" />Uploaded Files</CardTitle>
                  {patient.uploadedFileNames && patient.uploadedFileNames.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {patient.uploadedFileNames.map((fileName, index) => {
                        const isImageFile = typeof fileName === 'string' && /\.(jpe?g|png|gif|webp)$/i.test(fileName);
                        return (
                          <div key={index} className="flex flex-col items-center text-center p-2 border rounded-md bg-background shadow-sm">
                            {isImageFile ? (
                              <Image
                                src={`https://placehold.co/150x150.png`} 
                                alt={fileName || 'Uploaded image'}
                                width={150}
                                height={150}
                                className="rounded-md object-cover mb-1"
                                data-ai-hint="medical scan"
                              />
                            ) : (
                              <div className="w-[150px] h-[150px] bg-muted rounded-md flex items-center justify-center mb-1">
                                <FileIcon className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-foreground truncate w-full max-w-[140px]">{fileName || 'Unnamed file'}</p>
                                </TooltipTrigger>
                                <TooltipContent><p>{fileName || 'Unnamed file'}</p></TooltipContent>
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
                 {patient.feedbackStatus === 'Reviewed by Doctor' && patient.doctorFeedbackNotes && (
                    <Card className="p-4 border-primary bg-primary/10">
                        <CardTitle className="text-xl font-headline mb-3 flex items-center"><Microscope className="mr-2 h-5 w-5 text-primary"/>Doctor's Review</CardTitle>
                        <p className="text-sm font-semibold">Reviewed by: {patient.doctorName || 'N/A'}</p>
                        {patient.feedbackDateTime?.toDate && <p className="text-xs text-muted-foreground mb-2">Date: {new Date(patient.feedbackDateTime.toDate()).toLocaleString()}</p>}
                        <p className="text-sm whitespace-pre-wrap">{patient.doctorFeedbackNotes}</p>
                    </Card>
                 )}
              </CardContent>
            </Card>
        </div>

        {/* Actions & Feedback Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2"><MessageSquare className="w-5 h-5"/>Provide/Update Feedback</CardTitle>
                    <CardDescription>Enter your diagnosis, notes, or recommendations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea 
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Enter your detailed feedback here..." 
                        rows={8} 
                        className="font-body"
                        disabled={isSubmittingFeedback || patient.feedbackStatus === 'Reviewed by Doctor' && patient.doctorId !== currentUser?.uid && !!patient.doctorId}
                    />
                     {patient.feedbackStatus === 'Reviewed by Doctor' && patient.doctorId !== currentUser?.uid && !!patient.doctorId && (
                        <p className="text-xs text-orange-600">Feedback already provided by Dr. {patient.doctorName}. You can only edit your own feedback.</p>
                     )}
                     {patient.feedbackStatus === 'Reviewed by Doctor' && patient.doctorId === currentUser?.uid && (
                        <p className="text-xs text-blue-600">You have already provided feedback. You can update it here.</p>
                     )}
                    <Button 
                        onClick={handleFeedbackSubmit} 
                        disabled={isSubmittingFeedback || !feedbackText.trim() || (patient.feedbackStatus === 'Reviewed by Doctor' && patient.doctorId !== currentUser?.uid && !!patient.doctorId) }
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/80"
                    >
                        {isSubmittingFeedback ? 'Submitting...' : (patient.feedbackStatus === 'Reviewed by Doctor' && patient.doctorId === currentUser?.uid ? 'Update Feedback' : 'Submit Feedback')}
                    </Button>
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

            <Card className="shadow-xl h-fit">
              <CardHeader>
                <CardTitle className="text-xl font-headline">Request Tests (Placeholder)</CardTitle>
                <CardDescription className="font-body">Select tests to request for {patient.name}. (Functionality to be implemented)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {testCategories.map(test => (
                  <Button key={test.name} variant="outline" className="w-full justify-start" disabled>
                    <test.icon className="mr-2 h-5 w-5 text-primary" />
                    {test.name}
                  </Button>
                ))}
              </CardContent>
              <CardFooter>
                 <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/80" disabled>
                    Submit Test Requests
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}

