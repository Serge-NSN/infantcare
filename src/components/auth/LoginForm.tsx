
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
import { LogIn, Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDashboardLink } from "@/lib/utils/getDashboardLink";


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
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues,
  });

  async function onSubmit(data: LoginFormValues) {
    let userJustSignedIn = false;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      userJustSignedIn = true; 
      const user = userCredential.user;
      console.log("User signed in to Firebase Auth:", user);

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData.role;

        // Store role in localStorage for use in other parts of the app (e.g., homepage redirect)
        if (typeof window !== 'undefined') {
          localStorage.setItem('userRole', role);
          localStorage.setItem('userFullName', userData.fullName || user.email || 'User');
          localStorage.setItem('userEmail', user.email || '');
        }
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.fullName || user.email}! Redirecting...`,
        });
        
        router.push(getDashboardLink(role));

      } else {
        console.error("User document not found in Firestore for UID:", user.uid);
        toast({
          title: "Login Failed",
          description: "User profile not found. Please contact support.",
          variant: "destructive",
        });
        if (user) {
          await signOut(auth);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userFullName');
            localStorage.removeItem('userEmail');
          }
          console.log("User signed out due to missing profile document.");
        }
      }
    } catch (error: any) {
      console.error("Error during login process:", error);
      let errorMessage = "Failed to log in. Please check your credentials or profile data.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      } else if (error.code === "unavailable" || error.message?.includes("client is offline")) {
        errorMessage = "Login Failed: Could not connect to the database. Please check your internet connection or try again later.";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });

      if (userJustSignedIn && auth.currentUser) {
        try {
          await signOut(auth);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userFullName');
            localStorage.removeItem('userEmail');
          }
          console.log("User signed out due to an error after initial Firebase Auth success.");
        } catch (signOutError) {
          console.error("Error attempting to sign out after login failure:", signOutError);
        }
      }
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
