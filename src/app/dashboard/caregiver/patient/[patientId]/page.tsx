
// src/app/dashboard/caregiver/patient/[patientId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ArrowLeft, UserCircle, Hospital, CalendarDays, Stethoscope, Microscope, FileText as FileIcon, Edit, AlertTriangle, Info, Fingerprint, UserCheck, MessageSquareText, FileScan, Download, Loader2, Wifi, Activity, FolderOpen, HeartPulse, Thermometer, Wind, Weight, Eye, Palette, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FeedbackList, type FeedbackItem } from '@/components/dashboard/shared/FeedbackList';
import { TestRequestList, type TestRequestItem } from '@/components/dashboard/shared/TestRequestList';
import { useToast } from '@/hooks/use-toast';
import { generatePatientPdf } from '@/lib/utils/generatePatientPdf';

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

  // Files
  uploadedFileNames?: string[]; 
  labResultUrls?: string[];
  ecgResultUrls?: string[];
  otherMedicalFileUrls?: string[];
  registrationDateTime: Timestamp;
  feedbackStatus: string; 
  caregiverUid: string;
  caregiverName?: string;
}

export default function CaregiverPatientDetailPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientDocId = params.patientId as string;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [testRequests, setTestRequests] = useState<TestRequestItem[]>([]);
  const [loadingTestRequests, setLoadingTestRequests] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  const fetchPatientData = useCallback(async () => {
    if (!currentUser || !patientDocId) {
      setError("User not authenticated or patient ID missing.");
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
      // Fetch Feedbacks
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

      // Fetch Test Requests
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


  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Pending Doctor Review' && feedbacks.length === 0) return 'destructive';
    if (feedbacks.length > 0) return 'default'; 
    return 'outline';
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

  const overallLoading = loadingPatient || authLoading;

  if (overallLoading) {
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
             <Skeleton className="md:col-span-2 h-24" /> 
             <Skeleton className="md:col-span-2 h-24" />
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
                if ((/\.(jpe?g|png|gif|webp|pdf|doc|docx|txt)(\?|$)/i.test(fileSrc) || fileSrc.includes('cloudinary'))) {
                    try {
                        new URL(fileSrc); 
                        showActualImage = (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(fileSrc) || fileSrc.includes('cloudinary')); // Only show image previews
                    } catch (e) {
                        console.warn(`[Image Check] Malformed URL string in uploadedFileNames: ${fileSrc}`);
                    }
                }
              }
            }
            const isImage = showActualImage;

            return (
              <a key={index} href={fileSrc} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="flex flex-col items-center text-center p-2 border rounded-md bg-background shadow-sm h-full group-hover:shadow-lg transition-shadow">
                  {isImage && fileSrc ? (
                    <Image
                      src={fileSrc} 
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
                    <div className="w-[150px] h-[150px] bg-muted rounded-md flex items-center justify-center mb-1 group-hover:bg-muted/80 transition-colors">
                      <FileIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <p className="text-xs text-primary group-hover:underline truncate w-full max-w-[140px]">{fileNameFromUrl}</p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fileNameFromUrl}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </a>
            );
          })}
        </div>
      </Card>
    );
  };


  const latestFeedback = feedbacks.length > 0 ? feedbacks[0] : null; 

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" className="mb-6" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="text-3xl font-headline flex items-center">
              <UserCircle className="mr-3 h-10 w-10 text-primary" />
              {patient.patientName}
            </CardTitle>
            <CardDescription className="font-body">
              Patient Record ID: {patient.patientId} &bull; Age: {patient.patientAge} &bull; Gender: {patient.patientGender}
            </CardDescription>
            <div className="mt-2">
                <Badge variant={getStatusBadgeVariant(patient.feedbackStatus)} className="text-sm px-3 py-1">
                    {feedbacks.length > 0 ? `${feedbacks.length} Feedback Entr${feedbacks.length === 1 ? 'y' : 'ies'}` : patient.feedbackStatus}
                </Badge>
            </div>
          </div>
           <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button variant="outline" size="sm" asChild> 
                <Link href={`/dashboard/caregiver/patient/${patient.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Information
                </Link>
              </Button>
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
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <Card className="p-4 bg-secondary/30">
              <CardTitle className="text-xl font-headline mb-3 flex items-center"><Hospital className="mr-2 h-5 w-5 text-primary" />Hospital & Registration</CardTitle>
              <DetailItem label="Hospital Name" value={patient.hospitalName} />
              <DetailItem label="Hospital ID" value={patient.hospitalId} icon={Fingerprint} />
              <DetailItem 
                label="Registered On" 
                value={patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'} 
                icon={CalendarDays}
              />
              <DetailItem label="Registered By" value={patient.caregiverName} icon={UserCheck} />
            </Card>

            <Card className="p-4 bg-secondary/30">
                <CardTitle className="text-xl font-headline mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Patient Demographics</CardTitle>
                <DetailItem label="Address" value={patient.patientAddress} />
                <DetailItem label="Phone Number (Guardian)" value={patient.patientPhoneNumber} />
            </Card>
            
            <Card className="p-4 bg-secondary/30 md:col-span-2">
              <CardTitle className="text-xl font-headline mb-3 flex items-center"><Stethoscope className="mr-2 h-5 w-5 text-primary" />Medical Information</CardTitle>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailItem label="Previous Diseases" value={patient.previousDiseases} />
                    <DetailItem label="Current Medications" value={patient.currentMedications} />
                </div>
            </Card>

            <Card className="p-4 bg-secondary/30 md:col-span-2">
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
          </div>

            <FileDisplayCard title="General Medical Images/Files" files={patient.uploadedFileNames} icon={FolderOpen} />
            <FileDisplayCard title="Lab Results" files={patient.labResultUrls} icon={Microscope} />
            <FileDisplayCard title="ECG Results" files={patient.ecgResultUrls} icon={Activity} />
            <FileDisplayCard title="Other Uploaded Medical Files" files={patient.otherMedicalFileUrls} icon={FileIcon} />
            
             <div className="md:col-span-2">
                <FeedbackList feedbacks={feedbacks} isLoading={loadingFeedbacks} title="Doctor Feedback History" />
             </div>
             <div className="md:col-span-2">
                <TestRequestList 
                    requests={testRequests} 
                    isLoading={loadingTestRequests} 
                    title="Requested Tests" 
                    userRole="caregiver" 
                    onFulfillClick={(requestId) => router.push(`/dashboard/caregiver/test-requests?patientId=${patient.id}&requestId=${requestId}`)}
                />
             </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Patient record last formally updated: {patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
          {latestFeedback?.createdAt?.toDate && ` (Latest doctor feedback: ${new Date(latestFeedback.createdAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })})`}
        </CardFooter>
      </Card>
    </div>
  );
}
