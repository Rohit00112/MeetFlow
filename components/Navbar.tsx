"use client";

import Image from "next/image";
import { Icon } from "@iconify/react";
import Logo from "@/public/logo.png";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { logout } from "@/redux/slices/authSlice";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

// Separate time formatting logic
const getFormattedDateTime = (): string => {
  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
  const day = now.toLocaleDateString("en-US", { day: "numeric" });
  const month = now.toLocaleDateString("en-US", { month: "short" });

  return `${time} • ${weekday} ${day} ${month}`;
};

// Define icon props type
interface IconProps {
  icon: string;
  size?: number;
}

// Reusable Icon component
const NavIcon = ({ icon, size = 24 }: IconProps) => (
  <Icon icon={icon} width={size} height={size} />
);

const Navbar = () => {
  const { user, loading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // This effect runs only on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await dispatch(logout());
    setDropdownOpen(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'A';

    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <nav className="flex justify-between p-4 text-[#5F6367]">
      <div className="flex items-center">
        <Link href="/">
          <div className="flex items-center">
            <Image
              src={Logo}
              alt="MeetFlow Logo"
              width={120}
              height={120}
              priority
            />
            <span className="ml-1 mb-1 text-2xl">Meet</span>
          </div>
        </Link>
      </div>

      <div className="flex gap-14">
        <div className="flex gap-6 items-center">
          <time>{getFormattedDateTime()}</time>
          <NavIcon icon="akar-icons:question" />
          <NavIcon icon="octicon:report-24" />
          <NavIcon icon="mdi:settings" />
        </div>

        <div className="flex gap-3 items-center">
          <NavIcon icon="mage:dots-menu" />

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : isClient && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:opacity-90 transition-colors overflow-hidden"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
                    <span className="text-sm font-bold">{getUserInitials()}</span>
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                    <div className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      Your Profile
                    </div>
                  </Link>

                  <Link href="/settings" onClick={() => setDropdownOpen(false)}>
                    <div className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      Settings
                    </div>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login">
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm">
                <NavIcon icon="heroicons:login" size={16} />
                Sign in
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
