
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
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { auth, db } from "@/lib/firebase"; // Import Firebase auth and db instances
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";


const loginFormSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const defaultValues: Partial<LoginFormValues> = {
  email: "",
  password: "",
};

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  // const { setCurrentUser } = useAuth(); // We might not need to manually set currentUser here if AuthContext handles it
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues,
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log("User signed in:", user);

      // Fetch user role from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData.role;
        // Manually trigger re-check in AuthContext if needed, or rely on onAuthStateChanged
        // For now, AuthContext should update automatically.

        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.fullName || user.email}!`,
        });

        // Role-based redirection
        switch (role) {
          case "Caregiver":
            router.push("/dashboard/caregiver");
            break;
          case "Medical Doctor":
            router.push("/dashboard/doctor");
            break;
          case "Specialist":
            router.push("/dashboard/specialist");
            break;
          default:
            console.warn("Unknown user role:", role);
            router.push("/"); // Fallback to homepage
        }
      } else {
        console.error("User document not found in Firestore for UID:", user.uid);
        toast({
          title: "Login Failed",
          description: "User profile not found. Please contact support.",
          variant: "destructive",
        });
         // Optionally, sign out the user if their Firestore profile is missing
        // await auth.signOut();
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      let errorMessage = "Failed to log in. Please check your credentials.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      }
      toast({
        title: "Login Failed",
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
          {form.formState.isSubmitting ? "Logging in..." : <><LogIn className="mr-2 h-5 w-5" /> Log In</>}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </Form>
  );
}
