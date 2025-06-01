import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, Eye, ClipboardList, Send, BarChart3 } from 'lucide-react';
import { EmailButton } from '@/components/shared/EmailButton';

// Mock data for patients
const mockPatients = [
  { id: 'pat001', name: 'Baby Alice', age: '3 months', lastVisit: '2024-07-15', status: 'Stable', doctorEmail: 'doctor@example.com', specialistEmail: 'specialist1@example.com' },
  { id: 'pat002', name: 'Infant Bob', age: '6 months', lastVisit: '2024-07-10', status: 'Needs Follow-up', doctorEmail: 'doctor@example.com', specialistEmail: 'specialist2@example.com' },
  { id: 'pat003', name: 'Toddler Charlie', age: '1.5 years', lastVisit: '2024-07-20', status: 'Critical', doctorEmail: 'doctor@example.com', specialistEmail: 'specialist1@example.com' },
];

// Mock data for tests
const mockTests = ['Laboratory Test', 'Screening Test', 'Images', 'Grams'];


export default function DoctorDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Medical Doctor Portal</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2"><Users className="w-6 h-6" /> Patient List</CardTitle>
          <CardDescription className="font-body">
            View and manage your patients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.id}</TableCell>
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.lastVisit}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'Stable' ? 'default' : patient.status === 'Needs Follow-up' ? 'secondary' : 'destructive'}
                           className={patient.status === 'Stable' ? 'bg-green-500 text-white' : patient.status === 'Needs Follow-up' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}>
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/doctor/patient/${patient.id}`}><Eye className="mr-1 h-4 w-4" /> View</Link>
                    </Button>
                     <EmailButton 
                        senderEmail={patient.doctorEmail} 
                        receiverEmail={patient.specialistEmail}
                        subject={`Regarding Patient: ${patient.name} (ID: ${patient.id})`}
                        buttonText="Email Specialist"
                        buttonSize="sm"
                        icon={<Send className="mr-1 h-4 w-4" />}
                      />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Placeholder for Request Tests Section. In a real app, this might be a modal or separate page per patient */}
      <Card className="mt-8 shadow-xl">
        <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Request Tests (General)</CardTitle>
            <CardDescription className="font-body">
                Select a patient from the list above to request specific tests. This is a general section.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-muted-foreground">Typically, you would select a patient first. For demonstration, here are test types:</p>
            <ul className="list-disc list-inside space-y-1">
                {mockTests.map(test => <li key={test}>{test}</li>)}
            </ul>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/80">
                Request Selected Tests
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
