
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
  testName: z.string().min(3, 'Le nom du test doit comporter au moins 3 caractères.'),
  reason: z.string().min(10, 'La raison doit comporter au moins 10 caractères.'),
});

type TestRequestFormValues = z.infer<typeof testRequestSchema>;

interface TestRequestDialogProps {
  patientId: string;
  patientName: string;
  onTestRequested?: () => void; 
}

export function TestRequestDialog({ patientId, patientName, onTestRequested }: TestRequestDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TestRequestFormValues>({
    resolver: zodResolver(testRequestSchema),
    defaultValues: {
      testName: '',
      reason: '',
    },
  });

  const onSubmit = async (data: TestRequestFormValues) => {
    if (!currentUser) {
      toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
      return;
    }
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
      toast({ title: 'Test Demandé', description: `Demande pour ${data.testName} pour ${patientName} soumise.` });
      reset();
      setOpen(false);
      onTestRequested?.();
    } catch (error) {
      console.error('Error requesting test:', error);
      toast({ title: 'Erreur', description: 'Échec de la demande de test.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FilePlus2 className="mr-2 h-4 w-4" /> Demander un Nouveau Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-primary" /> Demander un Test pour {patientName}
          </DialogTitle>
          <DialogDescription>
            Spécifiez le test et la raison de la demande. Le personnel soignant sera notifié.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Controller
              name="testName"
              control={control}
              render={({ field }) => (
                <>
                  <Label htmlFor="testName">Nom du Test</Label>
                  <Input id="testName" placeholder="e.g., Numération Formule Sanguine, Radio Thoracique" {...field} />
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
                  <Label htmlFor="reason">Raison de la Demande</Label>
                  <Textarea id="reason" placeholder="e.g., Investigation toux persistante, exclure infection" {...field} rows={3} />
                  {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
                </>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Soumission en cours...' : 'Soumettre la Demande'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
