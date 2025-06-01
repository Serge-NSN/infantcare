import { PatientRegistrationForm } from '@/components/dashboard/caregiver/PatientRegistrationForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function CaregiverDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Caregiver Portal</h1>
      </div>
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">New Patient Registration</CardTitle>
          <CardDescription className="font-body">
            Please fill in all the details for the new patient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientRegistrationForm />
        </CardContent>
      </Card>
    </div>
  );
}
