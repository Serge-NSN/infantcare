import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Mail className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline">Contact Us</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Get in Touch</CardTitle>
            <CardDescription className="font-body">
              We&apos;d love to hear from you. Please fill out the form below or use our contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4 font-body">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
                <Input id="name" placeholder="Your Name" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
                <Input type="email" id="email" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
                <Input id="subject" placeholder="Regarding..." />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                <Textarea id="message" placeholder="Your message..." rows={5} />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Send Message</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Our Contact Information</CardTitle>
            <CardDescription className="font-body">
              Reach out to us directly through the following channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 font-body">
            <div className="flex items-start gap-3">
              <Mail className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-muted-foreground">support@infantcare.example.com</p>
                <p className="text-muted-foreground">info@infantcare.example.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Phone</h3>
                <p className="text-muted-foreground">+1 (555) 123-4567 (Support)</p>
                <p className="text-muted-foreground">+1 (555) 765-4321 (General Inquiries)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Office Address</h3>
                <p className="text-muted-foreground">123 Health Tech Avenue</p>
                <p className="text-muted-foreground">Innovation City, MedState, 12345</p>
                <p className="text-muted-foreground">United States</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
