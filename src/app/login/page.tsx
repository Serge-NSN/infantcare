import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl rounded-xl border">
        <CardHeader className="text-center space-y-2 pt-8">
           <div className="flex justify-center text-primary">
            <LogIn className="h-12 w-12" />
          </div>
          <CardTitle className="text-3xl font-headline text-foreground">Welcome Back</CardTitle>
          <CardDescription className="font-body text-muted-foreground text-base">
            Log in to access your InfantCare dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
