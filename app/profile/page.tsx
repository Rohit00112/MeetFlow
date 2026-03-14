"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { updateProfile as updateProfileAction } from "@/redux/slices/authSlice";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import toast from "react-hot-toast";
import { updateProfileSchema } from "@/lib/validations/auth";
import { z } from "zod";
import useAuth from "@/hooks/useAuth";
import { clearAuthData } from "@/lib/tokenManager";

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Helper function to compress images before upload
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Create a new image object
    const img = new window.Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions (max 800px width/height while maintaining aspect ratio)
      let width = img.width;
      let height = img.height;
      const maxSize = 800;

      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas with new dimensions
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }

          // Create a new file from the blob
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.log(`Original size: ${file.size / 1024}KB, Compressed size: ${compressedFile.size / 1024}KB`);
          resolve(compressedFile);
        },
        'image/jpeg',
        0.7 // Quality (0.7 = 70% quality)
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
  });
};

// Avatar component that shows image or initials
const Avatar = ({ src, name, size = 100, className = '' }: { src: string | null, name: string, size?: number, className?: string }) => {
  if (src) {
    return (
      <div
        className={`relative overflow-hidden rounded-full ${className}`}
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
      className={`flex items-center justify-center rounded-full ${bgColor} text-white font-medium ring-4 ring-white shadow-lg ${className}`}
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {initials}
    </div>
  );
};

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  // Use custom auth hook for authentication management
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setBio(user.bio || "");
      setPhone(user.phone || "");
      setProfileImageUrl(user.avatar || null);
    }
  }, [user]);

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
        setSaveError('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('Image size should be less than 5MB');
        return;
      }

      // Create a new image to check dimensions
      const img = new window.Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        // Check if image is too small
        if (img.width < 100 || img.height < 100) {
          setSaveError('Image is too small. Please use an image that is at least 100x100 pixels.');
          URL.revokeObjectURL(img.src);
          return;
        }

        // Set the profile image
        setProfileImage(file);
        setSaveError(null);
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        setSaveError('Failed to load image. Please try another file.');
        URL.revokeObjectURL(img.src);
      };
    }
  };

  // Handle avatar click to open file dialog
  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateForm = (): boolean => {
    // Reset errors
    setNameError(null);
    setEmailError(null);
    setBioError(null);
    setPhoneError(null);
    setSaveError(null);

    try {
      // Validate using Zod
      updateProfileSchema.parse({
        name,
        email,
        bio,
        phone
      });

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors = error.flatten().fieldErrors;

        if (fieldErrors.name) {
          setNameError(fieldErrors.name[0]);
        }

        if (fieldErrors.email) {
          setEmailError(fieldErrors.email[0]);
        }

        if (fieldErrors.bio) {
          setBioError(fieldErrors.bio[0]);
        }

        if (fieldErrors.phone) {
          setPhoneError(fieldErrors.phone[0]);
        }
      } else {
        setSaveError('Validation failed. Please check your inputs.');
      }

      return false;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset success state
    setSaveSuccess(false);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setSaveLoading(true);

    try {
      // Convert image to base64 if it exists
      let imageBase64 = null;
      if (profileImage) {
        try {
          // Compress the image before converting to base64
          const compressedImage = await compressImage(profileImage);

          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(compressedImage);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });

          console.log('Image converted to base64 successfully');
        } catch (error) {
          console.error('Error converting image to base64:', error);
          const errorMessage = 'Failed to process the image. Please try again with a different image.';
          toast.error(errorMessage);
          setSaveError(errorMessage);
          setSaveLoading(false);
          return;
        }
      }

      console.log('Dispatching profile update action');
      // Update profile using Redux
      const resultAction = await dispatch(updateProfileAction({
        name,
        email,
        bio,
        phone,
        profileImage: imageBase64
      }));

      console.log('Profile update action result:', {
        isSuccess: updateProfileAction.fulfilled.match(resultAction),
        isError: updateProfileAction.rejected.match(resultAction),
        payload: resultAction.payload ? 'Has payload' : 'No payload'
      });

      if (updateProfileAction.fulfilled.match(resultAction)) {
        console.log('Profile update successful');
        // Show success message
        toast.success('Profile updated successfully!');
        setSaveSuccess(true);

        // Exit edit mode after a short delay
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess(false);
        }, 2000);
      } else if (updateProfileAction.rejected.match(resultAction)) {
        // Handle the rejected action
        const errorMessage = resultAction.payload as string || "Failed to update profile";
        console.error('Profile update failed:', errorMessage);
        toast.error(errorMessage);
        setSaveError(errorMessage);

        // If there's a token error, redirect to login
        if (errorMessage.includes('token') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('Authentication')) {
          console.log('Authentication error detected, redirecting to login');
          toast.error('Your session has expired. Please log in again.');

          // Clear auth data
          clearAuthData();

          // Use setTimeout with 0 delay to avoid React state updates during rendering
          // Then use another setTimeout for the actual redirect delay
          setTimeout(() => {
            setTimeout(() => {
              router.push('/auth/login');
            }, 2000);
          }, 0);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile. Please try again.";
      toast.error(errorMessage);
      setSaveError(errorMessage);
      console.error("Profile update failed:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon icon="eos-icons:loading" className="animate-spin h-10 w-10 text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 group"
          >
            <Icon
              icon="heroicons:arrow-left"
              className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform duration-200"
            />
            Back to Home
          </Link>
        </div>
        {/* Profile Header with Background */}
        <div className="relative mb-8">
          <div className="h-48 w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-xl overflow-hidden">
            <div className="absolute inset-0 bg-opacity-20 bg-black flex items-center justify-center">
              <div className="w-full h-full bg-cover bg-center opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')" }}></div>
            </div>
          </div>

          <div className="absolute -bottom-16 left-0 w-full flex justify-center">
            <div
              onClick={handleAvatarClick}
              className={`${isEditing ? 'cursor-pointer transform hover:scale-105' : ''} transition-all duration-300`}
              title={isEditing ? "Click to change profile picture" : ""}
            >
              <Avatar src={profileImageUrl} name={name} size={130} />
            </div>
          </div>
        </div>

        {/* Profile Card with Elevated Design */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden mt-12 transition-all duration-300 hover:shadow-2xl">
          <div className="px-6 py-8 sm:px-8 flex justify-between items-center border-b border-gray-200">
            <div className="text-center w-full mt-4">
              <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
              <div className="flex flex-col items-center space-y-2 mt-2">
                <p className="text-gray-500 flex items-center justify-center">
                  <Icon icon="heroicons:envelope" className="h-4 w-4 mr-1" />
                  {email}
                </p>
                {phone && (
                  <p className="text-gray-500 flex items-center justify-center">
                    <Icon icon="heroicons:phone" className="h-4 w-4 mr-1" />
                    {phone}
                  </p>
                )}
              </div>
              {bio && !isEditing && (
                <div className="mt-4 max-w-md mx-auto">
                  <p className="text-gray-600 text-sm italic">&ldquo;{bio}&rdquo;</p>
                </div>
              )}
              <div className="mt-4 flex justify-center space-x-3">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transition-all duration-300 hover:shadow-lg"
                  >
                    <Icon icon="heroicons:pencil" className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <form onSubmit={handleSaveProfile}>
              <div className="px-6 py-6 sm:px-8">
                {saveError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow-sm">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Icon icon="heroicons:exclamation-circle" className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{saveError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {saveSuccess && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md shadow-sm">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Icon icon="heroicons:check-circle" className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">Profile updated successfully!</p>
                      </div>
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="flex flex-col items-center mb-8">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg, image/png, image/gif, image/webp"
                      className="hidden"
                      id="profile-image"
                    />
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-blue-600 mt-1 bg-blue-50 px-4 py-2 rounded-full inline-flex items-center hover:bg-blue-100 transition-colors duration-200"
                      >
                        <Icon icon="heroicons:camera" className="h-4 w-4 mr-2" />
                        {profileImage ? 'Change image' : "Upload profile picture"}
                      </button>
                      {profileImage && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center">
                          <Icon icon="heroicons:document" className="h-3 w-3 mr-1" />
                          {profileImage.name.length > 25 ? profileImage.name.substring(0, 22) + '...' : profileImage.name}
                          ({(profileImage.size / 1024).toFixed(1)}KB)
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Recommended: Square image, max 5MB (JPG, PNG, GIF)
                      </p>
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="group">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Icon icon="heroicons:user" className="h-4 w-4 mr-1 text-blue-500" />
                        Full Name
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={`block w-full px-4 py-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300 ${nameError ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                          placeholder="Your full name"
                        />
                        {nameError && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <Icon icon="heroicons:exclamation-circle" className="h-4 w-4 mr-1" />
                            {nameError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="group">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Icon icon="heroicons:envelope" className="h-4 w-4 mr-1 text-blue-500" />
                        Email Address
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`block w-full px-4 py-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300 ${emailError ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                          placeholder="Your email address"
                        />
                        {emailError && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <Icon icon="heroicons:exclamation-circle" className="h-4 w-4 mr-1" />
                            {emailError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="group">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Icon icon="heroicons:phone" className="h-4 w-4 mr-1 text-blue-500" />
                        Phone Number
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`block w-full px-4 py-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300 ${phoneError ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                          placeholder="Your phone number (optional)"
                        />
                        {phoneError && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <Icon icon="heroicons:exclamation-circle" className="h-4 w-4 mr-1" />
                            {phoneError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="group sm:col-span-2">
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Icon icon="heroicons:document-text" className="h-4 w-4 mr-1 text-blue-500" />
                        Bio
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <textarea
                          name="bio"
                          id="bio"
                          rows={4}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className={`block w-full px-4 py-3 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300 ${bioError ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                          placeholder="Tell us about yourself (optional)"
                        />
                        {bioError && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <Icon icon="heroicons:exclamation-circle" className="h-4 w-4 mr-1" />
                            {bioError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {isEditing && (
                <div className="px-6 py-4 bg-gray-50 sm:px-8 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-md text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    {saveLoading ? (
                      <>
                        <Icon icon="eos-icons:loading" className="animate-spin h-5 w-5 mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icon icon="heroicons:check" className="h-5 w-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Settings Card */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center">
                <Icon icon="heroicons:cog-6-tooth" className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">Manage your account preferences</p>
            </div>
            <div>
              <dl>
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <Icon icon="heroicons:key" className="h-5 w-5 text-gray-400 mr-2" />
                    <dt className="text-sm font-medium text-gray-700">Password</dt>
                  </div>
                  <dd className="text-sm text-gray-900 flex items-center justify-end">
                    <span className="mr-3">••••••••</span>
                    <button
                      onClick={() => setIsChangePasswordModalOpen(true)}
                      className="font-medium text-blue-600 hover:text-blue-500 inline-flex items-center group transition-all duration-200"
                    >
                      <span>Change</span>
                      <Icon icon="heroicons:arrow-right" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                  </dd>
                </div>
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <Icon icon="heroicons:check-badge" className="h-5 w-5 text-gray-400 mr-2" />
                    <dt className="text-sm font-medium text-gray-700">Account Status</dt>
                  </div>
                  <dd className="text-sm text-gray-900">
                    <span className="px-3 py-1 inline-flex items-center text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      <Icon icon="heroicons:check-circle" className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  </dd>
                </div>
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <Icon icon="heroicons:calendar" className="h-5 w-5 text-gray-400 mr-2" />
                    <dt className="text-sm font-medium text-gray-700">Account Created</dt>
                  </div>
                  <dd className="text-sm text-gray-900">
                    {new Date().toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center">
                <Icon icon="heroicons:exclamation-triangle" className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Danger Zone</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">Irreversible account actions</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="mb-4 sm:mb-0">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center">
                    <Icon icon="heroicons:trash" className="h-4 w-4 text-red-500 mr-1" />
                    Delete Account
                  </h3>
                  <div className="mt-1 text-sm text-gray-500">
                    <p>Once you delete your account, there is no going back. Please be certain.</p>
                  </div>
                </div>
                <div className="sm:ml-6 sm:flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 hover:shadow-lg"
                  >
                    <Icon icon="heroicons:trash" className="h-4 w-4 mr-2" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
}
