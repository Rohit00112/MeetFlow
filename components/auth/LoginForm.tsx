"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { z } from "zod";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { loginSchema } from "@/lib/validations/auth";

interface LoginFormProps {
  googleEnabled: boolean;
}

export default function LoginForm({ googleEnabled }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      loginSchema.parse({ email, password });
      setSubmitting(true);

      const response = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!response || response.error) {
        setError("Invalid email or password.");
        toast.error("Invalid email or password.");
        return;
      }

      router.push(response.url || callbackUrl);
      router.refresh();
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const message = Object.values(validationError.flatten().fieldErrors)
          .flat()
          .join(", ");

        setError(message);
        toast.error(message);
      } else {
        const message =
          validationError instanceof Error ? validationError.message : "Unable to sign in.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <AuthShell
      title="Sign in"
      description={
        <>
          Use your MeetFlow account to join meetings, manage your profile, and keep your
          sessions synced across devices.
        </>
      }
      footer={
        <p className="text-sm text-[#5f6368]">
          New to MeetFlow?{" "}
          <Link
            href={`/auth/register${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="font-medium text-[#1a73e8] hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleCredentialsLogin}>
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

        <PasswordField
          id="password"
          name="password"
          label="Password"
          value={password}
          disabled={submitting}
          autoComplete="current-password"
          placeholder="Enter your password"
          onChange={setPassword}
        />

        {error ? (
          <div className="rounded-2xl border border-[#f9dedc] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 text-sm">
          <Link href="/auth/forgot-password" className="font-medium text-[#1a73e8] hover:underline">
            Forgot password?
          </Link>
          <span className="text-[#5f6368]">Use the same account for profile and meetings.</span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9bbcf2]"
        >
          {submitting ? <Icon icon="eos-icons:loading" className="h-5 w-5 animate-spin" /> : "Sign in"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#e8eaed]" />
            <span className="text-sm text-[#5f6368]">or</span>
            <div className="h-px flex-1 bg-[#e8eaed]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa] disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9Z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7 12.9 19.5C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7Z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2.1 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44Z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9Z"
              />
            </svg>
            Continue with Google
          </button>
        </>
      ) : null}
    </AuthShell>
  );
}
