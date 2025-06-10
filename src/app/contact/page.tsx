
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
        <h1 className="text-4xl font-headline">Contactez-Nous</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Entrer en Contact</CardTitle>
            <CardDescription className="font-body">
              Nous aimerions avoir de vos nouvelles. Veuillez remplir le formulaire ci-dessous ou utiliser nos coordonnées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4 font-body">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">Nom Complet</label>
                <Input id="name" placeholder="Votre Nom Complet" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Adresse E-mail</label>
                <Input type="email" id="email" placeholder="vous@example.com" />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">Sujet</label>
                <Input id="subject" placeholder="Concernant..." />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                <Textarea id="message" placeholder="Votre message..." rows={5} />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Envoyer le Message</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Nos Coordonnées</CardTitle>
            <CardDescription className="font-body">
              Contactez-nous directement via les canaux suivants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 font-body">
            <div className="flex items-start gap-3">
              <Mail className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">E-mail</h3>
                <p className="text-muted-foreground">support@infantcare.cm</p>
                <p className="text-muted-foreground">info@infantcare.cm</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Téléphone</h3>
                <p className="text-muted-foreground">+237 222 XX XX XX (Support)</p>
                <p className="text-muted-foreground">+237 699 XX XX XX (Infos Générales)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Adresse du Bureau</h3>
                <p className="text-muted-foreground">123 Avenue des Soins Infirmiers</p>
                <p className="text-muted-foreground">Quartier Bastos, Yaoundé</p>
                <p className="text-muted-foreground">Cameroun</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
