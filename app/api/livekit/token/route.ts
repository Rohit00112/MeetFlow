import { auth } from "@/auth";
import { createMeetingJoinToken } from "@/lib/livekit";
import { getMeetingRoomRecord, serializeMeetingRoomRecord } from "@/lib/server/meetings";
import type { LiveKitJoinTokenResponse } from "@/lib/types/livekit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const tokenRequestSchema = z.object({
  meetingCode: z.string().trim().min(1, { message: "Meeting code is required." }),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email || !session.user.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = tokenRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().formErrors[0] || "Invalid request." },
        { status: 400 },
      );
    }

    const meetingRecord = await getMeetingRoomRecord(parsed.data.meetingCode, {
      id: session.user.id,
      email: session.user.email,
    });

    if (!meetingRecord) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    const meeting = serializeMeetingRoomRecord(meetingRecord, {
      id: session.user.id,
      email: session.user.email,
    });

    const token = await createMeetingJoinToken({
      meetingCode: meeting.meetingCode,
      meetingId: meeting.id,
      relation: meeting.relation,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatar: session.user.avatar,
      },
    });

    const response: LiveKitJoinTokenResponse = {
      token: token.token,
      serverUrl: token.serverUrl,
      roomName: token.roomName,
      participantIdentity: token.identity,
      participantName: session.user.name,
      relation: meeting.relation,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create a LiveKit join token.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
