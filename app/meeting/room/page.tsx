import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import MeetingRoomPlaceholder from "@/components/meetings/MeetingRoomPlaceholder";
import { extractMeetingCode } from "@/lib/meetings";
import { getMeetingRoomRecord, serializeMeetingRoomRecord } from "@/lib/server/meetings";
import { redirect } from "next/navigation";

interface MeetingRoomPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function MeetingRoomPage({ searchParams }: MeetingRoomPageProps) {
  const session = await auth();
  const { code } = await searchParams;
  const callbackUrl = code ? `/meeting/room?code=${encodeURIComponent(code)}` : "/meeting/room";

  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const meetingCode = code ? extractMeetingCode(code) : null;
  const meetingRecord = meetingCode ? await getMeetingRoomRecord(meetingCode) : null;
  const meeting = meetingRecord
    ? serializeMeetingRoomRecord(meetingRecord, {
        id: session.user.id,
        email: session.user.email,
      })
    : null;

  return (
    <>
      <Navbar />
      <MeetingRoomPlaceholder
        meetingCode={meetingCode}
        meeting={meeting}
        viewerName={session.user.name}
      />
    </>
  );
}
