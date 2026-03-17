"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useMemo, useState, useTransition } from "react";
import MeetingForm, { type MeetingFormDefaults } from "@/components/meetings/MeetingForm";
import {
  buildMeetingJoinPath,
  createDefaultMeetingWindow,
  formatMeetingSchedule,
  formatRecurrenceLabel,
} from "@/lib/meetings";
import type { MeetingPayload, MeetingSummary } from "@/lib/types/meetings";

interface MeetingsPageClientProps {
  composeMode: "later" | "instant" | "calendar";
  initialMeetings: MeetingSummary[];
}

function buildInitialDefaults(composeMode: "later" | "instant" | "calendar"): MeetingFormDefaults {
  const timeWindow = createDefaultMeetingWindow(composeMode === "instant" ? 0 : 30);

  return {
    title:
      composeMode === "instant"
        ? "Instant meeting"
        : composeMode === "calendar"
          ? "Planning session"
          : "",
    description:
      composeMode === "calendar"
        ? "Calendar sync will land in a later feature slice. Schedule here for now."
        : "",
    startTime: timeWindow.startTime,
    endTime: timeWindow.endTime,
    passcode: "",
    attendeesText: "",
    recurrence: "none",
  };
}

function relationBadge(relation: MeetingSummary["relation"]) {
  return relation === "HOST"
    ? "border-[#d2e3fc] bg-[#e8f0fe] text-[#1a73e8]"
    : "border-[#d7f8d7] bg-[#e6f4ea] text-[#137333]";
}

export default function MeetingsPageClient({
  composeMode,
  initialMeetings,
}: MeetingsPageClientProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [isRouting, startTransition] = useTransition();
  const initialDefaults = useMemo(() => buildInitialDefaults(composeMode), [composeMode]);

  const handleCreateMeeting = async (payload: MeetingPayload) => {
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      error?: string;
      meeting?: MeetingSummary;
    };

    if (!response.ok || !data.meeting) {
      throw new Error(data.error || "Unable to create the meeting.");
    }

    toast.success("Meeting scheduled.");
    setMeetings((current) => [data.meeting!, ...current]);
    startTransition(() => {
      router.push(`/meetings/${data.meeting!.id}`);
    });
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-8 sm:px-6 lg:px-10">
      <div className="grid gap-8 xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-[#e8eaed] bg-white p-6 shadow-[0_16px_40px_rgba(60,64,67,0.12)] lg:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
            Schedule meetings
          </p>
          <h1 className="mt-3 text-[34px] font-normal leading-tight text-[#202124]">
            Plan once. Share instantly.
          </h1>
          <p className="mt-3 max-w-[360px] text-[15px] leading-7 text-[#5f6368]">
            Create a meeting code, invite attendees, and keep everything ready before the room
            opens.
          </p>

          {composeMode === "calendar" ? (
            <div className="mt-6 rounded-3xl border border-[#fce8b2] bg-[#fef7e0] px-4 py-3 text-sm text-[#8d4f00]">
              Google Calendar sync is planned for a later slice. This scheduler already creates the
              meeting, code, and invite list.
            </div>
          ) : null}

          <div className="mt-8">
            <MeetingForm
              defaultValues={initialDefaults}
              submitLabel="Create meeting"
              pendingLabel="Creating..."
              onSubmit={handleCreateMeeting}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[28px] border border-[#e8eaed] bg-white p-6 shadow-[0_16px_40px_rgba(60,64,67,0.12)] lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
                  Upcoming meetings
                </p>
                <h2 className="mt-2 text-[28px] font-normal text-[#202124]">Your meeting queue</h2>
              </div>
              <p className="text-sm text-[#5f6368]">
                {isRouting ? "Opening meeting…" : `${meetings.length} scheduled meetings`}
              </p>
            </div>
          </div>

          {meetings.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#dadce0] bg-[#f8fafd] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#1a73e8] shadow-sm">
                <Icon icon="lucide:calendar-plus-2" className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-xl font-medium text-[#202124]">No scheduled meetings yet</h3>
              <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                Use the scheduler to create your first meeting and generate a shareable join code.
              </p>
            </div>
          ) : (
            meetings.map((meeting) => (
              <article
                key={meeting.id}
                className="rounded-[28px] border border-[#e8eaed] bg-white p-6 shadow-[0_16px_40px_rgba(60,64,67,0.12)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${relationBadge(meeting.relation)}`}
                      >
                        {meeting.relation === "HOST" ? "Hosted by you" : "Invited"}
                      </span>
                      {meeting.isRecurring ? (
                        <span className="rounded-full bg-[#f1f3f4] px-3 py-1 text-xs font-medium text-[#5f6368]">
                          {formatRecurrenceLabel(meeting.recurrence)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-[26px] font-normal text-[#202124]">{meeting.title}</h3>
                    {meeting.description ? (
                      <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#5f6368]">
                        {meeting.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="inline-flex h-11 items-center rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
                    >
                      Manage
                    </Link>
                    <Link
                      href={buildMeetingJoinPath(meeting.meetingCode)}
                      className="inline-flex h-11 items-center rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc]"
                    >
                      Join room
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-[#f8fafd] px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                      Schedule
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#202124]">
                      {formatMeetingSchedule(meeting.startTime, meeting.endTime)}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#f8fafd] px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                      Meeting code
                    </p>
                    <p className="mt-2 font-medium text-[#202124]">{meeting.meetingCode}</p>
                  </div>
                  <div className="rounded-3xl bg-[#f8fafd] px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                      Invitees
                    </p>
                    <p className="mt-2 text-sm text-[#202124]">
                      {meeting.attendeeCount} invited {meeting.attendeeCount === 1 ? "person" : "people"}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
