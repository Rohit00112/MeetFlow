"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { z } from "zod";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { registerSchema } from "@/lib/validations/auth";
import { createFallbackAvatarUrl, getInitials } from "@/lib/avatar";

interface RegisterFormProps {
  googleEnabled: boolean;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RegisterForm({ googleEnabled }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a JPG, PNG, GIF, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile images must be under 5 MB.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setAvatar(dataUrl);
    setError(null);
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      registerSchema.parse({ name, email, password, confirmPassword });
      setSubmitting(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          avatar,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to create your account.");
      }

      const signInResponse = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!signInResponse || signInResponse.error) {
        throw new Error("Your account was created, but automatic sign-in failed.");
      }

      toast.success("Account created.");
      router.push(signInResponse.url || callbackUrl);
      router.refresh();
    } catch (registerError) {
      if (registerError instanceof z.ZodError) {
        const message = Object.values(registerError.flatten().fieldErrors)
          .flat()
          .join(", ");

        setError(message);
        toast.error(message);
      } else {
        const message =
          registerError instanceof Error ? registerError.message : "Unable to create your account.";
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

  const avatarPreview = avatar || createFallbackAvatarUrl(name);

  return (
    <AuthShell
      title="Create your account"
      description={
        <>
          Set up a credentials account for meetings and profile management, or use Google when
          it is configured for the environment.
        </>
      }
      footer={
        <p className="text-sm text-[#5f6368]">
          Already have an account?{" "}
          <Link
            href={`/auth/login${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="font-medium text-[#1a73e8] hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleRegister}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#dadce0] bg-[#f8f9fa]"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={name || "Profile avatar"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-medium text-[#1a73e8]">{getInitials(name)}</span>
            )}
          </button>
          <div>
            <p className="text-sm font-medium text-[#202124]">Profile photo</p>
            <p className="mt-1 text-sm text-[#5f6368]">Optional. Use JPG, PNG, GIF, or WebP.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex h-10 items-center rounded-full border border-[#dadce0] px-4 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f6fafe]"
            >
              Upload photo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarSelection}
          />
        </div>

        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#202124]">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            disabled={submitting}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sujan Subedi"
            className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
          />
        </div>

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
          autoComplete="new-password"
          placeholder="Create a password"
          onChange={setPassword}
        />

        <PasswordField
          id="confirm-password"
          name="confirm-password"
          label="Confirm password"
          value={confirmPassword}
          disabled={submitting}
          autoComplete="new-password"
          placeholder="Repeat your password"
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
          {submitting ? <Icon icon="eos-icons:loading" className="h-5 w-5 animate-spin" /> : "Create account"}
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
