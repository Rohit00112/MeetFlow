"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/redux/store";
// Redux-based authentication is now used instead of context-based
import ReduxProtectedLayout from "@/components/ReduxProtectedLayout";
import ToastProvider from "@/components/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ToastProvider />
          <ReduxProtectedLayout>{children}</ReduxProtectedLayout>
        </PersistGate>
      </Provider>
    </SessionProvider>
  );
}
