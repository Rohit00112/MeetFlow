import { randomUUID } from "crypto";
import { AccessToken } from "livekit-server-sdk";
import type { MeetingRelation } from "@/lib/types/meetings";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function createParticipantIdentity(userId: string, meetingCode: string) {
  const suffix = randomUUID().slice(0, 8);
  return `${meetingCode}-${userId}-${suffix}`;
}

export function getLiveKitBrowserUrl() {
  return getRequiredEnv("NEXT_PUBLIC_LIVEKIT_URL");
}

export async function createMeetingJoinToken({
  meetingCode,
  meetingId,
  relation,
  user,
}: {
  meetingCode: string;
  meetingId: string;
  relation: MeetingRelation;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
  };
}) {
  const apiKey = getRequiredEnv("LIVEKIT_API_KEY");
  const apiSecret = getRequiredEnv("LIVEKIT_API_SECRET");
  const identity = createParticipantIdentity(user.id, meetingCode);
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: user.name,
    ttl: "2h",
    metadata: JSON.stringify({
      meetingId,
      meetingCode,
      relation,
      userId: user.id,
      email: user.email,
      avatar: user.avatar || null,
    }),
    attributes: {
      meetingId,
      meetingCode,
      relation,
      userId: user.id,
    },
  });

  token.addGrant({
    room: meetingCode,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  return {
    token: await token.toJwt(),
    identity,
    roomName: meetingCode,
    serverUrl: getLiveKitBrowserUrl(),
  };
}
