import { z } from "zod";

export const recurrenceOptions = ["none", "daily", "weekly", "monthly"] as const;

export const recurrenceSchema = z.enum(recurrenceOptions);

const dateTimeSchema = z
  .string()
  .min(1, { message: "Choose a date and time." })
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date and time.",
  });

const normalizedTextSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const emailSchema = z.string().trim().email({ message: "Enter a valid attendee email." });

export function normalizeAttendeeInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((segment) => segment.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export const meetingPayloadSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, { message: "Meeting title must be at least 2 characters." })
      .max(120, { message: "Meeting title must be 120 characters or less." }),
    description: normalizedTextSchema,
    startTime: dateTimeSchema,
    endTime: dateTimeSchema,
    passcode: normalizedTextSchema,
    attendees: z.array(emailSchema).max(50, { message: "You can invite up to 50 attendees." }),
    recurrence: recurrenceSchema.default("none"),
  })
  .refine((value) => new Date(value.endTime) > new Date(value.startTime), {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

export const meetingFormSchema = z
  .object({
    title: z.string(),
    description: z.string().optional().default(""),
    startTime: z.string(),
    endTime: z.string(),
    passcode: z.string().optional().default(""),
    attendeesText: z.string().optional().default(""),
    recurrence: recurrenceSchema.default("none"),
  })
  .transform((value) => ({
    title: value.title,
    description: value.description,
    startTime: value.startTime,
    endTime: value.endTime,
    passcode: value.passcode,
    attendees: normalizeAttendeeInput(value.attendeesText),
    recurrence: value.recurrence,
  }))
  .pipe(meetingPayloadSchema);
