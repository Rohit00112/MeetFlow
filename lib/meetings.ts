import type { MeetingRecurrence } from "@/lib/types/meetings";

const codeAlphabet = "bcdfghjklmnpqrstvwxyz";

function generateSegment(length: number) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * codeAlphabet.length);
    return codeAlphabet[index];
  }).join("");
}

export function generateMeetingCode() {
  return `${generateSegment(3)}-${generateSegment(4)}-${generateSegment(3)}`;
}

export function buildMeetingJoinPath(code: string) {
  return `/meeting?code=${encodeURIComponent(code)}`;
}

export function buildMeetingRoomPath(code: string) {
  return `/meeting/room?code=${encodeURIComponent(code)}`;
}

export function buildMeetingShareUrl(code: string, origin: string) {
  return `${origin}${buildMeetingJoinPath(code)}`;
}

export function recurrenceToRule(recurrence: MeetingRecurrence) {
  switch (recurrence) {
    case "daily":
      return "FREQ=DAILY";
    case "weekly":
      return "FREQ=WEEKLY";
    case "monthly":
      return "FREQ=MONTHLY";
    default:
      return null;
  }
}

export function ruleToRecurrence(rule?: string | null): MeetingRecurrence {
  if (!rule) {
    return "none";
  }

  if (rule.includes("FREQ=DAILY")) {
    return "daily";
  }

  if (rule.includes("FREQ=WEEKLY")) {
    return "weekly";
  }

  if (rule.includes("FREQ=MONTHLY")) {
    return "monthly";
  }

  return "none";
}

export function extractMeetingCode(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const queryCode = url.searchParams.get("code");

    if (queryCode) {
      return queryCode.trim().toLowerCase();
    }

    const lastSegment = url.pathname.split("/").filter(Boolean).at(-1);

    if (lastSegment) {
      return lastSegment.trim().toLowerCase();
    }
  } catch {
    // Fall back to plain meeting code parsing.
  }

  const match = trimmed.toLowerCase().match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
  return match?.[0] || null;
}

export function formatDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function createDefaultMeetingWindow(startOffsetMinutes = 30) {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(start.getMinutes() + startOffsetMinutes);
  start.setSeconds(0, 0);

  const remainder = start.getMinutes() % 15;
  if (remainder !== 0) {
    start.setMinutes(start.getMinutes() + (15 - remainder));
  }

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    startTime: formatDateTimeLocalValue(start),
    endTime: formatDateTimeLocalValue(end),
  };
}

export function formatMeetingSchedule(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start)
    .concat(" - ")
    .concat(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(end),
    );
}

export function formatRecurrenceLabel(recurrence: MeetingRecurrence) {
  switch (recurrence) {
    case "daily":
      return "Repeats daily";
    case "weekly":
      return "Repeats weekly";
    case "monthly":
      return "Repeats monthly";
    default:
      return "Does not repeat";
  }
}
