"use client";

import type { MeetingPayload, MeetingRecurrence } from "@/lib/types/meetings";
import { meetingFormSchema } from "@/lib/validations/meetings";
import { useEffect, useState } from "react";

export interface MeetingFormDefaults {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  passcode: string;
  attendeesText: string;
  recurrence: MeetingRecurrence;
}

interface MeetingFormProps {
  defaultValues: MeetingFormDefaults;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (payload: MeetingPayload) => Promise<void>;
}

export default function MeetingForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  onSubmit,
}: MeetingFormProps) {
  const [title, setTitle] = useState(defaultValues.title);
  const [description, setDescription] = useState(defaultValues.description);
  const [startTime, setStartTime] = useState(defaultValues.startTime);
  const [endTime, setEndTime] = useState(defaultValues.endTime);
  const [passcode, setPasscode] = useState(defaultValues.passcode);
  const [attendeesText, setAttendeesText] = useState(defaultValues.attendeesText);
  const [recurrence, setRecurrence] = useState<MeetingRecurrence>(defaultValues.recurrence);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setTitle(defaultValues.title);
    setDescription(defaultValues.description);
    setStartTime(defaultValues.startTime);
    setEndTime(defaultValues.endTime);
    setPasscode(defaultValues.passcode);
    setAttendeesText(defaultValues.attendeesText);
    setRecurrence(defaultValues.recurrence);
    setError(null);
  }, [defaultValues]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = meetingFormSchema.safeParse({
      title,
      description,
      startTime,
      endTime,
      passcode,
      attendeesText,
      recurrence,
    });

    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ");

      setError(message);
      return;
    }

    setPending(true);

    try {
      await onSubmit(parsed.data);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to save the meeting.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#202124]">Meeting title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Team weekly sync"
          className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#202124]">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Agenda, notes, or dial-in instructions."
          className="w-full rounded-3xl border border-[#dadce0] px-4 py-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#202124]">Start</span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#202124]">End</span>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#202124]">Passcode</span>
          <input
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Optional"
            className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#202124]">Repeats</span>
          <select
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value as MeetingRecurrence)}
            className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#202124]">Invite attendees</span>
        <textarea
          value={attendeesText}
          onChange={(event) => setAttendeesText(event.target.value)}
          rows={5}
          placeholder="one@example.com, two@example.com"
          className="w-full rounded-3xl border border-[#dadce0] px-4 py-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
        />
        <p className="mt-2 text-sm text-[#5f6368]">
          Separate invitees with commas or new lines.
        </p>
      </label>

      {error ? (
        <div className="rounded-2xl border border-[#f9dedc] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9bbcf2]"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
