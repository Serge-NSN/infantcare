
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, ShieldQuestion } from 'lucide-react';

const faqs = [
  {
    question: "Comment puis-je m'inscrire en tant que nouvel utilisateur ?",
    answer: "Accédez à la page 'S'inscrire' depuis le menu principal. Remplissez les informations requises, y compris votre rôle (Personnel Soignant, Spécialiste ou Médecin), informations de carrière, nom complet, adresse (e.g., '123 Rue Nlongkak, Yaoundé'), affiliation hospitalière, e-mail et créez un mot de passe. Une fois soumis, votre compte sera créé (fonctionnalité simulée)."
  },
  {
    question: "Comment puis-je enregistrer un nouveau patient (Personnel Soignant) ?",
    answer: "Une fois connecté en tant que Personnel Soignant, accédez à votre tableau de bord. Vous y trouverez un formulaire 'Enregistrement Nouveau Patient'. Remplissez toutes les informations du patient telles que la date et l'heure d'enregistrement, les informations de l'hôpital, les données démographiques du patient, les antécédents médicaux. Vous pouvez également télécharger les fichiers pertinents du patient."
  },
  {
    question: "Comment les médecins accèdent-ils aux listes de patients et demandent-ils des tests ?",
    answer: "Les médecins, après s'être connectés, seront dirigés vers leur portail. Ici, ils peuvent consulter une liste de leurs patients assignés. Cliquer sur un patient affichera des informations détaillées. Depuis la vue détaillée du patient ou une section dédiée, les médecins peuvent demander divers tests comme des tests de laboratoire, des tests de dépistage, des images et des graphiques pour le patient sélectionné."
  },
  {
    question: "Comment fonctionne le Portail Spécialiste ?",
    answer: "Les spécialistes se connectant à leur portail peuvent consulter les demandes de consultation envoyées par les médecins. Ces demandes incluront les détails du cas du patient. Les spécialistes peuvent examiner les informations et fournir leurs commentaires ou recommandations directement via le portail ou en utilisant la fonctionnalité 'Envoyer un e-mail au médecin'."
  },
  {
    question: "Comment fonctionne la fonction de saisie semi-automatique assistée par IA ?",
    answer: "Lorsque vous remplissez des champs tels que 'Antécédents Médicaux' ou 'Médicaments Actuels' dans les formulaires (par exemple, Enregistrement Patient), au fur et à mesure que vous tapez, notre système d'IA suggérera des termes médicaux probables basés sur des terminologies établies. Cela aide à garantir l'exactitude et l'efficacité."
  },
  {
    question: "Comment utiliser le bouton 'Envoyer un e-mail' ?",
    answer: "Le bouton 'Envoyer un e-mail', présent dans les portails des médecins et des spécialistes, vous redirigera vers votre client de messagerie par défaut (comme Gmail). Il tentera de pré-remplir l'adresse e-mail du destinataire et une ligne d'objet en fonction du contexte, facilitant ainsi l'initiation de la communication."
  }
];

export default function HelpPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline">Aide & FAQ</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <ShieldQuestion className="w-7 h-7" />Questions Fréquemment Posées
          </CardTitle>
          <CardDescription className="font-body">
            Trouvez des réponses aux questions courantes sur l'utilisation d'InfantCare.
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
          <CardTitle className="text-2xl font-headline">Besoin d'Aide Supplémentaire ?</CardTitle>
        </CardHeader>
        <CardContent className="font-body">
          <p>
            Si vous ne trouvez pas la réponse à votre question dans notre FAQ, n'hésitez pas à
            contacter notre équipe de support. Vous pouvez nous joindre via la <a href="/contact" className="text-primary hover:underline">Page de Contact</a>.
          </p>
          <p className="mt-2">
            Nous sommes là pour vous aider à tirer le meilleur parti d'InfantCare.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
