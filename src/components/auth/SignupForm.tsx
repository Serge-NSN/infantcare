
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

const signupFormSchema = z.object({
  role: z.enum(["Caregiver", "Specialist", "Medical Doctor"], {
    required_error: "Please select a role.",
  }),
  career: z.string().min(2, "Career must be at least 2 characters."),
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  address: z.string().min(5, "Address must be at least 5 characters."),
  hospital: z.string().min(2, "Hospital name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

const defaultValues: Partial<SignupFormValues> = {
  role: undefined,
  career: "",
  fullName: "",
  address: "",
  hospital: "",
  email: "",
  password: "",
};

export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues,
  });

  async function onSubmit(data: SignupFormValues) {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log("User created in Auth:", user);

      // Store additional user information in Firestore "users" collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: data.email,
        role: data.role,
        fullName: data.fullName,
        career: data.career,
        address: data.address,
        hospital: data.hospital,
        createdAt: Timestamp.now(), // Use Firestore Timestamp
      });
      console.log("User data stored in Firestore");

      // Sign the user out immediately after successful registration and profile creation
      await signOut(auth);
      console.log("User signed out after registration.");

      toast({
        title: "Account Created Successfully",
        description: "Your account has been created. Please log in.",
      });
      form.reset();
      
      // Navigate to the login page
      router.push("/login");

    } catch (error: any) {
      console.error("Error signing up (outer catch):", error);
      let errorMessage = "Failed to sign up. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
      } else if (error.code === "firestore/permission-denied") {
        errorMessage = "Failed to save user data. Please check Firestore rules."
      } else if (error.message && typeof error.message === 'string' && error.message.toLowerCase().includes("failed to fetch")) {
        // If a Firebase operation itself failed with "Failed to fetch"
        errorMessage = "A network error occurred during signup. Please check your connection and try again.";
      }
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Caregiver">Caregiver</SelectItem>
                  <SelectItem value="Specialist">Specialist</SelectItem>
                  <SelectItem value="Medical Doctor">Medical Doctor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="career"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Career/Specialization</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Pediatrician, Neonatal Nurse" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Dr. Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, Anytown, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hospital"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hospital/Affiliation</FormLabel>
              <FormControl>
                <Input placeholder="City General Hospital" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    {...field}
                    className="pr-10"
                  />
                </FormControl>
                <div
                  className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowPassword(!showPassword); }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing up..." : <><Stethoscope className="mr-2 h-5 w-5" /> Sign Up</>}
        </Button>
      </form>
    </Form>
  );
}
