
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
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues,
  });

  function onSubmit(data: SignupFormValues) {
    // Placeholder for actual signup logic
    console.log(data);
    toast({
      title: "Signup Submitted",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
    form.reset(); // Reset form after submission
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
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Stethoscope className="mr-2 h-5 w-5" /> Sign Up
        </Button>
      </form>
    </Form>
  );
}
