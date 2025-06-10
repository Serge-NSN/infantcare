
// src/lib/utils/generatePatientPdf.ts
import jsPDF from 'jspdf';
import type { Timestamp } from 'firebase/firestore';

// Interfaces matching those used in patient detail pages
interface PatientData {
  id: string;
  patientName: string;
  patientId: string;
  hospitalId: string;
  patientAge: string;
  patientGender: string;
  patientAddress: string;
  patientPhoneNumber: string;
  // patientReligion?: string; // Removed
  hospitalName: string;
  previousDiseases?: string;
  currentMedications?: string;
  // insuranceDetails?: string; // Removed
  uploadedFileNames?: string[];
  registrationDateTime: Timestamp;
  feedbackStatus: string;
  caregiverUid: string;
  caregiverName?: string;
}

interface FeedbackItem {
  id: string;
  feedbackNotes: string;
  doctorId: string;
  doctorName?: string;
  createdAt: Timestamp;
}

interface TestRequestItem {
  id: string;
  patientId: string;
  testName: string;
  reason: string;
  status: 'Pending' | 'Fulfilled' | 'Reviewed by Doctor';
  requestingDoctorId: string;
  requestingDoctorName?: string;
  requestedAt: Timestamp;
  fulfilledAt?: Timestamp;
  resultNotes?: string;
  resultFileNames?: string[]; // URLs of images uploaded by caregiver
  doctorNotes?: string;
}

interface UserGeneratingReport {
    displayName?: string | null;
    email?: string | null;
}

const MARGIN = 15;
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const DEFAULT_LINE_HEIGHT = 7; // mm
const FONT_SIZE_NORMAL = 11;
const FONT_SIZE_SMALL = 9;
const FONT_SIZE_LARGE = 16;
const FONT_SIZE_XLARGE = 20;

async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText} for URL ${imageUrl}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching or converting image:', error, imageUrl);
    return null;
  }
}


export async function generatePatientPdf(
  patient: PatientData,
  feedbacks: FeedbackItem[],
  testRequests: TestRequestItem[],
  generatedBy: UserGeneratingReport
): Promise<void> {
  const doc = new jsPDF();
  let yPosition = MARGIN;

  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      yPosition = MARGIN;
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(`Rapport Patient: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
      doc.line(MARGIN, MARGIN / 2 + 2, PAGE_WIDTH - MARGIN, MARGIN / 2 + 2);
      yPosition = MARGIN + 5; 
      doc.setTextColor(0);
    }
  };
  
  const addSectionTitle = (title: string) => {
    checkPageBreak(DEFAULT_LINE_HEIGHT * 2);
    doc.setFontSize(FONT_SIZE_LARGE);
    doc.setFont('helvetica', 'bold');
    doc.text(title, MARGIN, yPosition);
    yPosition += DEFAULT_LINE_HEIGHT * 1.5;
    doc.setFont('helvetica', 'normal');
  };

  const addDetailItem = (label: string, value?: string | null) => {
    if (!value) return;
    checkPageBreak(DEFAULT_LINE_HEIGHT);
    doc.setFontSize(FONT_SIZE_NORMAL);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGIN, yPosition);
    doc.setFont('helvetica', 'normal');
    const textLines = doc.splitTextToSize(value, CONTENT_WIDTH - 30); 
    doc.text(textLines, MARGIN + 35, yPosition); // Increased indent for value
    yPosition += textLines.length * (DEFAULT_LINE_HEIGHT * 0.7);
  };
  
  const addWrappedText = (text: string, indent = 0, options: { fontSize?: number, fontStyle?: string } = {}) => {
    if (!text) return;
    const { fontSize = FONT_SIZE_NORMAL, fontStyle = 'normal' } = options;
    checkPageBreak(DEFAULT_LINE_HEIGHT); 
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent);
    lines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(DEFAULT_LINE_HEIGHT * 0.7);
        doc.text(line, MARGIN + indent, yPosition);
        if (index < lines.length - 1) yPosition += DEFAULT_LINE_HEIGHT * 0.7;
    });
    yPosition += DEFAULT_LINE_HEIGHT * 0.7;
  };

  doc.setFontSize(FONT_SIZE_XLARGE);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Médical du Patient', PAGE_WIDTH / 2, yPosition, { align: 'center' });
  yPosition += DEFAULT_LINE_HEIGHT * 2;
  
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(100);
  doc.text(`Généré le: ${new Date().toLocaleString('fr-CM')}`, MARGIN, yPosition);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;
  doc.text(`Généré par: ${generatedBy.displayName || generatedBy.email || 'N/A'}`, MARGIN, yPosition);
  yPosition += DEFAULT_LINE_HEIGHT;
  doc.setTextColor(0);

  addSectionTitle('Informations du Patient');
  addDetailItem('Nom Complet', patient.patientName);
  addDetailItem('ID Dossier Patient', patient.patientId);
  addDetailItem('Âge', patient.patientAge);
  addDetailItem('Sexe', patient.patientGender);
  addDetailItem('Adresse', patient.patientAddress);
  addDetailItem('Téléphone (Gardien)', patient.patientPhoneNumber);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  addSectionTitle('Hôpital & Enregistrement');
  addDetailItem('Nom de l\'Hôpital', patient.hospitalName);
  addDetailItem('ID Hôpital', patient.hospitalId);
  addDetailItem('Enregistré le', patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleString('fr-CM') : 'N/A');
  addDetailItem('Enregistré par (Soignant)', patient.caregiverName);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  addSectionTitle('Antécédents Médicaux');
  addDetailItem('Maladies Antérieures', patient.previousDiseases);
  addDetailItem('Médicaments Actuels', patient.currentMedications);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  if (patient.uploadedFileNames && patient.uploadedFileNames.length > 0) {
    addSectionTitle('Fichiers/Images Médicaux Téléchargés (Soignant)');
    for (const imageUrl of patient.uploadedFileNames) {
      if (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
        checkPageBreak(80); 
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(150);
        const fileName = imageUrl.startsWith('data:') ? 'Image Incorporée' : imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || 'Fichier Image';
        doc.text(`Fichier: ${fileName}`, MARGIN, yPosition);
        yPosition += DEFAULT_LINE_HEIGHT * 0.6;
        doc.setTextColor(0);

        const base64Image = imageUrl.startsWith('data:image') ? imageUrl : await fetchImageAsBase64(imageUrl);
        if (base64Image) {
          try {
            const imgProps = doc.getImageProperties(base64Image);
            const imgWidth = CONTENT_WIDTH * 0.75; 
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            if (yPosition + imgHeight > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                yPosition = MARGIN;
                doc.setFontSize(FONT_SIZE_SMALL);
                doc.setTextColor(100);
                doc.text(`Rapport Patient: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
                doc.line(MARGIN, MARGIN / 2 + 2, PAGE_WIDTH - MARGIN, MARGIN / 2 + 2);
                yPosition = MARGIN + 5;
                doc.setTextColor(0);
            }
            doc.addImage(base64Image, imgProps.fileType, MARGIN + (CONTENT_WIDTH * 0.125), yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + DEFAULT_LINE_HEIGHT * 0.5; 
          } catch (e) {
            console.error("Error adding image to PDF:", e);
            addWrappedText(`Erreur d'affichage de l'image: ${fileName}`, 5, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
          }
        } else {
            addWrappedText(`Impossible de charger l'image: ${fileName}`, 5, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
        }
         yPosition += DEFAULT_LINE_HEIGHT * 0.5;
      }
    }
  }
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  if (feedbacks.length > 0) {
    addSectionTitle('Historique des Feedbacks du Médecin');
    feedbacks.forEach(fb => {
      checkPageBreak(DEFAULT_LINE_HEIGHT * 3); 
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(
        `Dr. ${fb.doctorName || 'N/A'} le ${fb.createdAt?.toDate ? new Date(fb.createdAt.toDate()).toLocaleString('fr-CM') : 'N/A'}`,
        MARGIN, yPosition
      );
      yPosition += DEFAULT_LINE_HEIGHT * 0.7;
      doc.setTextColor(0);
      addWrappedText(fb.feedbackNotes, 5);
      yPosition += DEFAULT_LINE_HEIGHT * 0.3;
    });
  }
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  if (testRequests.length > 0) {
    addSectionTitle('Historique des Demandes de Test');
    for (const tr of testRequests) { 
      checkPageBreak(DEFAULT_LINE_HEIGHT * 4); 
      doc.setFontSize(FONT_SIZE_NORMAL);
      doc.setFont('helvetica', 'bold');
      doc.text(`Test: ${tr.testName} (Statut: ${tr.status})`, MARGIN, yPosition);
      yPosition += DEFAULT_LINE_HEIGHT * 0.7;
      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(
        `Demandé par Dr. ${tr.requestingDoctorName || 'N/A'} le ${tr.requestedAt?.toDate ? new Date(tr.requestedAt.toDate()).toLocaleDateString('fr-CM') : 'N/A'}`,
        MARGIN + 5, yPosition
      );
      yPosition += DEFAULT_LINE_HEIGHT * 0.6;
      doc.setTextColor(0);

      addWrappedText(`Raison: ${tr.reason}`, 10, { fontSize: FONT_SIZE_NORMAL });

      if (tr.status === 'Fulfilled' || tr.status === 'Reviewed by Doctor') {
        if (tr.resultNotes) addWrappedText(`Notes du Soignant: ${tr.resultNotes}`, 10, { fontSize: FONT_SIZE_NORMAL });
        if (tr.fulfilledAt?.toDate) {
            addWrappedText(`Réalisé le: ${new Date(tr.fulfilledAt.toDate()).toLocaleDateString('fr-CM')}`, 10, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
        }

        if (tr.resultFileNames && tr.resultFileNames.length > 0) {
          addWrappedText('Fichiers de Résultats Téléchargés:', 10, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold' });
          for (const imageUrl of tr.resultFileNames) { 
             if (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
                checkPageBreak(70); 
                const fileName = imageUrl.startsWith('data:') ? 'Image de Résultat Incorporée' : imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || 'Image de Résultat';
                addWrappedText(`Fichier: ${fileName}`, 15, { fontSize: FONT_SIZE_SMALL });

                const base64Image = imageUrl.startsWith('data:image') ? imageUrl : await fetchImageAsBase64(imageUrl); 
                if (base64Image) {
                  try {
                    const imgProps = doc.getImageProperties(base64Image);
                    const imgWidth = CONTENT_WIDTH * 0.6; 
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                    
                    if (yPosition + imgHeight > PAGE_HEIGHT - MARGIN) {
                        doc.addPage();
                        yPosition = MARGIN;
                        doc.setFontSize(FONT_SIZE_SMALL);
                        doc.setTextColor(100);
                        doc.text(`Rapport Patient: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
                        doc.line(MARGIN, MARGIN / 2 + 2, PAGE_WIDTH - MARGIN, MARGIN / 2 + 2);
                        yPosition = MARGIN + 5;
                        doc.setTextColor(0);
                    }
                    doc.addImage(base64Image, imgProps.fileType, MARGIN + 15 + (CONTENT_WIDTH * 0.05), yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + DEFAULT_LINE_HEIGHT * 0.3;
                  } catch (e) {
                    addWrappedText(`Erreur d'affichage de l'image de résultat: ${fileName}`, 20, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
                  }
                } else {
                   addWrappedText(`Impossible de charger l'image de résultat: ${fileName}`, 20, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
                }
             }
          }
        }
      }
      if (tr.status === 'Reviewed by Doctor' && tr.doctorNotes) {
        addWrappedText(`Examen des Résultats par le Médecin: ${tr.doctorNotes}`, 10, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bolditalic' });
      }
      yPosition += DEFAULT_LINE_HEIGHT * 0.5;
    }
  }

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(150);
  const finalPageNum = doc.getNumberOfPages();
  doc.setPage(finalPageNum); 
  doc.text(`Fin du Rapport. Nombre total de pages: ${finalPageNum}`, MARGIN, PAGE_HEIGHT - (MARGIN / 2));

  doc.save(`Rapport_Patient_${patient.patientName.replace(/\s+/g, '_')}_${patient.patientId}.pdf`);
}
