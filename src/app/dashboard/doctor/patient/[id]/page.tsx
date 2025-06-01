
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, UserCircle, Stethoscope, FlaskConical, FileScan, Activity, MailIcon } from "lucide-react";
import Image from "next/image";
import { EmailButton } from '@/components/shared/EmailButton';

// Mock function to get patient data by ID
async function getPatientData(id: string) {
  // In a real app, fetch this from a database
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const mockPatients = [
    { id: 'pat001', name: 'Baby Alice', age: '3 months', gender: 'Female', address: '123 Sunshine Ave', phone: '555-0101', religion: 'N/A', previousDiseases: 'Neonatal jaundice', medications: 'Vitamin D drops', insurance: 'MediCare Plan A', files: ['birth_cert.pdf', 'vaccination_record.pdf'], doctorEmail: 'doctor@example.com', specialistEmail: 'specialist1@example.com' },
    { id: 'pat002', name: 'Infant Bob', age: '6 months', gender: 'Male', address: '456 Moonbeam Rd', phone: '555-0102', religion: 'N/A', previousDiseases: 'Colic', medications: 'Probiotics', insurance: 'HealthWell Plus', files: [], doctorEmail: 'doctor@example.com', specialistEmail: 'specialist2@example.com' },
    { id: 'pat003', name: 'Toddler Charlie', age: '1.5 years', gender: 'Male', address: '789 Starry Ln', phone: '555-0103', religion: 'N/A', previousDiseases: 'RSV, Otitis Media', medications: 'Amoxicillin (previous)', insurance: 'United Coverage', files: ['growth_chart.pdf'], doctorEmail: 'doctor@example.com', specialistEmail: 'specialist1@example.com' },
  ];
  return mockPatients.find(p => p.id === id) || null;
}

const testCategories = [
  { name: "Laboratory Test", icon: FlaskConical, description: "Blood work, urine tests, etc." },
  { name: "Screening Test", icon: FileScan, description: "Developmental, hearing, vision." },
  { name: "Images", icon: Activity, description: "X-rays, Ultrasounds, MRIs." },
  { name: "Grams", icon: Stethoscope, description: "EEG, ECG." },
];

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = await getPatientData(params.id);

  if (!patient) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-headline">Patient Not Found</h1>
        <p className="font-body">The patient with ID {params.id} could not be found.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
                <Image src="https://placehold.co/80x80.png" alt="Patient Avatar" width={80} height={80} className="rounded-full" data-ai-hint="child portrait" />
                <div>
                    <CardTitle className="text-3xl font-headline">{patient.name}</CardTitle>
                    <CardDescription className="font-body">Patient ID: {patient.id} &bull; Age: {patient.age} &bull; Gender: {patient.gender}</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold font-headline text-lg">Contact Information</h3>
              <p className="font-body text-sm text-muted-foreground">Address: {patient.address}</p>
              <p className="font-body text-sm text-muted-foreground">Phone: {patient.phone}</p>
              {patient.religion && <p className="font-body text-sm text-muted-foreground">Religion: {patient.religion}</p>}
            </div>
            <div>
              <h3 className="font-semibold font-headline text-lg">Medical History</h3>
              <p className="font-body text-sm text-muted-foreground">Previous Diseases: {patient.previousDiseases || 'N/A'}</p>
              <p className="font-body text-sm text-muted-foreground">Current Medications: {patient.medications || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold font-headline text-lg">Insurance</h3>
              <p className="font-body text-sm text-muted-foreground">{patient.insurance || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold font-headline text-lg">Patient Files</h3>
              {patient.files && patient.files.length > 0 ? (
                <ul className="list-disc list-inside font-body text-sm text-muted-foreground">
                  {patient.files.map(file => <li key={file}><a href="#" className="text-primary hover:underline">{file}</a></li>)}
                </ul>
              ) : (
                <p className="font-body text-sm text-muted-foreground">No files uploaded.</p>
              )}
            </div>
          </CardContent>
           <CardFooter className="flex justify-end">
             <EmailButton 
                senderEmail={patient.doctorEmail} 
                receiverEmail={patient.specialistEmail}
                subject={`Follow-up on Patient: ${patient.name} (ID: ${patient.id})`}
                buttonText="Contact Specialist"
                buttonSize="default"
                icon={<MailIcon className="mr-2 h-4 w-4" />}
              />
           </CardFooter>
        </Card>

        <Card className="shadow-xl h-fit">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Request Tests</CardTitle>
            <CardDescription className="font-body">Select tests to request for {patient.name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testCategories.map(test => (
              <Button key={test.name} variant="outline" className="w-full justify-start">
                <test.icon className="mr-2 h-5 w-5 text-primary" />
                {test.name}
              </Button>
            ))}
          </CardContent>
          <CardFooter>
             <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/80">
                Submit Test Requests
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
