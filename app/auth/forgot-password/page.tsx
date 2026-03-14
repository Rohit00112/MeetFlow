"use client";

import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { forgotPassword as forgotPasswordAction } from "@/redux/slices/authSlice";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { z } from "zod";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate email using Zod
      forgotPasswordSchema.parse({ email });

      // Dispatch forgot password action
      const resultAction = await dispatch(forgotPasswordAction({ email }));

      if (forgotPasswordAction.fulfilled.match(resultAction)) {
        toast.success('Password reset link sent to your email');
        setSubmitted(true);
      } else if (forgotPasswordAction.rejected.match(resultAction)) {
        toast.error(resultAction.payload as string || 'Failed to send reset link');
      }
    } catch (error: unknown) {
      console.error("Password reset request failed:", error);

      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors = error.flatten().fieldErrors;
        const errorMessage = Object.values(fieldErrors)
          .flat()
          .join(", ");

        toast.error(errorMessage);
      } else {
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="flex justify-center">
            <Image
              src="/google-meet-official-logo.png"
              alt="Google Meet Logo"
              width={124}
              height={40}
              priority
            />
          </Link>
          <h1 className="mt-6 text-center text-2xl font-normal text-gray-900">
            Reset your password
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="heroicons:exclamation-circle" className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-lg max-w-md w-full mx-auto">
          {submitted ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Icon icon="heroicons:check-circle" className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    If an account exists with the email {email}, you will receive a password reset link shortly.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Icon icon="eos-icons:loading" className="animate-spin h-5 w-5 mr-2" />
                  ) : (
                    <Icon icon="heroicons:envelope" className="h-5 w-5 mr-2" />
                  )}
                  Send reset link
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-6">
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
