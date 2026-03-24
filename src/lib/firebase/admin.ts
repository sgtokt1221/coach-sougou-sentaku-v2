import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    return initializeApp({
      credential: cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, "\n"),
        clientEmail,
      }),
    });
  }

  // fallback: ADC or emulator
  return initializeApp({ projectId });
}

const adminApp = getAdminApp();
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;

export async function verifyAuthToken(
  request: Request
): Promise<{ uid: string; role: string } | null> {
  if (!adminAuth || !adminDb) return null;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.doc(`users/${decoded.uid}`).get();
    const role = userDoc.data()?.role ?? "student";
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}
