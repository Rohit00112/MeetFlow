"use client";

import Navbar from "@/components/Navbar";
import Image, { StaticImageData } from "next/image";
import Image1 from "@/public/slider1.png";
import Image2 from "@/public/slider2.png";
import Image3 from "@/public/slider3.png";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import React, { useState } from "react";
import { useAppSelector } from "@/redux/hooks";
// Removed ProtectedRoute import as we're using ReduxProtectedLayout

interface ImageProps {
  src: StaticImageData;
  alt: string;
  title: string;
  description: string;
}

const images: ImageProps[] = [
  {
    src: Image1,
    alt: "MeetFlow Security",
    title: "Your meeting is safe",
    description:
      "No one can join a meeting unless invited or admitted by the host",
  },
  {
    src: Image3,
    alt: "MeetFlow Planning",
    title: "Plan ahead",
    description:
      "Click New Meeting to schedule meetings in Google Calendar and send invites to participants",
  },
  {
    src: Image2,
    alt: "MeetFlow Sharing",
    title: "Get a link you can share",
    description:
      "Click New Meeting to get a link you can send to people that you want to meet with",
  },
];

// Custom hook for smooth scrolling
const useSlider = (totalItems: number, initialIndex = 0) => {
  const [index, setIndex] = React.useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const goToSlide = React.useCallback((newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 700); // Match transition duration
  }, [isTransitioning]);

  const nextSlide = React.useCallback(() => {
    const newIndex = index === totalItems - 1 ? 0 : index + 1;
    goToSlide(newIndex);
  }, [index, totalItems, goToSlide]);

  const prevSlide = React.useCallback(() => {
    const newIndex = index === 0 ? totalItems - 1 : index - 1;
    goToSlide(newIndex);
  }, [index, totalItems, goToSlide]);

  return { index, isTransitioning, nextSlide, prevSlide, goToSlide };
};

// ImageSlider Component
const ImageSlider = ({ images, onImageChange }: { images: ImageProps[], onImageChange?: (image: ImageProps) => void }) => {
  const { index, isTransitioning, nextSlide, prevSlide, goToSlide } = useSlider(images.length);

  // Update the parent slide state when index changes
  React.useEffect(() => {
    if (onImageChange) onImageChange(images[index]);
  }, [index, images, onImageChange]);

  const handleNext = () => {
    nextSlide();
  };

  const handlePrev = () => {
    prevSlide();
  };

  const handleDotClick = (i: number) => {
    if (i === index) return;
    goToSlide(i);
  };

  // Initial setup is handled by the index effect above

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrev}
          aria-label="Previous Image"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 z-10"
          disabled={isTransitioning}
        >
          <Icon icon="akar-icons:chevron-left" className="w-6 h-6" />
        </button>
        <div className="relative w-56 h-56 overflow-hidden rounded-full image-slider-container">
          <div
            className="absolute w-full h-full transition-transform duration-700"
            style={{
              transform: `translateX(-${index * (100 / images.length)}%)`,
              width: `${images.length * 100}%`,
              display: 'flex',
              willChange: 'transform'
            }}
          >
            {images.map((image, i) => (
              <div
                key={i}
                className="relative w-full h-full flex-shrink-0 image-slider-item"
                style={{ width: `${100 / images.length}%` }}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleNext}
          aria-label="Next Image"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 z-10"
          disabled={isTransitioning}
        >
          <Icon icon="akar-icons:chevron-right" className="w-6 h-6" />
        </button>
      </div>
      <div className="flex gap-2 mt-4">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            aria-label={`Select Image ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === index ? "bg-blue-600 w-4" : "bg-gray-300"
            }`}
            disabled={isTransitioning}
          />
        ))}
      </div>
    </div>
  );
};

// Simple Dropdown Menu Component
const SimpleDropdown = ({
  isOpen,
}: {
  isOpen: boolean;
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      className={`absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg py-1 w-64 border border-gray-200 z-50 transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <button className="w-full flex items-center gap-3 hover:bg-gray-100 px-4 py-3 text-sm text-gray-700 modal-option">
        <Icon icon="material-symbols:link-rounded" width="20" height="20" />
        <span>Create a meeting for later</span>
      </button>
      <button
        className="w-full flex items-center gap-3 hover:bg-gray-100 px-4 py-3 text-sm text-gray-700 modal-option"
        onClick={() => {
          window.location.href = "/meeting";
        }}
      >
        <Icon icon="ic:baseline-plus" width="20" height="20" />
        <span>Start an instant meeting</span>
      </button>
      <button className="w-full flex items-center gap-3 hover:bg-gray-100 px-4 py-3 text-sm text-gray-700 modal-option">
        <Icon icon="lucide:calendar" width="20" height="20" />
        <span>Schedule in Google Calendar</span>
      </button>
    </div>
  );
};

// Debug component to show state
const DebugInfo = ({ isOpen }: { isOpen: boolean }) => {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-[1000]">
      Dropdown state: {isOpen ? 'OPEN' : 'CLOSED'}
    </div>
  );
};

export default function Home() {
  const { user } = useAppSelector((state) => state.auth);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentSlide, setCurrentSlide] = useState<ImageProps>(images[0]);
  const [isClient, setIsClient] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // This effect runs only on the client side
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Log state changes
  React.useEffect(() => {
    console.log('Dropdown state changed:', isDropdownOpen);
  }, [isDropdownOpen]);

  // Add click outside handler
  React.useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <>
      <DebugInfo isOpen={isDropdownOpen} />
      <Navbar />
      <main className="px-4 md:px-6 mt-20 md:mt-52 ml-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl leading-tight">
              Video calls and meetings for everyone
            </h1>
            <p className="text-xl md:text-2xl text-gray-600">
              Connect, collaborate, and celebrate from anywhere with Google Meet
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isClient && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => {
                      console.log('Button clicked, current state:', isDropdownOpen);
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                    aria-label="Open meeting options"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                  >
                    <Icon icon="ri:video-add-line" className="w-5 h-5" />
                    New Meeting
                  </button>
                  <SimpleDropdown
                    isOpen={isDropdownOpen}
                  />
                </div>
              ) : (
                <Link href="/auth/login">
                  <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                    <Icon icon="ri:video-add-line" className="w-5 h-5" />
                    New Meeting
                  </button>
                </Link>
              )}
              <div className="flex items-center gap-2 border-2 border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-600">
                <Icon
                  icon="material-symbols:keyboard-outline"
                  className="w-5 h-5 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Enter a code or link"
                  className="flex-1 outline-none text-gray-700"
                  aria-label="Meeting code"
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div className="mt-3">
                <Link href="/join" legacyBehavior>
                  <a
                    className={`text-blue-600 ${
                      !inputValue
                        ? "pointer-events-none text-gray-600 opacity-50"
                        : "hover:underline"
                    }`}
                  >
                    Join
                  </a>
                </Link>
              </div>
            </div>
            <hr className="border-t border-gray-600" />
            <p className="text-xs">
              <Link href="/learn-more" legacyBehavior>
                <a className="text-blue-600 hover:underline">Learn more</a>
              </Link>{" "}
              about Google Meet
            </p>
          </div>

          <div className="flex flex-col items-center text-center space-y-6">
            <ImageSlider
              images={images}
              onImageChange={setCurrentSlide}
            />
            <div className="max-w-md space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">
                {currentSlide.title}
              </h2>
              <p className="text-gray-600">{currentSlide.description}</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
