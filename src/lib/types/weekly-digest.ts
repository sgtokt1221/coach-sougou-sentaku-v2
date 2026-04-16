export interface DigestWeakness {
  area: string;
  count: number;
  level: "critical" | "warning" | "new";
  sources: ("essay" | "interview" | "skill_check" | "interview_skill_check" | "both")[];
  lastOccurred: string;
}

export interface DigestImprovement {
  area: string;
  status: "resolved" | "improving";
  previousCount: number;
}

export interface DigestNextAction {
  suggestion: string;
  reason: string;
  target: "essay" | "interview" | "skill_check";
  href: string;
}

export interface CoachComment {
  id: string;
  type: string;
  targetLabel: string;
  message: string;
  createdByName: string;
  createdAt: string;
  read: boolean;
}

export interface WeeklyDigest {
  periodStart: string;
  periodEnd: string;
  essayCount: number;
  interviewCount: number;
  essayAvgScore: number | null;
  essayScoreChange: number;
  interviewAvgScore: number | null;
  interviewScoreChange: number;
  topWeaknesses: DigestWeakness[];
  improvements: DigestImprovement[];
  nextAction: DigestNextAction;
  coachComments: CoachComment[];
  overallMessage: string;
}
