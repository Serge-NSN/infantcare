
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, ShieldQuestion } from 'lucide-react';

const faqs = [
  {
    question: "How do I sign up as a new user?",
    answer: "Navigate to the 'Sign Up' page from the main menu. Fill in the required information, including your role (Caregiver, Specialist, or Medical Doctor), career information, full name, address (e.g., '123 Nlongkak Street, Yaoundé'), hospital affiliation, email, and create a password. Once submitted, your account will be created (simulated functionality)."
  },
  {
    question: "How do I register a new patient (Caregiver)?",
    answer: "Once logged in as a Caregiver, navigate to your dashboard. You will find a 'New Patient Registration' form there. Fill in all patient information such as registration date and time, hospital information, patient demographics, medical history. You can also upload relevant patient files."
  },
  {
    question: "How do doctors access patient lists and request tests?",
    answer: "Doctors, after logging in, will be directed to their portal. Here, they can view a list of their assigned patients. Clicking on a patient will display detailed information. From the patient detail view or a dedicated section, doctors can request various tests like lab tests, screening tests, images, and charts for the selected patient."
  },
  {
    question: "How does the Specialist Portal work?",
    answer: "Specialists logging into their portal can view consultation requests sent by doctors. These requests will include patient case details. Specialists can review the information and provide their feedback or recommendations directly through the portal or by using the 'Email Doctor' feature."
  },
  {
    question: "How does the AI-assisted auto-complete feature work?",
    answer: "When filling out fields like 'Medical History' or 'Current Medications' in forms (e.g., Patient Registration), as you type, our AI system will suggest likely medical terms based on established terminologies. This helps ensure accuracy and efficiency."
  },
  {
    question: "How to use the 'Send Email' button?",
    answer: "The 'Send Email' button, found in doctor and specialist portals, will redirect you to your default email client (like Gmail). It will attempt to pre-fill the recipient's email address and a subject line based on the context, making it easier to initiate communication."
  }
];

export default function HelpPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline">Help & FAQ</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <ShieldQuestion className="w-7 h-7" />Frequently Asked Questions
          </CardTitle>
          <CardDescription className="font-body">
            Find answers to common questions about using InfantCare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full font-body">
            {faqs.map((faq, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

       <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="font-body">
          <p>
            If you can't find the answer to your question in our FAQ, please don't hesitate to
            contact our support team. You can reach us via the <a href="/contact" className="text-primary hover:underline">Contact Page</a>.
          </p>
          <p className="mt-2">
            We are here to help you get the most out of InfantCare.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
