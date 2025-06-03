
// src/app/dashboard/caregiver/patient/[patientId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { ArrowLeft, UserCircle, Hospital, CalendarDays, Stethoscope, Microscope, FileText as FileIcon, Edit, AlertTriangle, Info, Fingerprint, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PatientData {
  id: string;
  patientName: string;
  patientId: string; // System-generated ID for patient record
  hospitalId: string; // System-generated ID for hospital affiliation
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
  doctorFeedbackNotes?: string; // Added
  doctorName?: string;          // Added
  feedbackDateTime?: Timestamp; // Added
}

export default function CaregiverPatientDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const patientDocId = params.patientId as string;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatientData() {
      if (!currentUser || !patientDocId) {
        setError("User not authenticated or patient ID missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const patientDocRef = doc(db, "patients", patientDocId);
        const patientDocSnap = await getDoc(patientDocRef);

        if (patientDocSnap.exists()) {
          const data = patientDocSnap.data() as Omit<PatientData, 'id'>;
          if (data.caregiverUid !== currentUser.uid) {
            setError("You do not have permission to view this patient's details.");
            setPatient(null);
          } else {
            setPatient({ id: patientDocSnap.id, ...data });
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

    fetchPatientData();
  }, [currentUser, patientDocId]);

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review') return 'destructive';
    if (status === 'Reviewed by Doctor') return 'secondary';
    if (status === 'Specialist Feedback Provided') return 'default';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <Card className="max-w-md mx-auto shadow-lg border-destructive bg-destructive/10 p-6">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center justify-center gap-2">
              <AlertTriangle /> Error
            </CardTitle>
          </CardHeader>
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
        <p>Patient data could not be loaded.</p>
         <Button className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }
  
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" className="mb-6" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="text-3xl font-headline flex items-center">
              <UserCircle className="mr-3 h-10 w-10 text-primary" />
              {patient.patientName}
            </CardTitle>
            <CardDescription className="font-body">
              Patient Record ID: {patient.patientId} &bull; Age: {patient.patientAge} &bull; Gender: {patient.patientGender}
            </CardDescription>
          </div>
           <Button variant="outline" size="sm" asChild> 
              <Link href={`/dashboard/caregiver/patient/${patient.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit Information
              </Link>
            </Button>
        </CardHeader>
        <CardContent className="space-y-6">
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
                <DetailItem label="Phone Number (Guardian)" value={patient.patientPhoneNumber} />
                <DetailItem label="Religion" value={patient.patientReligion} />
            </Card>
            
            <Card className="p-4 bg-secondary/30 md:col-span-2">
              <CardTitle className="text-xl font-headline mb-3 flex items-center"><Stethoscope className="mr-2 h-5 w-5 text-primary" />Medical Information</CardTitle>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailItem label="Previous Diseases" value={patient.previousDiseases} />
                    <DetailItem label="Current Medications" value={patient.currentMedications} />
                    <DetailItem label="Insurance Details" value={patient.insuranceDetails} />
                </div>
            </Card>

            <Card className="p-4 bg-secondary/30">
                <CardTitle className="text-xl font-headline mb-3 flex items-center"><Microscope className="mr-2 h-5 w-5 text-primary" />Case Status & Feedback</CardTitle>
                <div className="space-y-1">
                    <span className="text-sm font-semibold text-muted-foreground">Overall Status: </span>
                    <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)} className="text-sm px-3 py-1">
                        {patient.feedbackStatus}
                    </Badge>
                </div>
                <div className="mt-4 p-3 border rounded-md bg-background shadow-sm">
                    <h4 className="font-semibold text-foreground mb-1 flex items-center"><UserCheck className="w-4 h-4 mr-2 text-primary" /> Doctor's Feedback:</h4>
                    {patient.doctorFeedbackNotes ? (
                        <>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{patient.doctorFeedbackNotes}</p>
                            {patient.doctorName && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Provided by: Dr. {patient.doctorName}
                                    {patient.feedbackDateTime?.toDate && ` on ${new Date(patient.feedbackDateTime.toDate()).toLocaleDateString()}`}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No feedback provided by a doctor yet.</p>
                    )}
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
                            <TooltipContent>
                              <p>{fileName || 'Unnamed file'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-foreground">No files uploaded.</p>
              )}
            </Card>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Patient record last formally updated: {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString() : 'N/A'}
          {patient.feedbackDateTime?.toDate && patient.feedbackStatus === 'Reviewed by Doctor' && ` (Doctor feedback: ${new Date(patient.feedbackDateTime.toDate()).toLocaleDateString()})`}
        </CardFooter>
      </Card>
    </div>
  );
}
    

    

