import React from "react";
import { auth } from "@/auth";
import Link from "next/link";
import { extractMeetingCode, formatMeetingSchedule } from "@/lib/meetings";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Icon } from "@iconify/react/dist/iconify.js";

interface MeetingPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

const MeetingPage = async ({ searchParams }: MeetingPageProps) => {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/meeting");
  }

  const { code } = await searchParams;
  const meetingCode = code ? extractMeetingCode(code) : null;
  const meeting = meetingCode
    ? await prisma.meeting.findUnique({
        where: { meetingLink: meetingCode },
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
            },
          },
        },
      })
    : null;

  return (
    <>
      <Navbar />
      <main className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {meeting ? meeting.title : "Your Meeting Room"}
              </h1>
              <p className="mt-2 text-sm text-[#5f6368]">
                {meetingCode
                  ? meeting
                    ? `Meeting code ${meeting.meetingLink}`
                    : `No scheduled meeting found for ${meetingCode}`
                  : "Enter a meeting code from the home page or schedule a meeting first."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                <Icon icon="heroicons:phone-x-mark" className="w-5 h-5" />
                End Meeting
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
              {meeting ? (
                <div className="text-center text-white max-w-[420px] px-6">
                  <Icon icon="heroicons:video-camera" className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-2xl font-medium">{meeting.title}</p>
                  <p className="mt-3 text-sm text-white/80">
                    {formatMeetingSchedule(
                      meeting.startTime.toISOString(),
                      meeting.endTime.toISOString(),
                    )}
                  </p>
                  {meeting.description ? (
                    <p className="mt-4 text-sm leading-6 text-white/75">{meeting.description}</p>
                  ) : null}
                  <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Turn on camera
                  </button>
                </div>
              ) : (
                <div className="text-center text-white max-w-[420px] px-6">
                  <Icon icon="heroicons:video-camera" className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl">
                    {meetingCode ? "Meeting not found" : "No meeting selected"}
                  </p>
                  <p className="mt-3 text-sm text-white/80">
                    {meetingCode
                      ? "Check the meeting code or open the meeting from your dashboard."
                      : "Schedule a meeting from the dashboard or enter a code on the home page."}
                  </p>
                  <Link
                    href="/meetings"
                    className="mt-6 inline-flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Open meetings
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Meeting Info</h2>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Icon icon="heroicons:link" className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">
                      {meetingCode || "Use a meeting code from the scheduler"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon icon="heroicons:clock" className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">
                      {meeting
                        ? formatMeetingSchedule(
                            meeting.startTime.toISOString(),
                            meeting.endTime.toISOString(),
                          )
                        : "No scheduled time loaded"}
                    </span>
                  </p>
                  {meeting?.passcode ? (
                    <p className="flex items-center gap-2">
                      <Icon icon="heroicons:lock-closed" className="w-5 h-5 text-gray-500" />
                      <span className="text-sm">Passcode: {meeting.passcode}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">
                  Participants ({meeting ? meeting.attendees.length + 1 : 1})
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {meeting?.host.name?.charAt(0) || session.user.name?.charAt(0) || 'U'}
                      </div>
                      <span>{meeting?.host.name || session.user.name || 'You'} (Host)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-gray-500 hover:text-gray-700">
                        <Icon icon="heroicons:microphone-slash" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {meeting?.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(attendee.name || attendee.email).charAt(0).toUpperCase()}
                        </div>
                        <span>{attendee.name || attendee.email}</span>
                      </div>
                      <span className="text-xs font-medium uppercase text-gray-500">
                        {attendee.status.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:microphone" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:video-camera" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:computer-desktop" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:chat-bubble-left-right" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors">
              <Icon icon="heroicons:phone-x-mark" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default MeetingPage;
