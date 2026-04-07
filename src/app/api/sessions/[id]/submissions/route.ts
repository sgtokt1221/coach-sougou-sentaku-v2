import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { SessionSubmission } from "@/lib/types/session";
import { FieldValue } from "firebase-admin/firestore";

// GET - List submissions for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin", "student"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id: sessionId } = await params;
  const { uid, role } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized" },
        { status: 500 }
      );
    }

    // Fetch submissions ordered by vote count desc
    const submissionsSnapshot = await adminDb
      .collection(`sessions/${sessionId}/submissions`)
      .orderBy("voteCount", "desc")
      .get();

    const submissions: SessionSubmission[] = [];
    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      const submission: SessionSubmission = {
        id: doc.id,
        sessionId: data.sessionId,
        essayId: data.essayId,
        userId: role === "student" ? "" : data.userId, // Anonymize for students
        anonymousLabel: data.anonymousLabel,
        ocrText: data.ocrText,
        topic: data.topic,
        scores: data.scores,
        voteCount: data.voteCount || 0,
        selectedByTeacher: data.selectedByTeacher || false,
        createdAt: data.createdAt,
      };
      submissions.push(submission);
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST - Submit an essay to a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireRole(request, ["student", "admin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id: sessionId } = await params;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized" },
        { status: 500 }
      );
    }

    const { essayId } = await request.json();

    if (!essayId) {
      return NextResponse.json(
        { error: "essayId is required" },
        { status: 400 }
      );
    }

    // Check session exists and get submission deadline
    const sessionDoc = await adminDb.doc(`sessions/${sessionId}`).get();
    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data();
    const submissionDeadline = sessionData?.submissionDeadline;

    // Check deadline if set
    if (submissionDeadline) {
      const deadline = new Date(submissionDeadline);
      const now = new Date();
      if (now > deadline) {
        return NextResponse.json(
          { error: "Submission deadline has passed" },
          { status: 400 }
        );
      }
    }

    // Check if user already submitted
    const existingSubmissionsSnapshot = await adminDb
      .collection(`sessions/${sessionId}/submissions`)
      .where("userId", "==", uid)
      .get();

    if (!existingSubmissionsSnapshot.empty) {
      return NextResponse.json(
        { error: "You have already submitted to this session" },
        { status: 400 }
      );
    }

    // Fetch the essay
    const essayDoc = await adminDb.doc(`users/${uid}/essays/${essayId}`).get();
    if (!essayDoc.exists) {
      return NextResponse.json(
        { error: "Essay not found" },
        { status: 404 }
      );
    }

    const essayData = essayDoc.data();
    if (!essayData) {
      return NextResponse.json(
        { error: "Essay data is invalid" },
        { status: 400 }
      );
    }

    // Count existing submissions to generate anonymous label
    const allSubmissionsSnapshot = await adminDb
      .collection(`sessions/${sessionId}/submissions`)
      .get();
    const count = allSubmissionsSnapshot.size;
    const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const anonymousLabel = `答案${LABELS[count]}`;

    // Create submission document
    const submissionData: Omit<SessionSubmission, "id"> = {
      sessionId,
      essayId,
      userId: uid,
      anonymousLabel,
      ocrText: essayData.ocrText || "",
      topic: essayData.topic,
      scores: essayData.scores ? { total: essayData.scores.total } : undefined,
      voteCount: 0,
      selectedByTeacher: false,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    const submissionRef = await adminDb
      .collection(`sessions/${sessionId}/submissions`)
      .add(submissionData);

    return NextResponse.json({
      success: true,
      submissionId: submissionRef.id,
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}