"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useAppSelector } from "@/redux/hooks";

const MeetingPage = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Your Meeting Room</h1>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                <Icon icon="heroicons:phone-x-mark" className="w-5 h-5" />
                End Meeting
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center text-white">
                <Icon icon="heroicons:video-camera" className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl">Your camera is off</p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Turn on camera
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Meeting Info</h2>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Icon icon="heroicons:link" className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">meet.google.com/abc-defg-hij</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon icon="heroicons:clock" className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">Started at {new Date().toLocaleTimeString()}</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Participants (1)</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <span>{user?.name || 'You'} (Host)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-gray-500 hover:text-gray-700">
                        <Icon icon="heroicons:microphone-slash" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:microphone" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:video-camera" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:computer-desktop" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
              <Icon icon="heroicons:chat-bubble-left-right" className="w-6 h-6" />
            </button>
            <button className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors">
              <Icon icon="heroicons:phone-x-mark" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default MeetingPage;
