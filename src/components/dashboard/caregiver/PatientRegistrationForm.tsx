
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
import { Save, FileText, Loader2, Wifi, Microscope, Activity, FolderOpen, HeartPulse } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Schema for form validation (values directly edited by user)
const patientRegistrationSchema = z.object({
  hospitalName: z.string().min(2, "Hospital name is required."),
  patientName: z.string().min(2, "Patient name is required."),
  patientAge: z.string().min(1, "Patient age is required (e.g., 3 months, 1 year)."),
  patientGender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required." }),
  patientAddress: z.string().min(5, "Address is required. e.g., Mile 4 Nkwen, Bamenda"),
  patientPhoneNumber: z.string().min(9, "Valid phone number is required (e.g., 6XX XXX XXX)."),
  previousDiseases: z.string().optional().default(""),
  currentMedications: z.string().optional().default(""),
  
  // Vitals
  bloodPressure: z.string().optional(),
  bodyTemperature: z.string().optional(),
  heartRate: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  respiratoryRate: z.string().optional(),
  weight: z.string().optional(),
  skinTone: z.string().optional(),
  colourOfEyes: z.string().optional(),

  // Files
  generalMedicalFiles: z.custom<FileList>().optional(),
  labResultFiles: z.custom<FileList>().optional(),
  ecgResultFiles: z.custom<FileList>().optional(),
  otherMedicalFiles: z.custom<FileList>().optional(),
});

type PatientRegistrationFormValues = z.infer<typeof patientRegistrationSchema>;

export interface PatientDataForForm {
  id: string;
  hospitalName: string;
  hospitalId: string;
  patientName: string;
  patientAge: string;
  patientGender: "Male" | "Female" | "Other";
  patientAddress: string;
  patientPhoneNumber: string;
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
  caregiverName?: string;
}

interface PatientRegistrationFormProps {
  patientToEdit?: PatientDataForForm;
}

const defaultValues: Partial<PatientRegistrationFormValues> = {
  hospitalName: "",
  patientName: "",
  patientAge: "",
  patientAddress: "",
  patientPhoneNumber: "",
  previousDiseases: "",
  currentMedications: "",
  bloodPressure: "",
  bodyTemperature: "",
  heartRate: "",
  oxygenSaturation: "",
  respiratoryRate: "",
  weight: "",
  skinTone: "",
  colourOfEyes: "",
};

export function PatientRegistrationForm({ patientToEdit }: PatientRegistrationFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();
  const isEditMode = !!patientToEdit;
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && patientToEdit) {
      const formData: Partial<PatientRegistrationFormValues> = {
        hospitalName: patientToEdit.hospitalName,
        patientName: patientToEdit.patientName,
        patientAge: patientToEdit.patientAge,
        patientGender: patientToEdit.patientGender,
        patientAddress: patientToEdit.patientAddress,
        patientPhoneNumber: patientToEdit.patientPhoneNumber,
        previousDiseases: patientToEdit.previousDiseases || "",
        currentMedications: patientToEdit.currentMedications || "",
        bloodPressure: patientToEdit.bloodPressure || "",
        bodyTemperature: patientToEdit.bodyTemperature || "",
        heartRate: patientToEdit.heartRate || "",
        oxygenSaturation: patientToEdit.oxygenSaturation || "",
        respiratoryRate: patientToEdit.respiratoryRate || "",
        weight: patientToEdit.weight || "",
        skinTone: patientToEdit.skinTone || "",
        colourOfEyes: patientToEdit.colourOfEyes || "",
      };
      form.reset(formData);
    }
  }, [isEditMode, patientToEdit, form]);

  async function uploadFileToCloudinary(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload ${file.name}`);
      }
      const result = await response.json();
      return result.secure_url;
    } catch (error: any) {
      console.error(`Error uploading ${file.name}:`, error);
      toast({
        title: "File Upload Error",
        description: error.message || `Could not upload file "${file.name}". It will be skipped.`,
        variant: "destructive",
      });
      return null;
    }
  }

  async function processFiles(fileList: FileList | undefined | null): Promise<string[]> {
    const uploadedUrls: string[] = [];
    if (fileList && fileList.length > 0) {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const url = await uploadFileToCloudinary(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }
    }
    return uploadedUrls;
  }


  async function onSubmit(data: PatientRegistrationFormValues) {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const generalMedicalUrls = await processFiles(data.generalMedicalFiles);
    const labResultUrls = await processFiles(data.labResultFiles);
    const ecgResultUrls = await processFiles(data.ecgResultFiles);
    const otherMedicalFileUrls = await processFiles(data.otherMedicalFiles);
    setIsUploading(false);

    try {
      if (isEditMode && patientToEdit) {
        const updatedPatientData = {
          hospitalName: data.hospitalName,
          patientName: data.patientName,
          patientAge: data.patientAge,
          patientGender: data.patientGender,
          patientAddress: data.patientAddress,
          patientPhoneNumber: data.patientPhoneNumber,
          previousDiseases: data.previousDiseases,
          currentMedications: data.currentMedications,
          bloodPressure: data.bloodPressure,
          bodyTemperature: data.bodyTemperature,
          heartRate: data.heartRate,
          oxygenSaturation: data.oxygenSaturation,
          respiratoryRate: data.respiratoryRate,
          weight: data.weight,
          skinTone: data.skinTone,
          colourOfEyes: data.colourOfEyes,
          uploadedFileNames: [...new Set([...(patientToEdit.uploadedFileNames || []), ...generalMedicalUrls])],
          labResultUrls: [...new Set([...(patientToEdit.labResultUrls || []), ...labResultUrls])],
          ecgResultUrls: [...new Set([...(patientToEdit.ecgResultUrls || []), ...ecgResultUrls])],
          otherMedicalFileUrls: [...new Set([...(patientToEdit.otherMedicalFileUrls || []), ...otherMedicalFileUrls])],
          updatedAt: serverTimestamp() as Timestamp,
        };
        
        const patientDocRef = doc(db, "patients", patientToEdit.id);
        await updateDoc(patientDocRef, updatedPatientData);
        toast({
          title: "Patient Updated Successfully",
          description: `${data.patientName}'s information has been updated.`,
        });
        router.push(`/dashboard/caregiver/patient/${patientToEdit.id}`);
      } else {
        const generatedPatientId = `PAT-${uuidv4().substring(0, 8).toUpperCase()}`;
        const hospitalNamePrefix = data.hospitalName.substring(0, 3).toUpperCase();
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const generatedHospitalId = `${hospitalNamePrefix}-${randomDigits}`;
        const caregiverName = currentUser.displayName || (typeof window !== 'undefined' ? localStorage.getItem('userFullName') : null) || currentUser.email?.split('@')[0] || 'Caregiver';

        const patientDataForCreate = {
          hospitalName: data.hospitalName,
          patientName: data.patientName,
          patientAge: data.patientAge,
          patientGender: data.patientGender,
          patientAddress: data.patientAddress,
          patientPhoneNumber: data.patientPhoneNumber,
          previousDiseases: data.previousDiseases,
          currentMedications: data.currentMedications,
          bloodPressure: data.bloodPressure,
          bodyTemperature: data.bodyTemperature,
          heartRate: data.heartRate,
          oxygenSaturation: data.oxygenSaturation,
          respiratoryRate: data.respiratoryRate,
          weight: data.weight,
          skinTone: data.skinTone,
          colourOfEyes: data.colourOfEyes,
          patientId: generatedPatientId,
          hospitalId: generatedHospitalId,
          caregiverUid: currentUser.uid,
          caregiverName: caregiverName,
          registrationDateTime: serverTimestamp(),
          feedbackStatus: 'Pending Doctor Review',
          createdAt: serverTimestamp(),
          uploadedFileNames: generalMedicalUrls,
          labResultUrls: labResultUrls,
          ecgResultUrls: ecgResultUrls,
          otherMedicalFileUrls: otherMedicalFileUrls,
        };
        
        const newPatientRef = await addDoc(collection(db, "patients"), patientDataForCreate);
        toast({
          title: "Patient Registration Successful",
          description: `${data.patientName} (ID: ${generatedPatientId}) has been registered. Hospital ID: ${generatedHospitalId}`,
        });
        form.reset(defaultValues); 
        form.setValue('generalMedicalFiles', undefined);
        form.setValue('labResultFiles', undefined);
        form.setValue('ecgResultFiles', undefined);
        form.setValue('otherMedicalFiles', undefined);
        router.push(`/dashboard/caregiver/patient/${newPatientRef.id}`);
      }
    } catch (error: any) {
      console.error("Error processing patient form:", error);
      let errorMessage = isEditMode ? "Failed to update patient information." : "Failed to register patient.";
      if (error.code === "firestore/permission-denied") {
        errorMessage += " Permission denied. Please check Firestore rules.";
      } else if (error.message?.includes("Unsupported field value")) {
         errorMessage += " An invalid data field was provided.";
      } else if (error.code === "unavailable" || error.message?.includes("client is offline")) {
        errorMessage += " Database offline. Check connection.";
      }
      toast({
        title: isEditMode ? "Update Failed" : "Registration Failed",
        description: errorMessage + " Please try again.",
        variant: "destructive",
      });
    }
  }
  
  const renderExistingFiles = (fileUrls: string[] | undefined, categoryName: string) => {
    if (!fileUrls || fileUrls.length === 0) return null;
    return (
      <div className="md:col-span-2 space-y-1 mt-1">
        <p className="text-sm font-medium text-muted-foreground">Current {categoryName}:</p>
        <ul className="list-disc list-inside text-xs text-muted-foreground p-2 border rounded-md bg-secondary/30">
          {fileUrls.map((fileUrl, index) => {
            let displayName = `File ${index + 1}`;
            try {
              const url = new URL(fileUrl);
              const pathSegments = url.pathname.split('/');
              displayName = decodeURIComponent(pathSegments[pathSegments.length - 1] || `File ${index + 1}`);
            } catch (e) { /* Use default displayName */ }
            return (
              <li key={index} className="flex items-center">
                <FileText className="h-3 w-3 mr-1.5 shrink-0" />
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs sm:max-w-sm md:max-w-md">{displayName}</a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

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
                  <Input placeholder="General Hospital" {...field} />
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
                <FormLabel>Patient's Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Suh Albert" {...field} />
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
                <FormLabel>Patient's Age</FormLabel>
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
                  <Input placeholder="Mile 4 Nkwen, Bamenda" {...field} />
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
                  <Input type="tel" placeholder="e.g., 6XX XXX XXX" {...field} />
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
                  placeholder="Type for suggestions, e.g., Malaria, Neonatal jaundice"
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
                  placeholder="Type for suggestions, e.g., Pediatric paracetamol"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6 pt-4 border-t">
          <h3 className="text-lg font-medium text-primary flex items-center"><HeartPulse className="mr-2 h-5 w-5"/> Record Vitals</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="bloodPressure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Pressure (BP)</FormLabel>
                    <FormControl><Input placeholder="e.g., 80/45 mmHg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bodyTemperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Temperature (BT)</FormLabel>
                    <FormControl><Input placeholder="e.g., 37.5 °C" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heartRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heart Rate (HR)</FormLabel>
                    <FormControl><Input placeholder="e.g., 140 bpm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="oxygenSaturation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oxygen Saturation (SPO2)</FormLabel>
                    <FormControl><Input placeholder="e.g., 98%" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="respiratoryRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Respiratory Rate (RR)</FormLabel>
                    <FormControl><Input placeholder="e.g., 45 breaths/min" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (Wt)</FormLabel>
                    <FormControl><Input placeholder="e.g., 7.5 kg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="skinTone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skin Tone</FormLabel>
                    <FormControl><Input placeholder="e.g., Normal, Pale, Jaundiced" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="colourOfEyes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colour of Eyes</FormLabel>
                    <FormControl><Input placeholder="e.g., White, Yellowish" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
           </div>
        </div>

        <div className="space-y-6 pt-4 border-t">
            <h3 className="text-lg font-medium text-primary flex items-center"><FolderOpen className="mr-2 h-5 w-5"/> Upload Medical Files (Optional)</h3>
            
            <FormField
                control={form.control}
                name="generalMedicalFiles"
                render={({ field: { onChange, value, ...rest } }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>General Medical Images/Files (e.g., X-rays, photos)</FormLabel>
                    <FormControl>
                    <Input
                        type="file"
                        {...rest}
                        onChange={(e) => onChange(e.target.files)}
                        multiple
                        accept="image/*,application/pdf,.doc,.docx"
                    />
                    </FormControl>
                    <FormMessage />
                    {isEditMode && renderExistingFiles(patientToEdit?.uploadedFileNames, "General Medical Images/Files")}
                    <p className="text-xs text-muted-foreground">Images, PDFs, Word documents. You can select multiple files.</p>
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="labResultFiles"
                render={({ field: { onChange, value, ...rest } }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center"><Microscope className="mr-2 h-4 w-4 text-primary"/>Lab Results</FormLabel>
                    <FormControl>
                    <Input
                        type="file"
                        {...rest}
                        onChange={(e) => onChange(e.target.files)}
                        multiple
                        accept="image/*,application/pdf"
                    />
                    </FormControl>
                    <FormMessage />
                    {isEditMode && renderExistingFiles(patientToEdit?.labResultUrls, "Lab Results")}
                     <p className="text-xs text-muted-foreground">Images or PDF files. You can select multiple files.</p>
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="ecgResultFiles"
                render={({ field: { onChange, value, ...rest } }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center"><Activity className="mr-2 h-4 w-4 text-primary"/>ECG Results</FormLabel>
                    <FormControl>
                    <Input
                        type="file"
                        {...rest}
                        onChange={(e) => onChange(e.target.files)}
                        multiple
                        accept="image/*,application/pdf"
                    />
                    </FormControl>
                    <FormMessage />
                    {isEditMode && renderExistingFiles(patientToEdit?.ecgResultUrls, "ECG Results")}
                    <p className="text-xs text-muted-foreground">Images or PDF files. You can select multiple files.</p>
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="otherMedicalFiles"
                render={({ field: { onChange, value, ...rest } }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary"/>Other Medical Files</FormLabel>
                    <FormControl>
                    <Input
                        type="file"
                        {...rest}
                        onChange={(e) => onChange(e.target.files)}
                        multiple
                        accept="image/*,application/pdf,.doc,.docx,.txt"
                    />
                    </FormControl>
                    <FormMessage />
                    {isEditMode && renderExistingFiles(patientToEdit?.otherMedicalFileUrls, "Other Medical Files")}
                    <p className="text-xs text-muted-foreground">Any other relevant medical documents. You can select multiple files.</p>
                </FormItem>
                )}
            />
        </div>


        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <Button
            type="submit"
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={form.formState.isSubmitting || isUploading || !currentUser}
          >
            {isUploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {isUploading ? "Uploading files..." : (form.formState.isSubmitting ? (isEditMode ? "Saving..." : "Registering...") : (isEditMode ? "Save Changes" : "Register Patient"))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
