import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// POST - Vote for a submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
): Promise<NextResponse> {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id: sessionId, subId: submissionId } = await params;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized" },
        { status: 500 }
      );
    }

    // Check if submission exists
    const submissionDoc = await adminDb
      .doc(`sessions/${sessionId}/submissions/${submissionId}`)
      .get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const submissionData = submissionDoc.data();
    if (!submissionData) {
      return NextResponse.json(
        { error: "Invalid submission data" },
        { status: 400 }
      );
    }

    // Check if user is the author of this submission
    if (submissionData.userId === uid) {
      return NextResponse.json(
        { error: "You cannot vote for your own submission" },
        { status: 400 }
      );
    }

    // Check if user has already voted in this session
    const allSubmissionsSnapshot = await adminDb
      .collection(`sessions/${sessionId}/submissions`)
      .get();

    let hasAlreadyVoted = false;
    for (const doc of allSubmissionsSnapshot.docs) {
      const voteDoc = await adminDb
        .doc(`sessions/${sessionId}/submissions/${doc.id}/votes/${uid}`)
        .get();
      if (voteDoc.exists) {
        hasAlreadyVoted = true;
        break;
      }
    }

    if (hasAlreadyVoted) {
      return NextResponse.json(
        { error: "You have already voted in this session" },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await adminDb.runTransaction(async (transaction) => {
      const submissionRef = adminDb!.doc(`sessions/${sessionId}/submissions/${submissionId}`);
      const voteRef = adminDb!.doc(`sessions/${sessionId}/submissions/${submissionId}/votes/${uid}`);

      // Get current submission data
      const currentSubmissionDoc = await transaction.get(submissionRef);
      if (!currentSubmissionDoc.exists) {
        throw new Error("Submission no longer exists");
      }

      // Check if vote already exists (double-check in transaction)
      const existingVoteDoc = await transaction.get(voteRef);
      if (existingVoteDoc.exists) {
        throw new Error("Vote already exists");
      }

      // Create vote document
      transaction.set(voteRef, {
        oderId: uid,
        submissionId,
        createdAt: new Date().toISOString(),
      });

      // Increment vote count
      transaction.update(submissionRef, {
        voteCount: FieldValue.increment(1),
      });

      // Return new vote count
      const currentData = currentSubmissionDoc.data();
      return (currentData?.voteCount || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      voteCount: result,
    });
  } catch (error) {
    console.error("Error creating vote:", error);

    // Handle specific transaction errors
    if (error instanceof Error) {
      if (error.message === "Vote already exists") {
        return NextResponse.json(
          { error: "You have already voted for this submission" },
          { status: 400 }
        );
      }
      if (error.message === "Submission no longer exists") {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create vote" },
      { status: 500 }
    );
  }
}