
// src/app/dashboard/caregiver/patient/[patientId]/edit/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientRegistrationForm } from '@/components/dashboard/caregiver/PatientRegistrationForm';
import type { PatientDataForForm } from '@/components/dashboard/caregiver/PatientRegistrationForm'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit, AlertTriangle, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientFirestoreData {
  id: string;
  patientName: string;
  patientId: string; 
  hospitalId: string; 
  patientAge: string;
  patientGender: "Male" | "Female" | "Other";
  patientAddress: string;
  patientPhoneNumber: string;
  hospitalName: string;
  previousDiseases?: string;
  currentMedications?: string;
  
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
  createdAt: Timestamp;
}


export default function EditPatientPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const patientDocId = params.patientId as string;

  const [patientDataForForm, setPatientDataForForm] = useState<PatientDataForForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("Edit Patient Information");

  useEffect(() => {
    async function fetchPatientData() {
      if (!currentUser || !patientDocId) {
        setError("Authentication error or missing patient ID.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const patientDocRef = doc(db, "patients", patientDocId);
        const patientDocSnap = await getDoc(patientDocRef);

        if (patientDocSnap.exists()) {
          const data = patientDocSnap.data() as Omit<PatientFirestoreData, 'id'>;
          if (data.caregiverUid !== currentUser.uid) {
            setError("You do not have permission to edit this patient.");
            setPatientDataForForm(null);
          } else {
            const transformedData: PatientDataForForm = {
              id: patientDocSnap.id, 
              hospitalName: data.hospitalName,
              hospitalId: data.hospitalId, 
              patientName: data.patientName,
              patientAge: data.patientAge,
              patientGender: data.patientGender,
              patientAddress: data.patientAddress,
              patientPhoneNumber: data.patientPhoneNumber,
              previousDiseases: data.previousDiseases || "",
              currentMedications: data.currentMedications || "",
              
              bloodPressure: data.bloodPressure || "",
              bodyTemperature: data.bodyTemperature || "",
              heartRate: data.heartRate || "",
              oxygenSaturation: data.oxygenSaturation || "",
              respiratoryRate: data.respiratoryRate || "",
              weight: data.weight || "",
              skinTone: data.skinTone || "",
              colourOfEyes: data.colourOfEyes || "",

              uploadedFileNames: data.uploadedFileNames || [],
              labResultUrls: data.labResultUrls || [],
              ecgResultUrls: data.ecgResultUrls || [],
              otherMedicalFileUrls: data.otherMedicalFileUrls || [],
            };
            setPatientDataForForm(transformedData);
            setPageTitle(`Edit Information for ${data.patientName}`);
          }
        } else {
          setError("Patient not found.");
          setPatientDataForForm(null);
        }
      } catch (err: any) {
        console.error("Error fetching patient data for editing:", err);
        setError("Could not load patient data for editing. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchPatientData();
  }, [currentUser, patientDocId]);

  if (loading) {
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
            {[...Array(5)].map((_, i) => ( 
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-1/4" />
          </CardContent>
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
  
  if (!patientDataForForm) {
     return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Patient data could not be loaded for editing.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href={`/dashboard/caregiver/patient/${patientDocId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient Details
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <UserCog className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">{pageTitle}</h1>
      </div>
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2"><Edit className="w-6 h-6"/> Patient Details</CardTitle>
          <CardDescription className="font-body">
            Modify the patient's registration information as needed. System-generated fields like Patient Record ID and Hospital ID are not editable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientRegistrationForm patientToEdit={patientDataForForm} />
        </CardContent>
      </Card>
    </div>
  );
}
