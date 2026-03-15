"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { createFallbackAvatarUrl, getInitials } from "@/lib/avatar";
import { updateProfileSchema } from "@/lib/validations/auth";

interface ProfilePageClientProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    phone: string | null;
    avatar: string | null;
    image: string | null;
  };
  hasPassword: boolean;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePageClient({
  initialUser,
  hasPassword,
}: ProfilePageClientProps) {
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialUser.name);
  const [email, setEmail] = useState(initialUser.email);
  const [bio, setBio] = useState(initialUser.bio || "");
  const [phone, setPhone] = useState(initialUser.phone || "");
  const [avatar, setAvatar] = useState(initialUser.avatar || initialUser.image || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      updateProfileSchema.parse({ name, email, bio, phone });
      setSubmitting(true);

      const response = await fetch("/api/auth/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          bio,
          phone,
          avatar,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: {
          name: string;
          email: string;
          bio: string | null;
          phone: string | null;
          avatar: string | null;
          image: string | null;
        };
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error || "Unable to update your profile.");
      }

      setName(data.user.name);
      setEmail(data.user.email);
      setBio(data.user.bio || "");
      setPhone(data.user.phone || "");
      setAvatar(data.user.avatar || data.user.image || null);

      await update({
        user: {
          name: data.user.name,
          email: data.user.email,
          image: data.user.image || data.user.avatar,
          avatar: data.user.avatar || data.user.image,
          bio: data.user.bio,
          phone: data.user.phone,
        },
      });

      toast.success("Profile updated.");
    } catch (profileError) {
      const message =
        profileError instanceof Error ? profileError.message : "Unable to update your profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const avatarPreview = avatar || createFallbackAvatarUrl(name);

  return (
    <>
      <div className="min-h-screen bg-[#f8fafd] px-4 py-8">
        <div className="mx-auto max-w-[1120px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-4 py-2 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f6fafe]"
          >
            <Icon icon="heroicons:arrow-left" className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(60,64,67,0.12)]">
            <div className="bg-[linear-gradient(135deg,_#e8f0fe_0%,_#d2e3fc_42%,_#f8fbff_100%)] px-6 py-10 md:px-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#1a73e8] text-2xl font-medium text-white shadow-lg"
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(name)
                    )}
                  </button>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
                      Account profile
                    </p>
                    <h1 className="mt-2 text-[32px] font-normal text-[#202124]">{name}</h1>
                    <p className="mt-2 text-sm text-[#5f6368]">{email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-11 items-center rounded-full border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f6fafe]"
                  >
                    Update photo
                  </button>
                  {hasPassword ? (
                    <button
                      type="button"
                      onClick={() => setPasswordModalOpen(true)}
                      className="inline-flex h-11 items-center rounded-full border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
                    >
                      Change password
                    </button>
                  ) : (
                    <div className="inline-flex h-11 items-center rounded-full border border-[#dadce0] bg-white px-5 text-sm text-[#5f6368]">
                      Managed by Google sign-in
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form className="grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] md:px-10" onSubmit={handleSubmit}>
              <section className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#202124]">Full name</span>
                    <input
                      value={name}
                      disabled={submitting}
                      onChange={(event) => setName(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#202124]">Email</span>
                    <input
                      value={email}
                      type="email"
                      disabled={submitting}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#202124]">Bio</span>
                  <textarea
                    value={bio}
                    disabled={submitting}
                    onChange={(event) => setBio(event.target.value)}
                    rows={5}
                    placeholder="Add a short profile note."
                    className="w-full rounded-3xl border border-[#dadce0] px-4 py-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#202124]">Phone</span>
                  <input
                    value={phone}
                    disabled={submitting}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+1 555 123 4567"
                    className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-[#f9dedc] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
                    {error}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 items-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9bbcf2]"
                  >
                    {submitting ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </section>

              <aside className="rounded-[24px] border border-[#edf1f7] bg-[#fbfcff] p-6">
                <h2 className="text-lg font-medium text-[#202124]">Profile preview</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                  This information will be used across scheduling, meeting presence, and profile menus.
                </p>

                <div className="mt-8 rounded-[24px] border border-[#edf1f7] bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#1a73e8] text-lg font-medium text-white">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreview} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(name)
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#202124]">{name}</p>
                      <p className="text-sm text-[#5f6368]">{email}</p>
                    </div>
                  </div>

                  {bio ? <p className="mt-5 text-sm leading-6 text-[#3c4043]">{bio}</p> : null}
                  {phone ? <p className="mt-4 text-sm text-[#5f6368]">{phone}</p> : null}
                </div>
              </aside>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarSelection}
              />
            </form>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
