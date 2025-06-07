
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
  patientReligion?: string;
  hospitalName: string;
  previousDiseases?: string;
  currentMedications?: string;
  insuranceDetails?: string;
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
    // Note: For Cloudinary, ensure the URL is directly fetchable or use a proxy/serverless function
    // if CORS issues arise with direct client-side fetch.
    // For testing, if you face CORS issues, you can temporarily use a CORS proxy,
    // but for production, configure Cloudinary correctly or fetch via your backend.
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
      // Add header/footer to new page if desired
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(`Patient Report: ${patient.patientName} (ID: ${patient.patientId}) - Page ${doc.getNumberOfPages()}`, MARGIN, MARGIN / 2);
      doc.line(MARGIN, MARGIN / 2 + 2, PAGE_WIDTH - MARGIN, MARGIN / 2 + 2);
      yPosition = MARGIN + 5; // Reset yPosition after header
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
    const textLines = doc.splitTextToSize(value, CONTENT_WIDTH - 30); // 30 for label width
    doc.text(textLines, MARGIN + 30, yPosition);
    yPosition += textLines.length * (DEFAULT_LINE_HEIGHT * 0.7);
  };
  
  const addWrappedText = (text: string, indent = 0, options: { fontSize?: number, fontStyle?: string } = {}) => {
    if (!text) return;
    const { fontSize = FONT_SIZE_NORMAL, fontStyle = 'normal' } = options;
    checkPageBreak(DEFAULT_LINE_HEIGHT); // Estimate one line
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


  // PDF Header
  doc.setFontSize(FONT_SIZE_XLARGE);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Medical Report', PAGE_WIDTH / 2, yPosition, { align: 'center' });
  yPosition += DEFAULT_LINE_HEIGHT * 2;
  
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, MARGIN, yPosition);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;
  doc.text(`Generated by: ${generatedBy.displayName || generatedBy.email || 'N/A'}`, MARGIN, yPosition);
  yPosition += DEFAULT_LINE_HEIGHT;
  doc.setTextColor(0);


  // Patient Details
  addSectionTitle('Patient Information');
  addDetailItem('Full Name', patient.patientName);
  addDetailItem('Patient Record ID', patient.patientId);
  addDetailItem('Age', patient.patientAge);
  addDetailItem('Gender', patient.patientGender);
  addDetailItem('Address', patient.patientAddress);
  addDetailItem('Guardian Phone', patient.patientPhoneNumber);
  addDetailItem('Religion', patient.patientReligion);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  // Hospital & Registration Details
  addSectionTitle('Hospital & Registration');
  addDetailItem('Hospital Name', patient.hospitalName);
  addDetailItem('Hospital ID', patient.hospitalId);
  addDetailItem('Registered On', patient.registrationDateTime?.toDate ? new Date(patient.registrationDateTime.toDate()).toLocaleString() : 'N/A');
  addDetailItem('Registered By (Caregiver)', patient.caregiverName);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  // Medical Information
  addSectionTitle('Medical History');
  addDetailItem('Previous Diseases', patient.previousDiseases);
  addDetailItem('Current Medications', patient.currentMedications);
  addDetailItem('Insurance Details', patient.insuranceDetails);
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  // Uploaded Files (Images)
  if (patient.uploadedFileNames && patient.uploadedFileNames.length > 0) {
    addSectionTitle('Uploaded Medical Files/Images');
    for (const imageUrl of patient.uploadedFileNames) {
      if (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
        checkPageBreak(80); // Reserve space for image + caption
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
            const imgWidth = CONTENT_WIDTH * 0.75; // Use 75% of content width
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            if (yPosition + imgHeight > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                yPosition = MARGIN;
            }
            doc.addImage(base64Image, imgProps.fileType, MARGIN + (CONTENT_WIDTH * 0.125), yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + DEFAULT_LINE_HEIGHT * 0.5; // Space after image
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
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  // Feedback History
  if (feedbacks.length > 0) {
    addSectionTitle('Doctor Feedback History');
    feedbacks.forEach(fb => {
      checkPageBreak(DEFAULT_LINE_HEIGHT * 3); // Estimate for feedback block
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(
        `Dr. ${fb.doctorName || 'N/A'} on ${fb.createdAt?.toDate ? new Date(fb.createdAt.toDate()).toLocaleString() : 'N/A'}`,
        MARGIN, yPosition
      );
      yPosition += DEFAULT_LINE_HEIGHT * 0.7;
      doc.setTextColor(0);
      addWrappedText(fb.feedbackNotes, 5);
      yPosition += DEFAULT_LINE_HEIGHT * 0.3;
    });
  }
  yPosition += DEFAULT_LINE_HEIGHT * 0.5;

  // Test Requests
  if (testRequests.length > 0) {
    addSectionTitle('Test Request History');
    testRequests.forEach(tr => {
      checkPageBreak(DEFAULT_LINE_HEIGHT * 4); // Estimate for test request block
      doc.setFontSize(FONT_SIZE_NORMAL);
      doc.setFont('helvetica', 'bold');
      doc.text(`Test: ${tr.testName} (Status: ${tr.status})`, MARGIN, yPosition);
      yPosition += DEFAULT_LINE_HEIGHT * 0.7;
      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(100);
      doc.text(
        `Requested by Dr. ${tr.requestingDoctorName || 'N/A'} on ${tr.requestedAt?.toDate ? new Date(tr.requestedAt.toDate()).toLocaleDateString() : 'N/A'}`,
        MARGIN + 5, yPosition
      );
      yPosition += DEFAULT_LINE_HEIGHT * 0.6;
      doc.setTextColor(0);

      addWrappedText(`Reason: ${tr.reason}`, 10, { fontSize: FONT_SIZE_NORMAL });

      if (tr.status === 'Fulfilled' || tr.status === 'Reviewed by Doctor') {
        if (tr.resultNotes) addWrappedText(`Caregiver Notes: ${tr.resultNotes}`, 10, { fontSize: FONT_SIZE_NORMAL });
        if (tr.fulfilledAt?.toDate) {
            addWrappedText(`Fulfilled on: ${new Date(tr.fulfilledAt.toDate()).toLocaleDateString()}`, 10, { fontSize: FONT_SIZE_SMALL, fontStyle: 'italic' });
        }

        if (tr.resultFileNames && tr.resultFileNames.length > 0) {
          addWrappedText('Uploaded Result Files:', 10, { fontSize: FONT_SIZE_NORMAL, fontStyle: 'bold' });
          for (const imageUrl of tr.resultFileNames) {
             if (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
                checkPageBreak(70); // Reserve space for image
                const fileName = imageUrl.startsWith('data:') ? 'Embedded Result Image' : imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || 'Result Image';
                addWrappedText(`File: ${fileName}`, 15, { fontSize: FONT_SIZE_SMALL });

                const base64Image = imageUrl.startsWith('data:image') ? imageUrl : await fetchImageAsBase64(imageUrl);
                if (base64Image) {
                  try {
                    const imgProps = doc.getImageProperties(base64Image);
                    const imgWidth = CONTENT_WIDTH * 0.6; // Smaller for test results
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                    
                    if (yPosition + imgHeight > PAGE_HEIGHT - MARGIN) {
                        doc.addPage();
                        yPosition = MARGIN;
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
    });
  }

  // Footer for the last page
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setTextColor(150);
  const finalPageNum = doc.getNumberOfPages();
  doc.setPage(finalPageNum); // Go to the last page to add footer
  doc.text(`End of Report. Total Pages: ${finalPageNum}`, MARGIN, PAGE_HEIGHT - (MARGIN / 2));


  doc.save(`Patient_Report_${patient.patientName.replace(/\s+/g, '_')}_${patient.patientId}.pdf`);
}
