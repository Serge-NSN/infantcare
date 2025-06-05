
// src/components/dashboard/doctor/TestRequestDialog.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { FilePlus2, Loader2 } from 'lucide-react';

const testRequestSchema = z.object({
  testName: z.string().min(3, 'Test name must be at least 3 characters.'),
  reason: z.string().min(10, 'Reason must be at least 10 characters.'),
});

type TestRequestFormValues = z.infer<typeof testRequestSchema>;

interface TestRequestDialogProps {
  patientId: string;
  patientName: string;
  onTestRequested?: () => void; // Callback after successful request
}

export function TestRequestDialog({ patientId, patientName, onTestRequested }: TestRequestDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TestRequestFormValues>({
    resolver: zodResolver(testRequestSchema),
    defaultValues: {
      testName: '',
      reason: '',
    },
  });

  const onSubmit = async (data: TestRequestFormValues) => {
    if (!currentUser) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const testRequestsCollectionRef = collection(db, 'patients', patientId, 'testRequests');
      await addDoc(testRequestsCollectionRef, {
        patientId,
        testName: data.testName,
        reason: data.reason,
        status: 'Pending',
        requestingDoctorId: currentUser.uid,
        requestingDoctorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'N/A',
        requestedAt: serverTimestamp(),
      });
      toast({ title: 'Test Requested', description: `Request for ${data.testName} for ${patientName} submitted.` });
      reset();
      setOpen(false);
      onTestRequested?.();
    } catch (error) {
      console.error('Error requesting test:', error);
      toast({ title: 'Error', description: 'Failed to request test.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FilePlus2 className="mr-2 h-4 w-4" /> Request New Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-primary" /> Request Test for {patientName}
          </DialogTitle>
          <DialogDescription>
            Specify the test and reason for the request. The caregiver will be notified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Controller
              name="testName"
              control={control}
              render={({ field }) => (
                <>
                  <Label htmlFor="testName">Test Name</Label>
                  <Input id="testName" placeholder="e.g., Complete Blood Count, X-Ray Chest" {...field} />
                  {errors.testName && <p className="text-xs text-destructive">{errors.testName.message}</p>}
                </>
              )}
            />
          </div>
          <div className="grid gap-2">
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <>
                  <Label htmlFor="reason">Reason for Request</Label>
                  <Textarea id="reason" placeholder="e.g., To investigate persistent cough, rule out infection" {...field} rows={3} />
                  {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
                </>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
