
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MedicalTermInput } from "@/components/shared/MedicalTermInput";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext"; 
import { v4 as uuidv4 } from 'uuid'; // For generating unique patient IDs

// Schema updated: removed registrationDate, registrationTime, patientId
const patientRegistrationSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name is required."),
  hospitalId: z.string().min(1, "Hospital ID is required."), // Caregiver inputs this specific ID from the hospital
  patientName: z.string().min(2, "Patient name is required."),
  patientAge: z.string().min(1, "Patient age is required (e.g., 3 months, 1 year)."),
  patientGender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required." }),
  patientAddress: z.string().min(5, "Address is required."),
  patientPhoneNumber: z.string().min(7, "Valid phone number is required."),
  patientReligion: z.string().optional(),
  previousDiseases: z.string().optional(),
  currentMedications: z.string().optional(),
  insuranceDetails: z.string().optional(),
  patientFiles: z.custom<FileList>().optional(),
});

type PatientRegistrationFormValues = z.infer<typeof patientRegistrationSchema>;

const defaultValues: Partial<PatientRegistrationFormValues> = {
  hospitalName: "",
  hospitalId: "",
  patientName: "",
  patientAge: "",
  // patientGender: undefined, // Will be selected
  patientAddress: "",
  patientPhoneNumber: "",
  patientReligion: "",
  previousDiseases: "",
  currentMedications: "",
  insuranceDetails: "",
};

export function PatientRegistrationForm() {
  const { toast } = useToast();
  const { currentUser } = useAuth(); 

  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues,
  });

  async function onSubmit(data: PatientRegistrationFormValues) {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to register a patient.",
        variant: "destructive",
      });
      return;
    }

    const fileNames: string[] = [];
    if (data.patientFiles && data.patientFiles.length > 0) {
      for (let i = 0; i < data.patientFiles.length; i++) {
        // In a real app, you'd upload files to Firebase Storage here and store URLs/references
        fileNames.push(data.patientFiles[i].name);
      }
    }

    // Auto-generate patientId and registrationDateTime
    const generatedPatientId = `PAT-${uuidv4().substring(0, 8).toUpperCase()}`;
    const registrationDateTime = serverTimestamp(); // Use server timestamp for consistency

    const patientData: any = {
      ...data,
      patientId: generatedPatientId, // Add auto-generated patientId
      caregiverUid: currentUser.uid, 
      registrationDateTime: registrationDateTime,
      createdAt: serverTimestamp(), // For record creation tracking
      uploadedFileNames: fileNames, 
    };
    
    delete patientData.patientFiles; // Remove FileList object before saving

    try {
      const docRef = await addDoc(collection(db, "patients"), patientData);
      console.log("Patient registered with Firestore ID: ", docRef.id, "and Patient ID:", generatedPatientId);
      toast({
        title: "Patient Registration Successful",
        description: `${data.patientName} (ID: ${generatedPatientId}) has been registered.`,
      });
      form.reset(); // Reset form to default values
    } catch (error: any) {
      console.error("Error registering patient:", error);
      let errorMessage = "Failed to register patient. Please try again.";
       if (error.code === "firestore/permission-denied") {
        errorMessage = "Permission denied. Please check Firestore rules.";
      } else if (error.message && error.message.includes("Unsupported field value")) {
         errorMessage = "Failed to register patient due to an invalid data field. Please check your inputs.";
         console.error("Offending data for Firestore:", patientData);
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Removed registrationDate and registrationTime fields */}
          <FormField
            control={form.control}
            name="hospitalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., City General Hospital" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hospitalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital ID (Caregiver Input)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., HOS-123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Baby John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           {/* Removed patientId field - will be auto-generated */}
          <FormField
            control={form.control}
            name="patientAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Age</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 6 months / 1 year 2 months" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="patientGender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="patientAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="123 Child St, Babytown" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="patientPhoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number (Guardian)</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1-555-123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="patientReligion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Religion (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Christianity, Islam, None" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="previousDiseases"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <MedicalTermInput
                  id="previousDiseases"
                  label="Previous Diseases (Optional)"
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Type to get suggestions e.g., Jaundice"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currentMedications"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                 <MedicalTermInput
                  id="currentMedications"
                  label="Current Medications (Optional)"
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Type to get suggestions e.g., Amoxicillin"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="insuranceDetails"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Insurance Details (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Insurer Name, Policy ID, Coverage notes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="patientFiles"
            render={({ field: { onChange, value, ...rest } }) => ( // 'value' is part of field, keep it for controlled component if needed, but we mostly care about onChange
              <FormItem className="md:col-span-2">
                <FormLabel>Patient Files (Optional, e.g., birth certificate, previous records)</FormLabel>
                <FormControl>
                  <Input type="file" {...rest} onChange={(e) => onChange(e.target.files)} multiple />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting || !currentUser}>
          <Save className="mr-2 h-5 w-5" /> {form.formState.isSubmitting ? "Registering..." : "Register Patient"}
        </Button>
      </form>
    </Form>
  );
}
