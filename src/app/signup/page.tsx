import { SignupForm } from '@/components/auth/SignupForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl rounded-xl border">
        <CardHeader className="text-center space-y-2 pt-8">
           <div className="flex justify-center text-primary">
            <UserPlus className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl font-headline text-foreground">Create an Account</CardTitle>
          <CardDescription className="font-body text-muted-foreground text-base">
            Join InfantCare to streamline infant healthcare.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  );
}
