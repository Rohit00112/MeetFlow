import { auth } from "@/auth";
import { generateMeetingCode, recurrenceToRule, ruleToRecurrence } from "@/lib/meetings";
import { prisma } from "@/lib/prisma";
import type { MeetingSummary } from "@/lib/types/meetings";
import { meetingPayloadSchema } from "@/lib/validations/meetings";
import { NextRequest, NextResponse } from "next/server";

type MeetingWithRelations = Awaited<ReturnType<typeof prisma.meeting.findFirst>>;

function serializeMeeting(
  meeting: NonNullable<MeetingWithRelations> & {
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

async function generateUniqueMeetingCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const meetingCode = generateMeetingCode();
    const existingMeeting = await prisma.meeting.findUnique({
      where: { meetingLink: meetingCode },
      select: { id: true },
    });

    if (!existingMeeting) {
      return meetingCode;
    }
  }

  throw new Error("Unable to generate a unique meeting code.");
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

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
    ...(Number.isFinite(limit) ? { take: limit } : {}),
  });

  return NextResponse.json({
    meetings: meetings.map((meeting) => serializeMeeting(meeting, session.user.id)),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const meeting = await prisma.meeting.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        meetingLink: await generateUniqueMeetingCode(),
        passcode: parsed.data.passcode,
        isRecurring: parsed.data.recurrence !== "none",
        recurrenceRule: recurrenceToRule(parsed.data.recurrence),
        createdBy: session.user.id,
        attendees: inviteeEmails.length
          ? {
              create: inviteeEmails.map((email) => ({
                email,
                userId: userIdByEmail.get(email),
                name: null,
              })),
            }
          : undefined,
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
    });

    return NextResponse.json(
      { meeting: serializeMeeting(meeting, session.user.id) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "An error occurred while creating the meeting." },
      { status: 500 },
    );
  }
}
