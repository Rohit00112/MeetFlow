import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import MeetingDetailClient from "@/components/meetings/MeetingDetailClient";
import { ruleToRecurrence } from "@/lib/meetings";
import { prisma } from "@/lib/prisma";
import type { MeetingDetail } from "@/lib/types/meetings";
import { notFound, redirect } from "next/navigation";

interface MeetingDetailPageProps {
  params: Promise<{
    meetingId: string;
  }>;
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    const { meetingId } = await params;
    redirect(`/auth/login?callbackUrl=/meetings/${meetingId}`);
  }

  const { meetingId } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
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
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!meeting) {
    notFound();
  }

  const initialMeeting: MeetingDetail = {
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
    attendees: meeting.attendees,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };

  return (
    <>
      <Navbar />
      <MeetingDetailClient initialMeeting={initialMeeting} />
    </>
  );
}
