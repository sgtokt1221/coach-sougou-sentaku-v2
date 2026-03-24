export type InvitationStatus = "pending" | "used" | "expired";

export interface Invitation {
  code: string;
  role: "admin";
  status: InvitationStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  usedEmail?: string;
}
