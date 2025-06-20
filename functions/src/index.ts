
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Notification structure (for reference):
// interface Notification {
//   id: string; (auto-generated by Firestore)
//   recipientUid: string;
//   type: 'NEW_FEEDBACK' | 'TEST_REQUESTED' | 'TEST_FULFILLED' | 'SPECIALIST_FEEDBACK';
//   message: string;
//   relatedPatientId?: string;
//   relatedPatientName?: string;
//   relatedDocId?: string; // Could be feedbackId, testRequestId
//   isRead: boolean;
//   createdAt: FirebaseFirestore.Timestamp;
// }

/**
 * Creates a notification document in the 'notifications' collection.
 */
async function createNotification(notificationData: {
  recipientUid: string;
  type: string;
  message: string;
  relatedPatientId?: string;
  relatedPatientName?: string;
  relatedDocId?: string;
}) {
  if (!notificationData.recipientUid) {
    console.warn("No recipientUid provided for notification, skipping.");
    return null;
  }
  try {
    return await db.collection("notifications").add({
      ...notificationData,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating notification:", error, "Data:", notificationData);
    return null;
  }
}

/**
 * Triggered when a new feedback document is created in a patient's
 * 'patientFeedbacks' subcollection.
 * Notifies the caregiver associated with the patient.
 */
export const onNewFeedbackCreated = functions.firestore
  .document("patients/{patientId}/patientFeedbacks/{feedbackId}")
  .onCreate(async (snap, context) => {
    const feedbackData = snap.data();
    const { patientId } = context.params;

    if (!feedbackData) {
      console.log("No feedback data found.");
      return null;
    }

    try {
      const patientDoc = await db.collection("patients").doc(patientId).get();
      if (!patientDoc.exists) {
        console.log(`Patient document ${patientId} not found.`);
        return null;
      }
      const patientData = patientDoc.data();
      if (!patientData || !patientData.caregiverUid) {
        console.log(
          `Caregiver UID not found for patient ${patientId}.`
        );
        return null;
      }

      const doctorName = feedbackData.doctorName || "A doctor";
      const patientName = patientData.patientName || "this patient";

      await createNotification({
        recipientUid: patientData.caregiverUid,
        type: "NEW_FEEDBACK",
        message: `${doctorName} provided feedback for ${patientName}.`,
        relatedPatientId: patientId,
        relatedPatientName: patientData.patientName,
        relatedDocId: context.params.feedbackId,
      });
      console.log(
        `Notification created for caregiver ${patientData.caregiverUid} for new feedback on patient ${patientId}`
      );
      return null;
    } catch (error) {
      console.error("Error in onNewFeedbackCreated:", error);
      return null;
    }
  });

/**
 * Triggered when a new test request document is created in a patient's
 * 'testRequests' subcollection.
 * Notifies the caregiver associated with the patient.
 */
export const onTestRequestedByDoctor = functions.firestore
  .document("patients/{patientId}/testRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const testRequestData = snap.data();
    const { patientId } = context.params;

    if (!testRequestData) {
      console.log("No test request data found.");
      return null;
    }

    try {
      const patientDoc = await db.collection("patients").doc(patientId).get();
      if (!patientDoc.exists) {
        console.log(`Patient document ${patientId} not found.`);
        return null;
      }
      const patientData = patientDoc.data();
      if (!patientData || !patientData.caregiverUid) {
        console.log(
          `Caregiver UID not found for patient ${patientId}.`
        );
        return null;
      }

      const doctorName = testRequestData.requestingDoctorName || "A doctor";
      const testName = testRequestData.testName || "a test";
      const patientName = patientData.patientName || "this patient";

      await createNotification({
        recipientUid: patientData.caregiverUid,
        type: "TEST_REQUESTED",
        message: `${doctorName} requested ${testName} for ${patientName}.`,
        relatedPatientId: patientId,
        relatedPatientName: patientData.patientName,
        relatedDocId: context.params.requestId,
      });
      console.log(
        `Notification created for caregiver ${patientData.caregiverUid} for test request on patient ${patientId}`
      );
      return null;
    } catch (error) {
      console.error("Error in onTestRequestedByDoctor:", error);
      return null;
    }
  });

/**
 * Triggered when a test request document in a patient's
 * 'testRequests' subcollection is updated.
 * Notifies the requesting doctor if the test status changes to 'Fulfilled'.
 */
export const onTestRequestFulfilled = functions.firestore
  .document("patients/{patientId}/testRequests/{requestId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const { patientId } = context.params;

    if (!beforeData || !afterData) {
      console.log("No data found in test request update.");
      return null;
    }

    // Check if status changed to 'Fulfilled'
    if (
      beforeData.status !== "Fulfilled" &&
      afterData.status === "Fulfilled"
    ) {
      if (!afterData.requestingDoctorId) {
        console.log(
          `Requesting doctor UID not found for fulfilled test ${context.params.requestId}.`
        );
        return null;
      }

      try {
        const patientDoc = await db.collection("patients").doc(patientId).get();
        const patientName = patientDoc.exists ?
          patientDoc.data()?.patientName :
          "this patient";
        const testName = afterData.testName || "A test";

        await createNotification({
          recipientUid: afterData.requestingDoctorId,
          type: "TEST_FULFILLED",
          message: `Test results for ${testName} for ${patientName} have been submitted.`,
          relatedPatientId: patientId,
          relatedPatientName: patientName,
          relatedDocId: context.params.requestId,
        });
        console.log(
          `Notification created for doctor ${afterData.requestingDoctorId} for fulfilled test on patient ${patientId}`
        );
        return null;
      } catch (error) {
        console.error("Error in onTestRequestFulfilled:", error);
        return null;
      }
    }
    return null;
  });
