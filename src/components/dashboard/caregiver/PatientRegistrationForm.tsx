
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
import { Save, FileText } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from 'uuid';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Schema for form validation (values directly edited by user)
const patientRegistrationSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name is required."),
  // hospitalId is now system-generated
  patientName: z.string().min(2, "Patient name is required."),
  patientAge: z.string().min(1, "Patient age is required (e.g., 3 months, 1 year)."),
  patientGender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required." }),
  patientAddress: z.string().min(5, "Address is required."),
  patientPhoneNumber: z.string().min(7, "Valid phone number is required."),
  patientReligion: z.string().optional().default(""),
  previousDiseases: z.string().optional().default(""),
  currentMedications: z.string().optional().default(""),
  insuranceDetails: z.string().optional().default(""),
  patientFiles: z.custom<FileList>().optional(), // For new file uploads
});

type PatientRegistrationFormValues = z.infer<typeof patientRegistrationSchema>;

// Type for the data passed to the form when in edit mode
export interface PatientDataForForm {
  id: string; // Firestore document ID
  hospitalName: string;
  hospitalId: string; // System-generated, displayed but not edited in form
  patientName: string;
  patientAge: string;
  patientGender: "Male" | "Female" | "Other";
  patientAddress: string;
  patientPhoneNumber: string;
  patientReligion?: string;
  previousDiseases?: string;
  currentMedications?: string;
  insuranceDetails?: string;
  uploadedFileNames?: string[]; // Existing files
}

interface PatientRegistrationFormProps {
  patientToEdit?: PatientDataForForm;
}

const defaultValues: Partial<PatientRegistrationFormValues> = {
  hospitalName: "",
  // hospitalId removed
  patientName: "",
  patientAge: "",
  patientAddress: "",
  patientPhoneNumber: "",
  patientReligion: "",
  previousDiseases: "",
  currentMedications: "",
  insuranceDetails: "",
};

export function PatientRegistrationForm({ patientToEdit }: PatientRegistrationFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();
  const isEditMode = !!patientToEdit;

  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && patientToEdit) {
      const formData: Partial<PatientRegistrationFormValues> = {
        hospitalName: patientToEdit.hospitalName,
        // hospitalId is not part of the form values to be edited
        patientName: patientToEdit.patientName,
        patientAge: patientToEdit.patientAge,
        patientGender: patientToEdit.patientGender,
        patientAddress: patientToEdit.patientAddress,
        patientPhoneNumber: patientToEdit.patientPhoneNumber,
        patientReligion: patientToEdit.patientReligion || "",
        previousDiseases: patientToEdit.previousDiseases || "",
        currentMedications: patientToEdit.currentMedications || "",
        insuranceDetails: patientToEdit.insuranceDetails || "",
      };
      form.reset(formData);
    }
  }, [isEditMode, patientToEdit, form]);

  async function onSubmit(data: PatientRegistrationFormValues) {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in.",
        variant: "destructive",
      });
      return;
    }

    const newFileNames: string[] = [];
    if (data.patientFiles && data.patientFiles.length > 0) {
      for (let i = 0; i < data.patientFiles.length; i++) {
        newFileNames.push(data.patientFiles[i].name);
      }
    }

    if (isEditMode && patientToEdit) {
      const updatedPatientData: Omit<Partial<PatientDataForForm>, 'id' | 'hospitalId'> & { updatedAt: Timestamp; uploadedFileNames: string[] } = {
        ...data,
        uploadedFileNames: [...(patientToEdit.uploadedFileNames || []), ...newFileNames],
        updatedAt: serverTimestamp() as Timestamp,
      };
      delete (updatedPatientData as any).patientFiles;

      try {
        const patientDocRef = doc(db, "patients", patientToEdit.id);
        // hospitalId is not updated as it's system-generated and set at creation
        await updateDoc(patientDocRef, updatedPatientData);
        toast({
          title: "Patient Updated Successfully",
          description: `${data.patientName}'s information has been updated.`,
        });
        router.push(`/dashboard/caregiver/patient/${patientToEdit.id}`);
      } catch (error: any) {
        console.error("Error updating patient:", error);
        toast({
          title: "Update Failed",
          description: "Failed to update patient information. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Create new patient
      const generatedPatientId = `PAT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const hospitalNamePrefix = data.hospitalName.substring(0, 3).toUpperCase();
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const generatedHospitalId = `${hospitalNamePrefix}-${randomDigits}`;

      const patientDataForCreate = {
        ...data,
        patientId: generatedPatientId,
        hospitalId: generatedHospitalId, // Add system-generated hospital ID
        caregiverUid: currentUser.uid,
        registrationDateTime: serverTimestamp(),
        feedbackStatus: 'Pending Doctor Review',
        createdAt: serverTimestamp(),
        uploadedFileNames: newFileNames,
      };
      delete (patientDataForCreate as any).patientFiles;

      try {
        const newPatientRef = await addDoc(collection(db, "patients"), patientDataForCreate);
        toast({
          title: "Patient Registration Successful",
          description: `${data.patientName} (ID: ${generatedPatientId}) has been registered. Hospital ID: ${generatedHospitalId}`,
        });
        form.reset(defaultValues);
        // Redirect to the detail page of the newly created patient or back to add-patient
        router.push(`/dashboard/caregiver/patient/${newPatientRef.id}`);
      } catch (error: any) {
        console.error("Error registering patient:", error);
        let errorMessage = "Failed to register patient. Please try again.";
        if (error.code === "firestore/permission-denied") {
          errorMessage = "Permission denied. Please check Firestore rules.";
        } else if (error.message?.includes("Unsupported field value")) {
           errorMessage = "Failed to register patient due to an invalid data field.";
        } else if (error.code === "unavailable" || error.message?.includes("client is offline")) {
          errorMessage = "Failed to register patient: Database offline. Check connection.";
        }
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          {isEditMode && patientToEdit?.hospitalId && (
             <FormItem>
                <FormLabel>Hospital ID (System Generated)</FormLabel>
                <Input value={patientToEdit.hospitalId} readOnly disabled className="bg-muted/50" />
             </FormItem>
          )}

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
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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

          {isEditMode && patientToEdit && patientToEdit.uploadedFileNames && patientToEdit.uploadedFileNames.length > 0 && (
            <div className="md:col-span-2 space-y-2">
              <FormLabel>Currently Uploaded Files</FormLabel>
              <ul className="list-disc list-inside text-sm text-muted-foreground p-2 border rounded-md bg-secondary/30">
                {patientToEdit.uploadedFileNames.map((fileName, index) => (
                  <li key={index} className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 shrink-0" />
                    {fileName}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Upload new image files below to add them to the existing list. Deleting files is not supported in this form.</p>
            </div>
          )}

          <FormField
            control={form.control}
            name="patientFiles"
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{isEditMode ? "Add More Image Files (Optional)" : "Upload Patient Images (Optional)"}</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    {...rest}
                    onChange={(e) => onChange(e.target.files)}
                    multiple
                    accept="image/jpeg, image/png, image/gif, image/webp"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">Only image files (.jpg, .png, .gif, .webp) are accepted. You can select multiple files.</p>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting || !currentUser}>
          <Save className="mr-2 h-5 w-5" /> {form.formState.isSubmitting ? (isEditMode ? "Saving Changes..." : "Registering...") : (isEditMode ? "Save Changes" : "Register Patient")}
        </Button>
      </form>
    </Form>
  );
}
