export interface Invitation {
  code: string;
  role: "teacher" | "admin";
  status: "pending" | "used" | "expired";
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  usedEmail?: string;
}
