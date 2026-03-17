"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useMemo, useState, useTransition } from "react";
import MeetingForm, { type MeetingFormDefaults } from "@/components/meetings/MeetingForm";
import {
  buildMeetingJoinPath,
  formatDateTimeLocalValue,
  formatMeetingSchedule,
  formatRecurrenceLabel,
} from "@/lib/meetings";
import type { MeetingDetail, MeetingPayload } from "@/lib/types/meetings";

interface MeetingDetailClientProps {
  initialMeeting: MeetingDetail;
}

function buildFormDefaults(meeting: MeetingDetail): MeetingFormDefaults {
  return {
    title: meeting.title,
    description: meeting.description || "",
    startTime: formatDateTimeLocalValue(meeting.startTime),
    endTime: formatDateTimeLocalValue(meeting.endTime),
    passcode: meeting.passcode || "",
    attendeesText: meeting.attendees.map((attendee) => attendee.email).join(", "),
    recurrence: meeting.recurrence,
  };
}

export default function MeetingDetailClient({ initialMeeting }: MeetingDetailClientProps) {
  const router = useRouter();
  const [meeting, setMeeting] = useState(initialMeeting);
  const [editing, setEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRouting, startTransition] = useTransition();

  const formDefaults = useMemo(() => buildFormDefaults(meeting), [meeting]);
  const sharePath = buildMeetingJoinPath(meeting.meetingCode);

  const handleCopyLink = async () => {
    const shareLink =
      typeof window === "undefined" ? sharePath : `${window.location.origin}${sharePath}`;

    await navigator.clipboard.writeText(shareLink);
    toast.success("Meeting link copied.");
  };

  const handleUpdateMeeting = async (payload: MeetingPayload) => {
    const response = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      error?: string;
      meeting?: MeetingDetail;
    };

    if (!response.ok || !data.meeting) {
      throw new Error(data.error || "Unable to update the meeting.");
    }

    setMeeting(data.meeting);
    setEditing(false);
    toast.success("Meeting updated.");
  };

  const handleCancelMeeting = async () => {
    if (!window.confirm("Cancel this meeting? This will remove the invite list and meeting code.")) {
      return;
    }

    setIsCancelling(true);

    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to cancel the meeting.");
      }

      toast.success("Meeting cancelled.");
      startTransition(() => {
        router.push("/meetings");
      });
    } catch (cancelError) {
      toast.error(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the meeting.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-8 sm:px-6 lg:px-10">
      <div className="rounded-[32px] border border-[#e8eaed] bg-white p-6 shadow-[0_20px_60px_rgba(60,64,67,0.12)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/meetings"
              className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f6fafe]"
            >
              <Icon icon="heroicons:arrow-left" className="h-4 w-4" />
              Back to meetings
            </Link>
            <h1 className="mt-5 text-[38px] font-normal leading-tight text-[#202124]">
              {meeting.title}
            </h1>
            {meeting.description ? (
              <p className="mt-4 max-w-[760px] text-[15px] leading-7 text-[#5f6368]">
                {meeting.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex h-11 items-center rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
            >
              Copy link
            </button>
            <Link
              href={sharePath}
              className="inline-flex h-11 items-center rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc]"
            >
              Join room
            </Link>
            {meeting.relation === "HOST" ? (
              <button
                type="button"
                onClick={() => setEditing((current) => !current)}
                className="inline-flex h-11 items-center rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
              >
                {editing ? "Close editor" : "Edit details"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-[#f8fafd] px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                  Schedule
                </p>
                <p className="mt-3 text-sm leading-6 text-[#202124]">
                  {formatMeetingSchedule(meeting.startTime, meeting.endTime)}
                </p>
              </div>
              <div className="rounded-3xl bg-[#f8fafd] px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                  Meeting code
                </p>
                <p className="mt-3 text-sm font-medium text-[#202124]">{meeting.meetingCode}</p>
              </div>
              <div className="rounded-3xl bg-[#f8fafd] px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                  Passcode
                </p>
                <p className="mt-3 text-sm text-[#202124]">{meeting.passcode || "None"}</p>
              </div>
              <div className="rounded-3xl bg-[#f8fafd] px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f6368]">
                  Recurrence
                </p>
                <p className="mt-3 text-sm text-[#202124]">
                  {formatRecurrenceLabel(meeting.recurrence)}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#e8eaed] bg-white p-6 shadow-[0_16px_40px_rgba(60,64,67,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
                    Invite list
                  </p>
                  <h2 className="mt-2 text-2xl font-normal text-[#202124]">
                    {meeting.attendees.length} invited {meeting.attendees.length === 1 ? "person" : "people"}
                  </h2>
                </div>
                <p className="text-sm text-[#5f6368]">
                  Host: {meeting.host.name}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {meeting.attendees.length === 0 ? (
                  <div className="rounded-3xl bg-[#f8fafd] px-5 py-5 text-sm text-[#5f6368]">
                    No invitees yet. Share the meeting code or add attendees in the editor.
                  </div>
                ) : (
                  meeting.attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex flex-col gap-3 rounded-3xl bg-[#f8fafd] px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-[#202124]">
                          {attendee.user?.name || attendee.name || attendee.email}
                        </p>
                        <p className="text-sm text-[#5f6368]">{attendee.email}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5f6368]">
                        {attendee.status.toLowerCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            {meeting.relation === "HOST" ? (
              <div className="rounded-[28px] border border-[#e8eaed] bg-white p-6 shadow-[0_16px_40px_rgba(60,64,67,0.08)]">
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
                  Host actions
                </p>
                {editing ? (
                  <div className="mt-6">
                    <MeetingForm
                      defaultValues={formDefaults}
                      submitLabel="Save changes"
                      pendingLabel="Saving..."
                      onSubmit={handleUpdateMeeting}
                    />
                  </div>
                ) : (
                  <>
                    <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                      Update the schedule, adjust invitees, or change the passcode without leaving the
                      meeting details page.
                    </p>
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
                      >
                        Edit meeting
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMeeting}
                        disabled={isCancelling || isRouting}
                        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#d93025] px-5 text-sm font-medium text-white transition hover:bg-[#c5221f] disabled:cursor-not-allowed disabled:bg-[#ef9a9a]"
                      >
                        {isCancelling || isRouting ? "Cancelling..." : "Cancel meeting"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-[28px] border border-[#e8eaed] bg-white p-6 shadow-[0_16px_40px_rgba(60,64,67,0.08)]">
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
                  Meeting access
                </p>
                <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                  You were invited to this meeting. Use the room link when it is time to join.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
