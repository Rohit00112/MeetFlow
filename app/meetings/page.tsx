import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import MeetingsPageClient from "@/components/meetings/MeetingsPageClient";
import { ruleToRecurrence } from "@/lib/meetings";
import { prisma } from "@/lib/prisma";
import type { MeetingSummary } from "@/lib/types/meetings";
import { redirect } from "next/navigation";

interface MeetingsPageProps {
  searchParams: Promise<{
    compose?: string;
  }>;
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/login?callbackUrl=/meetings");
  }

  const { compose } = await searchParams;
  const composeMode = compose === "instant" || compose === "calendar" ? compose : "later";

  const meetings = await prisma.meeting.findMany({
    where: {
      OR: [
        { createdBy: session.user.id },
        {
          attendees: {
            some: {
              OR: [{ userId: session.user.id }, { email: session.user.email.toLowerCase() }],
            },
          },
        },
      ],
    },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          image: true,
        },
      },
      attendees: {
        select: { id: true },
      },
    },
    orderBy: [{ startTime: "asc" }, { createdAt: "desc" }],
  });

  const initialMeetings: MeetingSummary[] = meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    startTime: meeting.startTime.toISOString(),
    endTime: meeting.endTime.toISOString(),
    meetingCode: meeting.meetingLink,
    passcode: meeting.passcode,
    isRecurring: meeting.isRecurring,
    recurrence: ruleToRecurrence(meeting.recurrenceRule),
    relation: meeting.createdBy === session.user.id ? "HOST" : "INVITED",
    attendeeCount: meeting.attendees.length,
    host: meeting.host,
  }));

  return (
    <>
      <Navbar />
      <MeetingsPageClient composeMode={composeMode} initialMeetings={initialMeetings} />
    </>
  );
}
