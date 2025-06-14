
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, ShieldQuestion } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    question: "How do I sign up as a new user?",
    answer: "Navigate to the 'Sign Up' page from the main menu. Fill in the required information, including your role (Caregiver, Specialist, or Medical Doctor), career information, full name, address (e.g., '123 Nlongkak Street, Yaoundé'), hospital affiliation, email, and create a password. Once submitted, your account will be created."
  },
  {
    question: "How do I register a new patient (Caregiver)?",
    answer: "Once logged in as a Caregiver, navigate to your dashboard. You will find an 'Add New Patient' button or link. Click it to access the patient registration form. Fill in all patient information such as hospital details, patient demographics, and medical history. You can also upload relevant patient files like previous medical reports, lab results, or ECGs."
  },
  {
    question: "How do doctors access patient lists and request tests?",
    answer: "Doctors, after logging in, will be directed to their portal. Here, they can view a list of patients, especially those 'Requiring Action'. Clicking on a patient will display detailed information including medical history, uploaded files, and previous feedback. From the patient detail view, doctors can request various tests (e.g., lab tests, imaging) and request specialist consultations if needed."
  },
  {
    question: "How does the Specialist Portal work?",
    answer: "Specialists logging into their portal can view consultation requests sent by doctors. These requests will include patient case details and the doctor's specific query. Specialists can review the information and provide their expert feedback or recommendations directly through the portal. This feedback is then sent back to the requesting doctor."
  },
  {
    question: "How does the AI-assisted auto-complete feature work?",
    answer: "When filling out fields like 'Previous Diseases' or 'Current Medications' in forms (e.g., Patient Registration), as you type, our AI system may suggest likely medical terms based on established terminologies. This helps ensure accuracy and efficiency. (This feature is illustrative and relies on AI model capabilities)."
  },
  {
    question: "How to use the 'Send Email' or 'Email Doctor/Caregiver' buttons?",
    answer: "Buttons like 'Email Doctor' or 'Request Info from Caregiver', found in various portals, will attempt to open your default email client (like Gmail or Outlook). They will pre-fill the recipient's email address (if available in the system) and a subject line relevant to the context, making it easier for you to initiate communication."
  },
  {
    question: "Where can I find patient reports?",
    answer: "Caregivers, Doctors, and Admins can download a comprehensive PDF report for a patient from the patient's detailed view page. Look for a 'Download Report' button."
  }
];

export default function HelpPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline text-foreground">Help & FAQ</h1>
      </div>

      <Card className="shadow-xl rounded-xl bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2 text-foreground">
            <ShieldQuestion className="w-7 h-7 text-primary" />Frequently Asked Questions
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            Find answers to common questions about using InfantCare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full font-body">
            {faqs.map((faq, index) => (
              <AccordionItem value={`item-${index}`} key={index} className="border-b-border/70">
                <AccordionTrigger className="text-left font-semibold text-lg text-foreground hover:text-primary hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

       <Card className="mt-12 shadow-xl rounded-xl bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-foreground">Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="font-body">
          <p className="text-lg text-muted-foreground leading-relaxed">
            If you can't find the answer to your question in our FAQ, please don't hesitate to
            contact our support team. You can reach us via the <Link href="/contact" className="text-primary hover:underline font-semibold">Contact Page</Link>.
          </p>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            We are here to help you get the most out of InfantCare.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
