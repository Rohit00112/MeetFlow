"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { signOut, useSession } from "next-auth/react";
import Logo from "@/public/google-meet-official-logo.png";
import { getInitials, resolveAvatar } from "@/lib/avatar";

function formatDateTime(date: Date) {
  return {
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date),
  };
}

function NavbarIcon({ icon }: { icon: string }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full text-[#5f6368] transition hover:bg-[#f1f3f4]"
    >
      <Icon icon={icon} className="h-5 w-5" />
    </button>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const { time, date } = formatDateTime(now);
  const initials = getInitials(user?.name);
  const avatar = user ? resolveAvatar(user) : null;

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    setProfileMenuOpen(false);
  };

  return (
    <header className="border-b border-[#f1f3f4] bg-white">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image src={Logo} alt="Google Meet" priority className="h-10 w-auto" />
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <span className="mr-3 text-[22px] font-normal text-[#3c4043]">{time}</span>
          <span className="mr-6 text-[14px] text-[#5f6368]">{date}</span>
          <NavbarIcon icon="akar-icons:question" />
          <NavbarIcon icon="octicon:report-24" />
          <NavbarIcon icon="mdi:settings-outline" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NavbarIcon icon="mage:dots-menu" />

          {loading ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#e8eaed]" />
          ) : user ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#1a73e8] text-sm font-medium text-white"
              >
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={user.name || "Profile"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-[0_16px_40px_rgba(60,64,67,0.18)]">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <p className="truncate text-sm font-medium text-[#202124]">{user.name}</p>
                    <p className="truncate text-sm text-[#5f6368]">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-5 py-3 text-sm text-[#202124] transition hover:bg-[#f8f9fa]"
                  >
                    Manage your profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-5 py-3 text-left text-sm text-[#202124] transition hover:bg-[#f8f9fa]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex h-10 items-center rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f6fafe]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
