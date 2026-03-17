import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { buildMeetingJoinPath, formatMeetingSchedule } from "@/lib/meetings";
import type { MeetingDetail } from "@/lib/types/meetings";

interface MeetingRoomPlaceholderProps {
  meetingCode: string | null;
  meeting: MeetingDetail | null;
  viewerName?: string | null;
}

export default function MeetingRoomPlaceholder({
  meetingCode,
  meeting,
  viewerName,
}: MeetingRoomPlaceholderProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="rounded-[28px] border border-[#eef0f1] bg-white p-6 shadow-[0_18px_50px_rgba(32,33,36,0.12)]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#202124]">
              {meeting ? meeting.title : "Your Meeting Room"}
            </h1>
            <p className="mt-2 text-sm text-[#5f6368]">
              {meetingCode
                ? meeting
                  ? `Meeting code ${meeting.meetingCode}`
                  : `No scheduled meeting found for ${meetingCode}`
                : "Enter a meeting code from the home page or schedule a meeting first."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {meetingCode ? (
              <Link
                href={buildMeetingJoinPath(meetingCode)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
              >
                <Icon icon="material-symbols:arrow-back-rounded" className="h-5 w-5" />
                <span>Return to setup</span>
              </Link>
            ) : null}
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ea4335] px-5 text-sm font-medium text-white transition hover:bg-[#d93025]"
            >
              <Icon icon="heroicons:phone-x-mark" className="h-5 w-5" />
              <span>Leave call</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[28px] bg-[#202124] shadow-[0_20px_50px_rgba(32,33,36,0.22)]">
            <div className="flex aspect-video flex-col items-center justify-center px-6 text-center text-white">
              <Icon icon="heroicons:video-camera" className="h-16 w-16" />
              <p className="mt-5 text-[30px] font-normal">{meeting?.title || "Room preview"}</p>
              <p className="mt-3 text-sm text-white/75">
                {meeting
                  ? formatMeetingSchedule(meeting.startTime, meeting.endTime)
                  : "Realtime video and audio room wiring lands in the next feature slice."}
              </p>
              {meeting?.description ? (
                <p className="mt-4 max-w-[520px] text-sm leading-6 text-white/70">
                  {meeting.description}
                </p>
              ) : null}
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
                <span>Room shell is ready for the LiveKit join flow</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] bg-[#f8fafd] p-5">
              <h2 className="text-lg font-medium text-[#202124]">Meeting info</h2>
              <div className="mt-4 space-y-3 text-sm text-[#5f6368]">
                <p className="flex items-center gap-2">
                  <Icon icon="heroicons:link" className="h-5 w-5 text-[#1a73e8]" />
                  <span>{meetingCode || "Use a meeting code from the scheduler"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Icon icon="heroicons:clock" className="h-5 w-5 text-[#1a73e8]" />
                  <span>
                    {meeting
                      ? formatMeetingSchedule(meeting.startTime, meeting.endTime)
                      : "No scheduled time loaded"}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Icon icon="heroicons:user-circle" className="h-5 w-5 text-[#1a73e8]" />
                  <span>{meeting?.host.name || viewerName || "You"} (Host)</span>
                </p>
                {meeting?.passcode ? (
                  <p className="flex items-center gap-2">
                    <Icon icon="heroicons:lock-closed" className="h-5 w-5 text-[#1a73e8]" />
                    <span>Passcode: {meeting.passcode}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] bg-[#f8fafd] p-5">
              <h2 className="text-lg font-medium text-[#202124]">
                Participants ({meeting ? meeting.attendees.length + 1 : 1})
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a73e8] text-sm font-medium text-white">
                      {(meeting?.host.name || viewerName || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#202124]">
                        {meeting?.host.name || viewerName || "You"}
                      </p>
                      <p className="text-xs text-[#5f6368]">Host</p>
                    </div>
                  </div>
                  <Icon icon="heroicons:microphone" className="h-5 w-5 text-[#5f6368]" />
                </div>

                {meeting?.attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dadce0] text-sm font-medium text-[#3c4043]">
                        {(attendee.name || attendee.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#202124]">
                          {attendee.name || attendee.email}
                        </p>
                        <p className="text-xs uppercase text-[#5f6368]">
                          {attendee.status.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <Icon icon="heroicons:microphone-slash" className="h-5 w-5 text-[#9aa0a6]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <button className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4] text-[#3c4043] transition hover:bg-[#e8eaed]">
            <Icon icon="heroicons:microphone" className="h-6 w-6" />
          </button>
          <button className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4] text-[#3c4043] transition hover:bg-[#e8eaed]">
            <Icon icon="heroicons:video-camera" className="h-6 w-6" />
          </button>
          <button className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4] text-[#3c4043] transition hover:bg-[#e8eaed]">
            <Icon icon="heroicons:computer-desktop" className="h-6 w-6" />
          </button>
          <button className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3f4] text-[#3c4043] transition hover:bg-[#e8eaed]">
            <Icon icon="heroicons:chat-bubble-left-right" className="h-6 w-6" />
          </button>
          <Link
            href="/"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335] text-white transition hover:bg-[#d93025]"
          >
            <Icon icon="heroicons:phone-x-mark" className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </main>
  );
}
