import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ShieldPlus, Brain, Utensils, Stethoscope, Users } from 'lucide-react';

export default function EducationPage() {
  const topics = [
    { title: "Developmental Milestones in Infants", icon: <Brain className="w-5 h-5 mr-2 text-primary" /> },
    { title: "Common Infant Illnesses and Treatments", icon: <ShieldPlus className="w-5 h-5 mr-2 text-primary" /> },
    { title: "Nutritional Guidelines for Infants", icon: <Utensils className="w-5 h-5 mr-2 text-primary" /> },
    { title: "Best Practices in Neonatal Care", icon: <Stethoscope className="w-5 h-5 mr-2 text-primary" /> },
    { title: "Understanding Pediatric Test Results", icon: <Users className="w-5 h-5 mr-2 text-primary" /> },
    { title: "Communication Strategies for Medical Teams", icon: <Users className="w-5 h-5 mr-2 text-primary" /> },
  ];

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline text-foreground">Educational Resources</h1>
      </div>
      
      <Card className="shadow-xl rounded-xl bg-card">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-foreground">Learn More About Infant Care</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 font-body">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Welcome to the InfantCare Educational Resources section. Here, we aim to provide valuable information
            and resources for caregivers, medical doctors, and specialists involved in infant healthcare.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Our goal is to empower you with knowledge to enhance the quality of care provided to infants.
            This section will be updated regularly with articles, guidelines, and links to reputable sources.
          </p>
          
          <div className="pt-6">
            <h3 className="font-headline text-2xl text-foreground mb-4">Topics Covered (Coming Soon):</h3>
            <ul className="space-y-3">
              {topics.map((topic, index) => (
                <li key={index} className="flex items-center p-3 bg-secondary/50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  {topic.icon}
                  <span className="text-foreground text-base">{topic.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="pt-8 text-lg text-muted-foreground leading-relaxed">
            Please check back soon for updates. We are committed to building a comprehensive knowledge base
            to support your vital work in infant health.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
