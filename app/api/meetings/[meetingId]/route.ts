import { auth } from "@/auth";
import { ruleToRecurrence, recurrenceToRule } from "@/lib/meetings";
import { prisma } from "@/lib/prisma";
import type { MeetingDetail, MeetingSummary } from "@/lib/types/meetings";
import { meetingPayloadSchema } from "@/lib/validations/meetings";
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    meetingId: string;
  }>;
}

function serializeMeetingSummary(
  meeting: {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    meetingLink: string;
    passcode: string | null;
    isRecurring: boolean;
    recurrenceRule: string | null;
    createdBy: string;
    host: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      image: string | null;
    };
    attendees: { id: string }[];
  },
  currentUserId: string,
): MeetingSummary {
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
    relation: meeting.createdBy === currentUserId ? "HOST" : "INVITED",
    attendeeCount: meeting.attendees.length,
    host: meeting.host,
  };
}

function serializeMeetingDetail(
  meeting: {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    meetingLink: string;
    passcode: string | null;
    isRecurring: boolean;
    recurrenceRule: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    host: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      image: string | null;
    };
    attendees: Array<{
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
    }>;
  },
  currentUserId: string,
): MeetingDetail {
  return {
    ...serializeMeetingSummary(
      {
        ...meeting,
        attendees: meeting.attendees.map((attendee) => ({ id: attendee.id })),
      },
      currentUserId,
    ),
    attendees: meeting.attendees,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await context.params;

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
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  return NextResponse.json({ meeting: serializeMeetingDetail(meeting, session.user.id) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await context.params;

  const existingMeeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      createdBy: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingMeeting) {
    return NextResponse.json(
      { error: "Only the meeting host can update this meeting." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = meetingPayloadSchema.safeParse(body);

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const inviteeEmails = parsed.data.attendees.filter(
      (email) => email !== session.user.email?.toLowerCase(),
    );

    const inviteeUsers = await prisma.user.findMany({
      where: {
        email: {
          in: inviteeEmails,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const userIdByEmail = new Map(inviteeUsers.map((user) => [user.email.toLowerCase(), user.id]));

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        passcode: parsed.data.passcode,
        isRecurring: parsed.data.recurrence !== "none",
        recurrenceRule: recurrenceToRule(parsed.data.recurrence),
        attendees: {
          deleteMany: {},
          create: inviteeEmails.map((email) => ({
            email,
            userId: userIdByEmail.get(email),
            name: null,
          })),
        },
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

    return NextResponse.json({ meeting: serializeMeetingDetail(meeting, session.user.id) });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while updating the meeting." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await context.params;

  const existingMeeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  if (!existingMeeting) {
    return NextResponse.json(
      { error: "Only the meeting host can cancel this meeting." },
      { status: 403 },
    );
  }

  await prisma.meeting.delete({
    where: { id: meetingId },
  });

  return NextResponse.json({ success: true });
}
