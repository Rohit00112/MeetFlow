export type MeetingRelation = "HOST" | "INVITED";

export type MeetingRecurrence = "none" | "daily" | "weekly" | "monthly";

export interface MeetingAttendeeSummary {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    image: string | null;
  } | null;
}

export interface MeetingSummary {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  meetingCode: string;
  passcode: string | null;
  isRecurring: boolean;
  recurrence: MeetingRecurrence;
  relation: MeetingRelation;
  attendeeCount: number;
  host: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    image: string | null;
  };
}

export interface MeetingDetail extends MeetingSummary {
  attendees: MeetingAttendeeSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingPayload {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  passcode?: string;
  attendees: string[];
  recurrence: MeetingRecurrence;
}
