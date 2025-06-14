// src/app/loading.tsx
import { Loader2, Stethoscope } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-primary p-4">
      <div className="flex flex-col items-center space-y-4">
        <Stethoscope className="h-16 w-16 text-primary animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-xl font-semibold text-foreground">Loading InfantCare...</p>
        <p className="text-sm text-muted-foreground">Please wait a moment.</p>
      </div>
    </div>
  );
}
