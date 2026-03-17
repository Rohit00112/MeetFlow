import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ruleToRecurrence } from "@/lib/meetings";
import type { MeetingDetail, MeetingRelation } from "@/lib/types/meetings";

const meetingRoomInclude = {
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
} satisfies Prisma.MeetingInclude;

export type MeetingRoomRecord = Prisma.MeetingGetPayload<{
  include: typeof meetingRoomInclude;
}>;

export async function getMeetingRoomRecord(meetingCode: string) {
  return prisma.meeting.findUnique({
    where: { meetingLink: meetingCode },
    include: meetingRoomInclude,
  });
}

export function serializeMeetingRoomRecord(
  meeting: MeetingRoomRecord,
  viewer?: {
    id?: string | null;
    email?: string | null;
  },
): MeetingDetail {
  const isHost = viewer?.id ? meeting.createdBy === viewer.id : false;
  const relation: MeetingRelation = isHost ? "HOST" : "INVITED";

  return {
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    startTime: meeting.startTime.toISOString(),
    endTime: meeting.endTime.toISOString(),
    meetingCode: meeting.meetingLink,
    passcode: meeting.passcode,
    isRecurring: meeting.isRecurring,
    recurrence: ruleToRecurrence(meeting.recurrenceRule),
    relation,
    attendeeCount: meeting.attendees.length,
    host: {
      id: meeting.host.id,
      name: meeting.host.name,
      email: meeting.host.email,
      avatar: meeting.host.avatar,
      image: meeting.host.image,
    },
    attendees: meeting.attendees.map((attendee) => ({
      id: attendee.id,
      email: attendee.email,
      name: attendee.name,
      status: attendee.status,
      user: attendee.user,
    })),
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}
