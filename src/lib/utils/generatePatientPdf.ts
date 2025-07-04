
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
  hospitalName: string;
  previousDiseases?: string;
  currentMedications?: string;
  
  // Vitals
  bloodPressure?: string;
  bodyTemperature?: string;
  heartRate?: string;
  oxygenSaturation?: string;
  respiratoryRate?: string;
  weight?: string;
  skinTone?: string;
  colourOfEyes?: string;

  // Files
  uploadedFileNames?: string[];
  labResultUrls?: string[];
  ecgResultUrls?: string[];
  otherMedicalFileUrls?: string[];

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
  // Use a proxy if necessary to avoid CORS issues, for now direct fetch
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
      doc.text(`Patient Report: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
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
    doc.text(textLines, MARGIN + 45, yPosition); // Increased indent for value
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
  doc.text('Patient Medical Report', PAGE_WIDTH / 2, yPosition, { align: 'center' });
  yPosition += DEFAULT_LINE_HEIGHT * 2;
  
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, MARGIN, yPosition);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;
  doc.text(`Generated by: ${generatedBy.displayName || generatedBy.email || 'N/A'}`, MARGIN, yPosition);
  yPosition += DEFAULT_LINE_HEIGHT;
  doc.setTextColor(0);

  addSectionTitle('Patient Information');
  addDetailItem('Full Name', patient.patientName);
  addDetailItem('Patient Record ID', patient.patientId);
  addDetailItem('Age', patient.patientAge);
  addDetailItem('Gender', patient.patientGender);
  addDetailItem('Address', patient.patientAddress);
  addDetailItem('Guardian Phone', patient.patientPhoneNumber);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  addSectionTitle('Hospital & Registration');
  addDetailItem('Hospital Name', patient.hospitalName);
  addDetailItem('Hospital ID', patient.hospitalId);
  addDetailItem('Registered On', patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleString('en-US') : 'N/A');
  addDetailItem('Registered By (Caregiver)', patient.caregiverName);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  addSectionTitle('Medical History');
  addDetailItem('Previous Diseases', patient.previousDiseases);
  addDetailItem('Current Medications', patient.currentMedications);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  addSectionTitle('Vitals');
  addDetailItem('Blood Pressure (BP)', patient.bloodPressure);
  addDetailItem('Body Temperature (BT)', patient.bodyTemperature);
  addDetailItem('Heart Rate (HR)', patient.heartRate);
  addDetailItem('Oxygen Saturation (SPO2)', patient.oxygenSaturation);
  addDetailItem('Respiratory Rate (RR)', patient.respiratoryRate);
  addDetailItem('Weight (Wt)', patient.weight);
  addDetailItem('Skin Tone', patient.skinTone);
  addDetailItem('Colour of Eyes', patient.colourOfEyes);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  const displayFiles = async (title: string, fileUrls: string[] | undefined) => {
    if (fileUrls && fileUrls.length > 0) {
      addSectionTitle(title);
      for (const imageUrl of fileUrls) {
        if (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
          checkPageBreak(80); 
          doc.setFontSize(FONT_SIZE_SMALL);
          doc.setTextColor(150);
          const fileName = imageUrl.startsWith('data:') ? 'Embedded Image' : imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || 'Image File';
          doc.text(`File: ${fileName}`, MARGIN, yPosition);
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
                  doc.text(`Patient Report: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
                  doc.line(MARGIN, MARGIN / 2 + 2, PAGE_WIDTH - MARGIN, MARGIN / 2 + 2);
                  yPosition = MARGIN + 5;
                  doc.setTextColor(0);
              }
              doc.addImage(base64Image, imgProps.fileType, MARGIN + (CONTENT_WIDTH * 0.125), yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + DEFAULT_LINE_HEIGHT * 0.5; 
            } catch (e) {
              console.error("Error adding image to PDF:", e);
              addWrappedText(`Error displaying image: ${fileName}`, 5, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
            }
          } else {
              addWrappedText(`Could not load image: ${fileName}`, 5, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
          }
           yPosition += DEFAULT_LINE_HEIGHT * 0.5;
        }
      }
    }
  };

  await displayFiles('General Medical Files/Images', patient.uploadedFileNames);
  await displayFiles('Lab Results', patient.labResultUrls);
  await displayFiles('ECG Results', patient.ecgResultUrls);
  await displayFiles('Other Medical Files', patient.otherMedicalFileUrls);

  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  if (feedbacks.length > 0) {
    addSectionTitle('Doctor Feedback History');
    feedbacks.forEach(fb => {
      checkPageBreak(DEFAULT_LINE_HEIGHT * 3); 
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(
        `Dr. ${fb.doctorName || 'N/A'} on ${fb.createdAt?.toDate ? new Date(fb.createdAt.toDate()).toLocaleString('en-US') : 'N/A'}`,
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
    addSectionTitle('Test Request History');
    for (const tr of testRequests) { 
      checkPageBreak(DEFAULT_LINE_HEIGHT * 4); 
      doc.setFontSize(FONT_SIZE_NORMAL);
      doc.setFont('helvetica', 'bold');
      doc.text(`Test: ${tr.testName} (Status: ${tr.status})`, MARGIN, yPosition);
      yPosition += DEFAULT_LINE_HEIGHT * 0.7;
      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(
        `Requested by Dr. ${tr.requestingDoctorName || 'N/A'} on ${tr.requestedAt?.toDate ? new Date(tr.requestedAt.toDate()).toLocaleDateString('en-US') : 'N/A'}`,
        MARGIN + 5, yPosition
      );
      yPosition += DEFAULT_LINE_HEIGHT * 0.6;
      doc.setTextColor(0);

      addWrappedText(`Reason: ${tr.reason}`, 10, { fontSize: FONT_SIZE_NORMAL });

      if (tr.status === 'Fulfilled' || tr.status === 'Reviewed by Doctor') {
        if (tr.resultNotes) addWrappedText(`Caregiver Notes: ${tr.resultNotes}`, 10, { fontSize: FONT_SIZE_NORMAL });
        if (tr.fulfilledAt?.toDate) {
            addWrappedText(`Fulfilled on: ${new Date(tr.fulfilledAt.toDate()).toLocaleDateString('en-US')}`, 10, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
        }

        if (tr.resultFileNames && tr.resultFileNames.length > 0) {
          addWrappedText('Uploaded Result Files:', 10, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold' });
          for (const imageUrl of tr.resultFileNames) { 
             if (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
                checkPageBreak(70); 
                const fileName = imageUrl.startsWith('data:') ? 'Embedded Result Image' : imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || 'Result Image';
                addWrappedText(`File: ${fileName}`, 15, { fontSize: FONT_SIZE_SMALL });

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
                        doc.text(`Patient Report: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
                        doc.line(MARGIN, MARGIN / 2 + 2, PAGE_WIDTH - MARGIN, MARGIN / 2 + 2);
                        yPosition = MARGIN + 5;
                        doc.setTextColor(0);
                    }
                    doc.addImage(base64Image, imgProps.fileType, MARGIN + 15 + (CONTENT_WIDTH * 0.05), yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + DEFAULT_LINE_HEIGHT * 0.3;
                  } catch (e) {
                    addWrappedText(`Error displaying result image: ${fileName}`, 20, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
                  }
                } else {
                   addWrappedText(`Could not load result image: ${fileName}`, 20, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
                }
             }
          }
        }
      }
      if (tr.status === 'Reviewed by Doctor' && tr.doctorNotes) {
        addWrappedText(`Doctor's Review of Results: ${tr.doctorNotes}`, 10, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bolditalic' });
      }
      yPosition += DEFAULT_LINE_HEIGHT * 0.5;
    }
  }

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(150);
  const finalPageNum = doc.getNumberOfPages();
  doc.setPage(finalPageNum); 
  doc.text(`End of Report. Total pages: ${finalPageNum}`, MARGIN, PAGE_HEIGHT - (MARGIN / 2));

  doc.save(`Patient_Report_${patient.patientName.replace(/\s+/g, '_')}_${patient.patientId}.pdf`);
}
