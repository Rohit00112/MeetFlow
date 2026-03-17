import type { MeetingRelation } from "@/lib/types/meetings";

export interface LiveKitJoinTokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  relation: MeetingRelation;
}
