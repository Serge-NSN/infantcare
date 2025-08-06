
// src/app/profile/page.tsx
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserCog, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardLink } from '@/lib/utils/getDashboardLink';
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  career: z.string().min(2, "Career must be at least 2 characters."),
  address: z.string().min(5, "Address must be at least 5 characters."),
  phoneNumber: z.string().min(9, "Valid phone number is required.").optional(),
  hospital: z.string().min(2, "Hospital name must be at least 2 characters."),
  specialty: z.string().optional(),
  currentPassword: z.string().optional(), // For email change re-authentication
  role: z.string().optional(),
}).refine(data => {
    if (data.role === 'Specialist') {
      return !!data.specialty;
    }
    return true;
}, {
    message: "Specialty is required for specialists.",
    path: ["specialty"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const specialties = [
  "Neurologist",
  "Cardiologist",
  "Ophthalmologist",
  "Hematologist",
  "Pulmonologist",
  "Otolaryngologist"
];


export default function ProfilePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userData, setUserData] = useState<ProfileFormValues | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isEmailChange, setIsEmailChange] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting }, watch } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      career: '',
      address: '',
      phoneNumber: '',
      hospital: '',
      specialty: '',
      currentPassword: '',
      role: '',
    }
  });

  const watchedEmail = watch("email");
  const watchedRole = watch("role");


  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    async function fetchUserData() {
      if (currentUser) {
        setLoadingData(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const dbData = userDocSnap.data();
            const initialValues: ProfileFormValues = {
              fullName: dbData.fullName || '',
              email: currentUser.email || '', // Firebase Auth email is source of truth initially
              career: dbData.career || '',
              address: dbData.address || '',
              phoneNumber: dbData.phoneNumber || '',
              hospital: dbData.hospital || '',
              specialty: dbData.specialty || '',
              currentPassword: '',
              role: dbData.role || '',
            };
            setUserData(initialValues);
            reset(initialValues); // Set form default values
          } else {
            toast({ title: "Error", description: "User profile not found.", variant: "destructive" });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
        } finally {
          setLoadingData(false);
        }
      }
    }
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser, reset, toast]);

  useEffect(() => {
    if (currentUser && userData && watchedEmail !== currentUser.email) {
      setIsEmailChange(true);
    } else {
      setIsEmailChange(false);
    }
  }, [watchedEmail, currentUser, userData]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) return;

    try {
      // Update Firestore document
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        fullName: data.fullName,
        career: data.career,
        address: data.address,
        phoneNumber: data.phoneNumber,
        hospital: data.hospital,
        specialty: data.role === 'Specialist' ? data.specialty : null,
      });

      // Update Firebase Auth profile (display name)
      if (currentUser.displayName !== data.fullName) {
        await updateProfile(currentUser, { displayName: data.fullName });
      }
      
      // Handle email change (requires re-authentication)
      if (data.email !== currentUser.email) {
        if (!data.currentPassword) {
          toast({ title: "Password Required", description: "Please enter your current password to change your email address.", variant: "destructive" });
          return;
        }
        const credential = EmailAuthProvider.credential(currentUser.email!, data.currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updateEmail(currentUser, data.email);
        // Update email in Firestore user doc as well
        await updateDoc(userDocRef, { email: data.email });
         if (typeof window !== 'undefined') {
            localStorage.setItem('userEmail', data.email);
        }
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('userFullName', data.fullName);
      }

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      // Update form values, ensuring 'role' is preserved if it was part of the initial load
      const updatedFormValues = { ...data, role: userData?.role || data.role };
      reset(updatedFormValues); 
      setUserData(prev => ({ ...prev, ...updatedFormValues })); // Update local state as well

    } catch (error: any) {
      console.error("Error updating profile:", error);
      let desc = "Failed to update profile. Please try again.";
      if (error.code === 'auth/requires-recent-login') {
        desc = "This action requires recent login. Please log out and log back in to update sensitive information.";
      } else if (error.code === 'auth/wrong-password') {
        desc = "Incorrect current password for email change.";
      } else if (error.code === 'auth/email-already-in-use') {
        desc = "The new email address is already in use by another account.";
      }
      toast({ title: "Update Failed", description: desc, variant: "destructive" });
    }
  };
  
  if (authLoading || loadingData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentUser || !userData) {
     return ( // Fallback if user data couldn't be loaded but auth check passed
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Loading profile or user not found. Redirecting...</p>
      </div>
     );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href={getDashboardLink(userData.role || '')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <UserCog className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">Modify Your Profile</h1>
      </div>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Your Information</CardTitle>
          <CardDescription>Update your personal and professional details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              name="fullName"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" {...field} />
                  {errors.fullName && <FormMessage>{errors.fullName.message}</FormMessage>}
                </FormItem>
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...field} />
                  {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
                </FormItem>
              )}
            />
            {isEmailChange && (
              <Controller
                name="currentPassword"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="currentPassword">Current Password (to change email)</Label>
                    <Input id="currentPassword" type="password" {...field} placeholder="Enter current password" />
                    {errors.currentPassword && <FormMessage>{errors.currentPassword.message}</FormMessage>}
                    <p className="text-xs text-muted-foreground mt-1">Required if changing your email address.</p>
                  </FormItem>
                )}
              />
            )}
             {watchedRole === 'Specialist' && (
                <Controller
                    name="specialty"
                    control={control}
                    render={({ field }) => (
                    <FormItem>
                        <Label>Specialty</Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select your specialty" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {specialties.map(spec => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        {errors.specialty && <FormMessage>{errors.specialty.message}</FormMessage>}
                    </FormItem>
                    )}
                />
            )}
            <Controller
              name="career"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="career">Career/Specialization</Label>
                  <Input id="career" {...field} />
                  {errors.career && <FormMessage>{errors.career.message}</FormMessage>}
                </FormItem>
              )}
            />
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...field} />
                  {errors.address && <FormMessage>{errors.address.message}</FormMessage>}
                </FormItem>
              )}
            />
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" type="tel" {...field} />
                  {errors.phoneNumber && <FormMessage>{errors.phoneNumber.message}</FormMessage>}
                </FormItem>
              )}
            />
            <Controller
              name="hospital"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="hospital">Hospital/Affiliation</Label>
                  <Input id="hospital" {...field} />
                  {errors.hospital && <FormMessage>{errors.hospital.message}</FormMessage>}
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
              <Save className="mr-2 h-5 w-5" /> {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper components for react-hook-form integration with ShadCN (if not already global)
const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-1.5", className)} {...props} />
));
FormItem.displayName = "FormItem";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm font-medium text-destructive", className)} {...props}>
    {children}
  </p>
));
FormMessage.displayName = "FormMessage";
