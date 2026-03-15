import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafd] px-4 py-10">
      <div className="grid w-full max-w-[1120px] gap-10 rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(26,115,232,0.08)] md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:p-8 lg:p-10">
        <section className="flex flex-col justify-between rounded-[24px] bg-[radial-gradient(circle_at_top_left,_rgba(26,115,232,0.18),_transparent_44%),linear-gradient(180deg,_#eaf2ff_0%,_#f8fbff_44%,_#ffffff_100%)] p-8">
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/google-meet-official-logo.png"
                alt="Google Meet"
                width={124}
                height={40}
                priority
              />
            </Link>
            <h1 className="mt-10 max-w-[280px] text-[36px] font-normal leading-tight text-[#202124]">
              {title}
            </h1>
            <div className="mt-4 max-w-[320px] text-[15px] leading-7 text-[#5f6368]">
              {description}
            </div>
          </div>

          <div className="mt-10 rounded-[20px] border border-white/70 bg-white/80 p-5 backdrop-blur">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#1a73e8]">
              MeetFlow
            </p>
            <p className="mt-3 text-[15px] leading-6 text-[#3c4043]">
              Secure meetings, scheduling, and collaboration in one familiar interface.
            </p>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[24px] border border-[#edf1f7] bg-white p-6 md:p-8">
            {children}
            {footer ? <div className="mt-8 border-t border-[#edf1f7] pt-6">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
