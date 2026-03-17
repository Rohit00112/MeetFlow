import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import MeetingPrejoinClient from "@/components/meetings/MeetingPrejoinClient";
import { extractMeetingCode } from "@/lib/meetings";
import { getMeetingRoomRecord, serializeMeetingRoomRecord } from "@/lib/server/meetings";
import { redirect } from "next/navigation";

interface MeetingPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

const MeetingPage = async ({ searchParams }: MeetingPageProps) => {
  const session = await auth();
  const { code } = await searchParams;
  const callbackUrl = code ? `/meeting?code=${encodeURIComponent(code)}` : "/meeting";

  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const meetingCode = code ? extractMeetingCode(code) : null;
  const meetingRecord = meetingCode
    ? await getMeetingRoomRecord(meetingCode, {
        id: session.user.id,
        email: session.user.email,
      })
    : null;
  const meeting = meetingRecord
    ? serializeMeetingRoomRecord(meetingRecord, {
        id: session.user.id,
        email: session.user.email,
      })
    : null;

  return (
    <>
      <Navbar />
      <MeetingPrejoinClient
        meetingCode={meetingCode}
        meeting={meeting}
        viewerName={session.user.name}
      />
    </>
  );
};

export default MeetingPage;
