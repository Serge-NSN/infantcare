
// src/app/dashboard/caregiver/patient/[patientId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { ArrowLeft, UserCircle, Hospital, CalendarDays, Stethoscope, Microscope, FileText, Edit, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PatientData {
  id: string;
  patientName: string;
  patientId: string; // The custom generated ID
  patientAge: string;
  patientGender: string;
  patientAddress: string;
  patientPhoneNumber: string;
  patientReligion?: string;
  hospitalName: string;
  hospitalId: string; // Caregiver input hospital ID
  previousDiseases?: string;
  currentMedications?: string;
  insuranceDetails?: string;
  uploadedFileNames?: string[];
  registrationDateTime: Timestamp;
  feedbackStatus: string;
  caregiverUid: string;
  // doctorFeedback will be added later
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
          // Ensure the caregiver viewing this patient is the one who registered them
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
            {[...Array(6)].map((_, i) => (
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
        <p>Patient data could not be loaded.</p>
         <Button asChild className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }
  
  const DetailItem = ({ label, value, icon: Icon }: { label: string; value?: string | string[] | null; icon?: React.ElementType }) => (
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
        {Icon && <Icon className="mr-2 h-4 w-4 text-primary" />}
        {label}
      </h4>
      {Array.isArray(value) ? (
        value.length > 0 ? (
          <ul className="list-disc list-inside ml-4 text-sm">
            {value.map((item, index) => <li key={index}>{item}</li>)}
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
              Patient ID: {patient.patientId} &bull; Age: {patient.patientAge} &bull; Gender: {patient.patientGender}
            </CardDescription>
          </div>
           <Button variant="outline" size="sm" disabled> {/* Placeholder for Edit */}
              <Edit className="mr-2 h-4 w-4" /> Edit Information
            </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <Card className="p-4 bg-secondary/30">
              <CardTitle className="text-xl font-headline mb-3 flex items-center"><Hospital className="mr-2 h-5 w-5 text-primary" />Hospital & Registration</CardTitle>
              <DetailItem label="Hospital Name" value={patient.hospitalName} />
              <DetailItem label="Hospital ID (Caregiver Input)" value={patient.hospitalId} />
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
                <CardTitle className="text-xl font-headline mb-3 flex items-center"><Microscope className="mr-2 h-5 w-5 text-primary" />Feedback Status</CardTitle>
                <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)} className="text-sm px-3 py-1">
                  {patient.feedbackStatus}
                </Badge>
                 {/* Placeholder for Doctor Feedback */}
                <div className="mt-4 p-3 border rounded-md bg-background">
                    <h4 className="font-semibold text-muted-foreground">Doctor's Feedback:</h4>
                    <p className="text-sm text-muted-foreground italic">No feedback provided yet.</p>
                    {/* <p className="text-sm"><strong>Dr. Sample:</strong> Patient seems stable, monitor growth.</p> */}
                </div>
            </Card>
            
            <Card className="p-4 bg-secondary/30">
              <CardTitle className="text-xl font-headline mb-3 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Uploaded Files</CardTitle>
              <DetailItem label="File Names" value={patient.uploadedFileNames && patient.uploadedFileNames.length > 0 ? patient.uploadedFileNames : ["No files uploaded."]} />
              {/* Actual file links/previews would go here in a full app */}
            </Card>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Last updated: {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString() : 'N/A'} (This would be an 'updatedAt' field ideally)
        </CardFooter>
      </Card>
    </div>
  );
}
