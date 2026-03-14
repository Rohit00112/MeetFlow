"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { register as registerAction } from "@/redux/slices/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import { registerSchema } from "@/lib/validations/auth";
import { z } from "zod";

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Avatar component that shows image or initials
const Avatar = ({ src, name, size = 100 }: { src: string | null, name: string, size?: number }) => {
  if (src) {
    return (
      <div
        className="relative overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <Image
            src={src}
            alt={name || 'Avatar'}
            width={size}
            height={size}
            className="rounded-full object-cover w-full h-full ring-4 ring-white shadow-lg"
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              // If image fails to load, show initials instead
              console.error('Image failed to load:', src);
              e.currentTarget.style.display = 'none';
              // The parent div will show the initials fallback
            }}
          />
        </div>
      </div>
    );
  }

  // If no image, show initials
  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? `bg-blue-500` : 'bg-gray-300';

  return (
    <div
      className={`flex items-center justify-center rounded-full ${bgColor} text-white font-medium ring-4 ring-white shadow-lg`}
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {initials}
    </div>
  );
};

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const router = useRouter();

  // Create object URL for preview when profile image changes
  useEffect(() => {
    if (profileImage) {
      const objectUrl = URL.createObjectURL(profileImage);
      setProfileImageUrl(objectUrl);

      // Free memory when this component is unmounted
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [profileImage]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setFormError('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size should be less than 5MB');
        return;
      }

      setProfileImage(file);
      setFormError(null);
    }
  };

  // Handle avatar click to open file dialog
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      // Validate form using Zod
      registerSchema.parse({
        name,
        email,
        password,
        confirmPassword
      });

      // Convert image to base64 if it exists
      let imageBase64 = null;
      if (profileImage) {
        try {
          console.log('Converting profile image to base64');
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(profileImage);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          console.log('Profile image converted to base64 successfully');
        } catch (error) {
          console.error('Error converting image to base64:', error);
          toast.error('Failed to process the image. Please try again with a different image.');
          setFormError('Failed to process the image. Please try again with a different image.');
          return;
        }
      }

      console.log('Dispatching register action');
      const resultAction = await dispatch(registerAction({ name, email, password, profileImage: imageBase64 }));

      if (registerAction.fulfilled.match(resultAction)) {
        toast.success('Registration successful!');
        console.log('Registration successful, redirecting to home page');
        router.push("/"); // Redirect to home page after successful registration
      } else if (registerAction.rejected.match(resultAction)) {
        // Handle the rejected action
        console.error('Registration failed:', resultAction.payload);
        toast.error(resultAction.payload as string || "Registration failed");
        setFormError(resultAction.payload as string || "Registration failed");
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);

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
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
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
                <p className="text-sm text-red-700">{error || formError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-lg max-w-md w-full mx-auto">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Profile Image Upload */}
            <div className="flex flex-col items-center mb-6">
              <div
                onClick={handleAvatarClick}
                className="cursor-pointer hover:opacity-80 transition-opacity duration-200 mb-2"
                title="Click to upload profile picture"
              >
                <Avatar src={profileImageUrl} name={name} size={100} />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                id="profile-image"
              />
              <p className="text-sm text-gray-500 mt-1">
                {profileImage ? profileImage.name : "Click to upload profile picture"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
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
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Privacy Policy
                </Link>
              </label>
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
                  <Icon icon="heroicons:user-plus" className="h-5 w-5 mr-2" />
                )}
                Create account
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
