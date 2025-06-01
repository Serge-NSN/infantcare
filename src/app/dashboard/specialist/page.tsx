import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ListChecks, MessageSquare, Send, UserCheck } from 'lucide-react';
import { EmailButton } from '@/components/shared/EmailButton';

// Mock data for requests
const mockRequests = [
  { id: 'req001', patientName: 'Baby Alice', patientId: 'pat001', requestingDoctor: 'Dr. Smith', requestDate: '2024-07-22', details: 'Review X-ray for possible hip dysplasia.', status: 'Pending', doctorEmail: 'dr.smith@example.com', specialistEmail: 'specialist@example.com' },
  { id: 'req002', patientName: 'Infant Bob', patientId: 'pat002', requestingDoctor: 'Dr. Jones', requestDate: '2024-07-21', details: 'Second opinion on developmental screening results.', status: 'Reviewed', doctorEmail: 'dr.jones@example.com', specialistEmail: 'specialist@example.com' },
];

export default function SpecialistDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
       <div className="flex items-center gap-3 mb-6">
        <UserCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Specialist Portal</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center gap-2"><ListChecks className="w-6 h-6" /> Consultation Requests</CardTitle>
            <CardDescription className="font-body">
              Review requests for feedback from doctors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRequests.length === 0 && <p className="text-muted-foreground">No active requests.</p>}
            {mockRequests.map(request => (
              <Card key={request.id} className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex justify-between items-center">
                    {request.patientName} (ID: {request.patientId})
                    <Badge variant={request.status === 'Pending' ? 'destructive' : 'default'}
                            className={request.status === 'Pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}>
                        {request.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs font-body">
                    From: {request.requestingDoctor} | Date: {request.requestDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-body">{request.details}</p>
                </CardContent>
                <CardFooter className="flex justify-end">
                   <EmailButton 
                        senderEmail={request.specialistEmail} 
                        receiverEmail={request.doctorEmail}
                        subject={`Feedback for Patient: ${request.patientName} (ID: ${request.patientId})`}
                        buttonText="Reply to Doctor"
                        buttonSize="sm"
                        icon={<Send className="mr-1 h-4 w-4" />}
                      />
                </CardFooter>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-xl h-fit">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center gap-2"><MessageSquare className="w-6 h-6" /> Provide Feedback</CardTitle>
            <CardDescription className="font-body">
              Select a request and provide your expert feedback. (General Feedback Area)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Type your feedback here for the selected patient case..." rows={8} className="font-body" />
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/80">
              <Send className="mr-2 h-4 w-4" /> Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
