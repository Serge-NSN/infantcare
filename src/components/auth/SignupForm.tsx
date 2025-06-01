
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
import { Stethoscope } from "lucide-react";
import { auth } from "@/lib/firebase"; // Import Firebase auth instance
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

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
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues,
  });

  async function onSubmit(data: SignupFormValues) {
    try {
      // For now, we are only creating the user in Firebase Auth.
      // Storing role, career, etc., in Firestore would be a next step.
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      console.log("User created:", userCredential.user);
      toast({
        title: "Signup Successful",
        description: "Your account has been created. Please log in.",
      });
      // TODO: In a future step, store data.role, data.career, etc., in Firestore user profile
      form.reset();
      router.push("/login"); // Redirect to login page after successful signup
    } catch (error: any) {
      console.error("Error signing up:", error);
      let errorMessage = "Failed to sign up. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
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
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
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
