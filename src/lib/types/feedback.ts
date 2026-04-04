export type FeedbackType = 'essay' | 'weakness' | 'document' | 'activity' | 'general';

export interface AdminFeedback {
  id: string;
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  message: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  read: boolean;
}

export interface FeedbackCreateRequest {
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  message: string;
}
