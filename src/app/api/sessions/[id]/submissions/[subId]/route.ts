import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

// PATCH - Teacher picks up a submission
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
): Promise<NextResponse> {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id: sessionId, subId: submissionId } = await params;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized" },
        { status: 500 }
      );
    }

    const { selectedByTeacher } = await request.json();

    if (typeof selectedByTeacher !== "boolean") {
      return NextResponse.json(
        { error: "selectedByTeacher must be a boolean" },
        { status: 400 }
      );
    }

    // Check if submission exists
    const submissionRef = adminDb.doc(`sessions/${sessionId}/submissions/${submissionId}`);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Update the submission
    await submissionRef.update({
      selectedByTeacher,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

// GET - Get individual submission details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
): Promise<NextResponse> {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin", "student"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id: sessionId, subId: submissionId } = await params;
  const { role } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized" },
        { status: 500 }
      );
    }

    // Get submission
    const submissionDoc = await adminDb
      .doc(`sessions/${sessionId}/submissions/${submissionId}`)
      .get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const data = submissionDoc.data();
    if (!data) {
      return NextResponse.json(
        { error: "Invalid submission data" },
        { status: 400 }
      );
    }

    const submission = {
      id: submissionDoc.id,
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

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}