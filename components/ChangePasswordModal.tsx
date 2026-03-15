"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setSuccess(true);
      window.setTimeout(() => {
        onClose();
      }, 1500);
    } catch (changePasswordError) {
      setError(
        changePasswordError instanceof Error
          ? changePasswordError.message
          : "Failed to change password.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center">
        <button
          type="button"
          className="fixed inset-0 bg-[rgba(32,33,36,0.38)]"
          onClick={onClose}
          aria-label="Close password dialog"
        />

        <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-white text-left shadow-[0_24px_80px_rgba(60,64,67,0.3)]">
          <div className="border-b border-[#edf1f7] px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                <Icon icon="heroicons:key" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-[#202124]">Change password</h2>
                <p className="mt-1 text-sm leading-6 text-[#5f6368]">
                  Update the password for your credentials account.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-2xl border border-[#f9dedc] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-[#c4eed0] bg-[#e6f4ea] px-4 py-3 text-sm text-[#137333]">
                Password changed successfully.
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#202124]">Current password</span>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 pr-12 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#5f6368]"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                >
                  <Icon
                    icon={showCurrentPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#202124]">New password</span>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 pr-12 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#5f6368]"
                  onClick={() => setShowNewPassword((current) => !current)}
                >
                  <Icon
                    icon={showNewPassword ? "heroicons:eye-slash" : "heroicons:eye"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#202124]">Confirm new password</span>
              <input
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 text-[15px] text-[#202124] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8]"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#dadce0] px-5 text-sm font-medium text-[#202124] transition hover:bg-[#f8f9fa]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9bbcf2]"
              >
                {loading ? (
                  <Icon icon="eos-icons:loading" className="h-5 w-5 animate-spin" />
                ) : (
                  "Change password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
