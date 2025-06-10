
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
    required_error: "Veuillez sélectionner un rôle.",
  }),
  career: z.string().min(2, "La carrière doit comporter au moins 2 caractères."),
  fullName: z.string().min(2, "Le nom complet doit comporter au moins 2 caractères."),
  address: z.string().min(5, "L'adresse doit comporter au moins 5 caractères."),
  hospital: z.string().min(2, "Le nom de l'hôpital doit comporter au moins 2 caractères."),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères."),
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
        title: "Compte Créé avec Succès",
        description: "Votre compte a été créé. Veuillez vous connecter.",
      });
      form.reset();
      
      router.push("/login")

    } catch (error: any) {
      console.error("Error signing up (outer catch):", error);
      let errorMessage = "Échec de l'inscription. Veuillez réessayer.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Cette adresse e-mail est déjà utilisée.";
      } else if (error.code === "firestore/permission-denied") {
        errorMessage = "Échec de la sauvegarde des données utilisateur. Veuillez vérifier les règles Firestore."
      } else if (error.message && typeof error.message === 'string' && error.message.toLowerCase().includes("failed to fetch")) {
        errorMessage = "Une erreur réseau s'est produite lors de l'inscription. Veuillez vérifier votre connexion et réessayer.";
      }
      toast({
        title: "Échec de l'Inscription",
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
              <FormLabel>Rôle</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre rôle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Caregiver">Personnel Soignant (Caregiver)</SelectItem>
                  <SelectItem value="Specialist">Spécialiste</SelectItem>
                  <SelectItem value="Medical Doctor">Médecin</SelectItem>
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
              <FormLabel>Carrière/Spécialisation</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Pédiatre, Infirmier Néonatal" {...field} />
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
              <FormLabel>Nom Complet</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dr. Amina Bello" {...field} />
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
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="123 Rue Nlongkak, Yaoundé" {...field} />
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
              <FormLabel>Hôpital/Affiliation</FormLabel>
              <FormControl>
                <Input placeholder="Hôpital Général de Douala" {...field} />
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
                <Input type="email" placeholder="vous@example.com" {...field} />
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
              <FormLabel>Mot de passe</FormLabel>
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
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
          {form.formState.isSubmitting ? "Inscription en cours..." : <><Stethoscope className="mr-2 h-5 w-5" /> S'inscrire</>}
        </Button>
      </form>
    </Form>
  );
}
