"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { z } from "zod";
import AuthShell from "@/components/auth/AuthShell";
import { forgotPasswordSchema } from "@/lib/validations/auth";

interface ForgotPasswordResponse {
  message?: string;
  resetLink?: string;
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setResetLink(null);

    try {
      forgotPasswordSchema.parse({ email });
      setSubmitting(true);

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as ForgotPasswordResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to send a reset link.");
      }

      setSuccessMessage(
        data.message ||
          "If an account exists for that email, a password reset link has been prepared.",
      );
      setResetLink(data.resetLink || null);
      toast.success("Reset instructions prepared.");
    } catch (forgotPasswordError) {
      if (forgotPasswordError instanceof z.ZodError) {
        const message = Object.values(forgotPasswordError.flatten().fieldErrors)
          .flat()
          .join(", ");

        setError(message);
        toast.error(message);
      } else {
        const message =
          forgotPasswordError instanceof Error
            ? forgotPasswordError.message
            : "Unable to send a reset link.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      description={
        <>
          Enter the email tied to your MeetFlow account. In local development, the reset link is
          returned directly so you can complete the flow without email delivery.
        </>
      }
      footer={
        <p className="text-sm text-[#5f6368]">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-medium text-[#1a73e8] hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#202124]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={submitting}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#f9dedc] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-[#c4eed0] bg-[#e6f4ea] px-4 py-3 text-sm text-[#137333]">
            <p>{successMessage}</p>
            {resetLink ? (
              <Link href={resetLink} className="mt-3 inline-block font-medium text-[#1a73e8] hover:underline">
                Open reset link
              </Link>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9bbcf2]"
        >
          {submitting ? "Preparing link..." : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
