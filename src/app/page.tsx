import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 text-center overflow-hidden">
      {/* Background Image */}
      <Image
        src="https://images.unsplash.com/photo-1547082722-ebad0c0cb815?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt="Pediatric care background"
        layout="fill"
        objectFit="cover"
        quality={80}
        className="opacity-30 z-0"
        data-ai-hint="healthcare children"
      />

      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/20 z-0"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 text-white">
        <h1 className="text-5xl md:text-7xl font-headline font-bold drop-shadow-md">
          Welcome to InfantCare
        </h1>
        <p className="text-lg md:text-2xl max-w-3xl font-body drop-shadow-sm">
          Bridging the gap in infant healthcare through seamless collaboration and advanced technology.
          Connect with specialists, manage patient data, and provide the best care for our youngest patients.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
            <Link href="/education">Learn More</Link>
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-8 z-10 text-white/70 text-sm font-body">
        Empowering caregivers, doctors, and specialists for a healthier future.
      </div>
    </div>
  );
}
