// src/app/dashboard/caregiver/add-patient/page.tsx
import { PatientRegistrationForm } from '@/components/dashboard/caregiver/PatientRegistrationForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function AddPatientPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/caregiver">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Caregiver Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">New Patient Registration</h1>
      </div>
      <Card className="w-full shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Patient Details</CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            Please fill in all the required information for the new patient. Fields like Registration Date, Time, and Patient ID will be automatically generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientRegistrationForm />
        </CardContent>
      </Card>
    </div>
  );
}
