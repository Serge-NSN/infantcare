import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function EducationPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline">Educational Resources</h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Learn More About Infant Care</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 font-body">
          <p>
            Welcome to the InfantConnect Educational Resources section. Here, we aim to provide valuable information
            and resources for caregivers, medical doctors, and specialists involved in infant healthcare.
          </p>
          <p>
            Our goal is to empower you with knowledge to enhance the quality of care provided to infants.
            This section will be updated regularly with articles, guidelines, and links to reputable sources.
          </p>
          <h3 className="font-semibold font-headline text-xl pt-4">Topics Covered (Coming Soon):</h3>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Developmental Milestones in Infants</li>
            <li>Common Infant Illnesses and Treatments</li>
            <li>Nutritional Guidelines for Infants</li>
            <li>Best Practices in Neonatal Care</li>
            <li>Understanding Pediatric Test Results</li>
            <li>Communication Strategies for Medical Teams</li>
          </ul>
          <p className="pt-4">
            Please check back soon for updates. We are committed to building a comprehensive knowledge base
            to support your vital work in infant health.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
