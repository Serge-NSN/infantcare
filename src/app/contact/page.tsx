
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
        <h1 className="text-4xl font-headline text-foreground">Contact Us</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-foreground">Get in Touch</CardTitle>
            <CardDescription className="font-body text-muted-foreground">
              We would love to hear from you. Please fill out the form below or use our contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4 font-body">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <Input id="name" placeholder="Your Full Name" className="bg-input"/>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">Email Address</label>
                <Input type="email" id="email" placeholder="you@example.com" className="bg-input"/>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-1">Subject</label>
                <Input id="subject" placeholder="Regarding..." className="bg-input"/>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">Message</label>
                <Textarea id="message" placeholder="Your message..." rows={5} className="bg-input"/>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-md py-3 text-base">Send Message</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-foreground">Our Contact Information</CardTitle>
            <CardDescription className="font-body text-muted-foreground">
              Reach out to us directly through the following channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 font-body">
            <div className="flex items-start gap-4">
              <Mail className="h-7 w-7 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground text-lg">Email</h3>
                <p className="text-muted-foreground">support@infantcare.com</p>
                <p className="text-muted-foreground">info@infantcare.com</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="h-7 w-7 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground text-lg">Phone</h3>
                <p className="text-muted-foreground">+237 222 00 00 00 (Support)</p>
                <p className="text-muted-foreground">+237 699 00 00 00 (General Info)</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="h-7 w-7 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground text-lg">Office Address</h3>
                <p className="text-muted-foreground">123 Health Avenue, Bonanjo</p>
                <p className="text-muted-foreground">Douala, Littoral Region</p>
                <p className="text-muted-foreground">Cameroon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
