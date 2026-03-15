"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { z } from "zod";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { resetPasswordSchema } from "@/lib/validations/auth";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      resetPasswordSchema.parse({ token, password, confirmPassword });
      setSubmitting(true);

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to reset your password.");
      }

      setSuccess(true);
      toast.success("Password reset complete.");
      window.setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (resetError) {
      if (resetError instanceof z.ZodError) {
        const message = Object.values(resetError.flatten().fieldErrors)
          .flat()
          .join(", ");

        setError(message);
        toast.error(message);
      } else {
        const message =
          resetError instanceof Error ? resetError.message : "Unable to reset your password.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      description={
        <>
          Set a fresh password for your MeetFlow credentials account. The link must include a
          valid reset token.
        </>
      }
      footer={
        <p className="text-sm text-[#5f6368]">
          Need to start again?{" "}
          <Link href="/auth/forgot-password" className="font-medium text-[#1a73e8] hover:underline">
            Request a new reset link
          </Link>
        </p>
      }
    >
      {!token ? (
        <div className="rounded-2xl border border-[#f6c7b6] bg-[#fef7e0] px-4 py-3 text-sm text-[#8d4f00]">
          Invalid or missing reset token. Use the link generated from the forgot-password page.
        </div>
      ) : success ? (
        <div className="rounded-2xl border border-[#c4eed0] bg-[#e6f4ea] px-4 py-3 text-sm text-[#137333]">
          Password updated. Redirecting you to sign in.
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <PasswordField
            id="password"
            name="password"
            label="New password"
            value={password}
            disabled={submitting}
            autoComplete="new-password"
            placeholder="Create a new password"
            onChange={setPassword}
          />

          <PasswordField
            id="confirm-password"
            name="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            disabled={submitting}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            onChange={setConfirmPassword}
          />

          {error ? (
            <div className="rounded-2xl border border-[#f9dedc] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9bbcf2]"
          >
            {submitting ? "Updating password..." : "Reset password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
