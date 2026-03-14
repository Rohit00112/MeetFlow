"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { login as loginAction, clearError } from "@/redux/slices/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import { loginSchema } from "@/lib/validations/auth";
import { z } from "zod";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const [formError, setFormError] = useState<string | null>(null);

  // Clear any existing errors when the component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    console.log("Login form submitted");

    try {
      // Validate form using Zod
      loginSchema.parse({ email, password });
      console.log("Form validation passed, attempting login");

      const resultAction = await dispatch(loginAction({ email, password }));
      console.log("Login action result:", resultAction);

      if (loginAction.fulfilled.match(resultAction)) {
        toast.success("Login successful");
        console.log("Login successful, redirecting to home page");
        router.push("/"); // Redirect to home page after successful login
      } else if (loginAction.rejected.match(resultAction)) {
        console.error("Login failed:", resultAction.payload);
        // Show error toast
        toast.error(resultAction.payload as string || "Login failed. Please try again.");
        setFormError(resultAction.payload as string || "Login failed. Please try again.");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);

      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors = error.flatten().fieldErrors;
        const errorMessage = Object.values(fieldErrors)
          .flat()
          .join(", ");

        toast.error(errorMessage);
        setFormError(errorMessage);
      } else {
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error(errorMessage);
        setFormError(errorMessage);
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
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        {(error || formError) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="heroicons:exclamation-circle" className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{formError || error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-lg max-w-md w-full mx-auto">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`appearance-none relative block w-full px-3 py-3 border ${formError && formError.includes('Email') ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base`}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError && formError.includes('Email')) {
                      setFormError(null);
                    }
                  }}
                />
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`appearance-none relative block w-full px-3 py-3 border ${formError && formError.includes('Password') || error && error.includes('password') ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError && formError.includes('Password')) {
                      setFormError(null);
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    icon={showPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                    className="h-5 w-5 text-gray-400"
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
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
                  <Icon icon="heroicons:lock-closed" className="h-5 w-5 mr-2" />
                )}
                Sign in
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
                  c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
                  c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"/>
                  <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
                  C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"/>
                  <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
                  c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"/>
                  <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
                  c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"/>
                </svg>
                <span className="ml-2">Google</span>
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <Image src="/microsoft-logo.svg" alt="Microsoft" width={20} height={20} />
                <span className="ml-2">Microsoft</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
