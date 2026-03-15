"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import ToastProvider from "@/components/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider />
      {children}
    </SessionProvider>
  );
}
