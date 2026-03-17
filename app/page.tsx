"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useSession } from "next-auth/react";
import { buildMeetingJoinPath, extractMeetingCode, formatMeetingSchedule } from "@/lib/meetings";
import type { MeetingSummary } from "@/lib/types/meetings";
import Navbar from "@/components/Navbar";
import Image1 from "@/public/slider1.png";
import Image2 from "@/public/slider2.png";
import Image3 from "@/public/slider3.png";

interface Slide {
  src: StaticImageData;
  alt: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    src: Image1,
    alt: "MeetFlow safety",
    title: "Your meeting is safe",
    description: "No one can join a meeting unless invited or admitted by the host.",
  },
  {
    src: Image3,
    alt: "MeetFlow planning",
    title: "Plan ahead",
    description: "Create meetings, share invites, and keep every call organized before it starts.",
  },
  {
    src: Image2,
    alt: "MeetFlow sharing",
    title: "Get a link you can share",
    description: "Create a meeting link in seconds and send it to the people you want to meet with.",
  },
];

function MeetingOptionsMenu({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-[0_16px_40px_rgba(60,64,67,0.18)]">
      <button
        type="button"
        onClick={() => handleNavigate("/meetings?compose=later")}
        className="flex w-full items-center gap-4 px-5 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50"
      >
        <Icon icon="material-symbols:link-rounded" className="h-5 w-5 text-[#1a73e8]" />
        <span>Create a meeting for later</span>
      </button>
      <button
        type="button"
        onClick={() => handleNavigate("/meetings?compose=instant")}
        className="flex w-full items-center gap-4 px-5 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50"
      >
        <Icon icon="ic:baseline-plus" className="h-5 w-5 text-[#1a73e8]" />
        <span>Start an instant meeting</span>
      </button>
      <button
        type="button"
        onClick={() => handleNavigate("/meetings?compose=calendar")}
        className="flex w-full items-center gap-4 px-5 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50"
      >
        <Icon icon="lucide:calendar" className="h-5 w-5 text-[#1a73e8]" />
        <span>Schedule in Google Calendar</span>
      </button>
    </div>
  );
}

function IllustrationCarousel({
  activeIndex,
  onChange,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const activeSlide = slides[activeIndex];

  return (
    <section className="flex w-full max-w-[520px] flex-col items-center text-center">
      <div className="flex w-full items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => onChange(activeIndex === 0 ? slides.length - 1 : activeIndex - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
        >
          <Icon icon="akar-icons:chevron-left" className="h-6 w-6" />
        </button>

        <div className="relative h-72 w-72 overflow-hidden rounded-full bg-[#f1f3f4]">
          <Image
            src={activeSlide.src}
            alt={activeSlide.alt}
            fill
            priority
            className="object-cover"
          />
        </div>

        <button
          type="button"
          aria-label="Next slide"
          onClick={() => onChange(activeIndex === slides.length - 1 ? 0 : activeIndex + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
        >
          <Icon icon="akar-icons:chevron-right" className="h-6 w-6" />
        </button>
      </div>

      <div className="mt-8 flex gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Show ${slide.title}`}
            onClick={() => onChange(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex ? "w-6 bg-[#1a73e8]" : "w-2.5 bg-gray-300"
            }`}
          />
        ))}
      </div>

      <div className="mt-8 max-w-[380px] space-y-3">
        <h2 className="text-[28px] font-normal leading-tight text-[#202124]">
          {activeSlide.title}
        </h2>
        <p className="text-[15px] leading-6 text-[#5f6368]">{activeSlide.description}</p>
      </div>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const [activeIndex, setActiveIndex] = useState(0);
  const [meetingCode, setMeetingCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingSummary[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-meeting-menu]")) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!user) {
      setUpcomingMeetings([]);
      return;
    }

    let cancelled = false;

    const loadMeetings = async () => {
      setLoadingMeetings(true);

      try {
        const response = await fetch("/api/meetings?limit=3");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { meetings?: MeetingSummary[] };

        if (!cancelled) {
          setUpcomingMeetings(data.meetings || []);
        }
      } finally {
        if (!cancelled) {
          setLoadingMeetings(false);
        }
      }
    };

    void loadMeetings();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleJoin = () => {
    if (!meetingCode.trim()) {
      return;
    }

    const normalizedCode = extractMeetingCode(meetingCode);

    if (!normalizedCode) {
      setJoinError("Enter a valid meeting code or full MeetFlow meeting link.");
      return;
    }

    setJoinError(null);
    router.push(buildMeetingJoinPath(normalizedCode));
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1400px] flex-col justify-center px-6 pb-16 pt-8 lg:flex-row lg:items-center lg:gap-16 lg:px-16 lg:pt-12">
        <section className="w-full max-w-[640px]">
          <h1 className="max-w-[580px] text-[44px] font-normal leading-[1.15] tracking-[-0.01em] text-[#202124] lg:text-[56px]">
            Premium video meetings. Now free for everyone.
          </h1>
          <p className="mt-4 max-w-[520px] text-[18px] leading-8 text-[#5f6368]">
            We re-engineered the service we built for secure business meetings, Google Meet,
            to make it free and available for all.
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            {user ? (
              <div data-meeting-menu className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="inline-flex h-12 items-center gap-3 rounded-full bg-[#1a73e8] px-6 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#1765cc]"
                >
                  <Icon icon="ri:video-add-line" className="h-5 w-5" />
                  <span>New meeting</span>
                </button>
                {menuOpen && <MeetingOptionsMenu onClose={() => setMenuOpen(false)} />}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex h-12 items-center gap-3 rounded-full bg-[#1a73e8] px-6 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#1765cc]"
              >
                <Icon icon="ri:video-add-line" className="h-5 w-5" />
                <span>New meeting</span>
              </Link>
            )}

            <div className="flex h-12 flex-1 items-center rounded-full border border-[#dadce0] px-4 shadow-sm transition focus-within:border-[#1a73e8] focus-within:shadow-[0_0_0_1px_#1a73e8]">
              <Icon icon="material-symbols:keyboard-outline" className="h-5 w-5 text-[#5f6368]" />
              <input
                type="text"
                value={meetingCode}
                onChange={(event) => {
                  setMeetingCode(event.target.value);
                  if (joinError) {
                    setJoinError(null);
                  }
                }}
                placeholder="Enter a code or link"
                aria-label="Enter a code or link"
                className="ml-3 w-full border-0 bg-transparent text-[16px] text-[#202124] outline-none placeholder:text-[#5f6368]"
              />
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={!meetingCode.trim()}
              className="h-12 rounded-full px-4 text-[15px] font-medium text-[#1a73e8] transition enabled:hover:bg-[#f6fafe] disabled:cursor-not-allowed disabled:text-[#9aa0a6]"
            >
              Join
            </button>
          </div>

          {joinError ? <p className="mt-3 text-sm text-[#d93025]">{joinError}</p> : null}

          {user ? (
            <section className="mt-10 rounded-[28px] border border-[#e8eaed] bg-white p-5 shadow-[0_12px_32px_rgba(60,64,67,0.08)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
                    Upcoming meetings
                  </p>
                  <h2 className="mt-2 text-[24px] font-normal text-[#202124]">
                    Pick up where you left off
                  </h2>
                </div>
                <Link
                  href="/meetings"
                  className="text-sm font-medium text-[#1a73e8] hover:underline"
                >
                  Open meeting dashboard
                </Link>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {loadingMeetings ? (
                  <div className="rounded-3xl bg-[#f8fafd] px-5 py-5 text-sm text-[#5f6368]">
                    Loading your meetings…
                  </div>
                ) : upcomingMeetings.length === 0 ? (
                  <div className="rounded-3xl bg-[#f8fafd] px-5 py-5 text-sm leading-6 text-[#5f6368] lg:col-span-3">
                    No meetings scheduled yet. Use <span className="font-medium text-[#202124]">New meeting</span>{" "}
                    to create one for later or start an instant room.
                  </div>
                ) : (
                  upcomingMeetings.map((meeting) => (
                    <article
                      key={meeting.id}
                      className="rounded-3xl bg-[#f8fafd] px-5 py-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-medium text-[#202124]">{meeting.title}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5f6368]">
                          {meeting.relation === "HOST" ? "Host" : "Invited"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                        {formatMeetingSchedule(meeting.startTime, meeting.endTime)}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="inline-flex h-10 items-center rounded-full border border-[#dadce0] px-4 text-sm font-medium text-[#202124] transition hover:bg-white"
                        >
                          Manage
                        </Link>
                        <Link
                          href={buildMeetingJoinPath(meeting.meetingCode)}
                          className="inline-flex h-10 items-center rounded-full bg-[#1a73e8] px-4 text-sm font-medium text-white transition hover:bg-[#1765cc]"
                        >
                          Join room
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}

          <div className="mt-12 border-t border-[#dadce0] pt-10 text-[14px] leading-6 text-[#5f6368]">
            <Link href="/" className="font-medium text-[#1a73e8] hover:underline">
              Learn more
            </Link>{" "}
            about Google Meet
          </div>
        </section>

        <div className="mt-16 flex w-full justify-center lg:mt-0">
          <IllustrationCarousel activeIndex={activeIndex} onChange={setActiveIndex} />
        </div>
      </main>
    </>
  );
}
