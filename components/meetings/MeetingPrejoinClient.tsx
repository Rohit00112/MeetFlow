"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react/dist/iconify.js";
import { getInitials, resolveAvatar } from "@/lib/avatar";
import { buildMeetingRoomPath, formatMeetingSchedule } from "@/lib/meetings";
import { createMeetingRoomParams, prejoinStorageKeys } from "@/lib/prejoin";
import type { MeetingDetail } from "@/lib/types/meetings";

type MediaPermissionState = "idle" | "granted" | "denied" | "unsupported";

interface MeetingPrejoinClientProps {
  meetingCode: string | null;
  meeting: MeetingDetail | null;
  viewerName?: string | null;
}

function DeviceSelect({
  label,
  value,
  disabled,
  options,
  onChange,
  emptyLabel,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  options: MediaDeviceInfo[];
  onChange: (value: string) => void;
  emptyLabel: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#3c4043]">{label}</span>
      <select
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#dadce0] bg-white px-4 text-sm text-[#202124] outline-none transition focus:border-[#1a73e8] focus:ring-4 focus:ring-[#d2e3fc] disabled:cursor-not-allowed disabled:bg-[#f8f9fa] disabled:text-[#9aa0a6]"
      >
        {options.length === 0 ? (
          <option value="">{emptyLabel}</option>
        ) : null}
        {options.map((option, index) => (
          <option key={option.deviceId || `${option.kind}-${index}`} value={option.deviceId}>
            {option.label || `${label} ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function describePermissionState(permissionState: MediaPermissionState) {
  switch (permissionState) {
    case "granted":
      return "Camera and microphone preview is ready.";
    case "denied":
      return "Browser access is blocked. Allow camera and microphone permissions to preview devices.";
    case "unsupported":
      return "This browser does not expose media device controls.";
    default:
      return "Choose what you want to share before you join.";
  }
}

function describeMediaError(
  error: unknown,
  cameraEnabled: boolean,
  microphoneEnabled: boolean,
) {
  if (!(error instanceof DOMException)) {
    return "We couldn't start your preview. Check your browser and device settings, then try again.";
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Browser access is blocked. Allow camera and microphone permissions to preview devices.";
  }

  if (error.name === "NotFoundError") {
    if (cameraEnabled && microphoneEnabled) {
      return "No matching camera or microphone was found on this device.";
    }

    if (cameraEnabled) {
      return "No matching camera was found on this device.";
    }

    return "No matching microphone was found on this device.";
  }

  if (error.name === "NotReadableError") {
    return "Your camera or microphone is being used by another app.";
  }

  return "We couldn't start your preview. Check your browser and device settings, then try again.";
}

export default function MeetingPrejoinClient({
  meetingCode,
  meeting,
  viewerName,
}: MeetingPrejoinClientProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previewRequestRef = useRef(0);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [permissionState, setPermissionState] = useState<MediaPermissionState>("idle");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);

  const attendeePreview = meeting?.attendees.slice(0, 4) || [];
  const participantCount = (meeting?.attendeeCount || 0) + 1;
  const setupLabel = meeting ? "Ready to join?" : "Check your setup";
  const joinLabel = meeting ? "Join now" : meetingCode ? "Meeting not found" : "Enter a meeting code";
  const previewName = viewerName || "You";
  const hostName = meeting?.host.name || "MeetFlow host";
  const hostAvatar = meeting ? resolveAvatar(meeting.host) : resolveAvatar({ name: hostName });

  const stopAudioMeter = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setMicrophoneLevel(0);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setPermissionState("unsupported");
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const nextCameras = devices.filter((device) => device.kind === "videoinput");
    const nextMicrophones = devices.filter((device) => device.kind === "audioinput");

    setCameraDevices(nextCameras);
    setMicrophoneDevices(nextMicrophones);

    if (!selectedCameraId || !nextCameras.some((device) => device.deviceId === selectedCameraId)) {
      setSelectedCameraId(nextCameras[0]?.deviceId || "");
    }

    if (
      !selectedMicrophoneId ||
      !nextMicrophones.some((device) => device.deviceId === selectedMicrophoneId)
    ) {
      setSelectedMicrophoneId(nextMicrophones[0]?.deviceId || "");
    }
  }, [selectedCameraId, selectedMicrophoneId]);

  const stopPreview = useCallback(() => {
    previewRequestRef.current += 1;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }

    stopAudioMeter();
    setHasVideoTrack(false);
    setHasAudioTrack(false);
  }, [stopAudioMeter]);

  const attachAudioMeter = useCallback(
    (stream: MediaStream) => {
    stopAudioMeter();

    const [audioTrack] = stream.getAudioTracks();
    if (!audioTrack) {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;

    const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = context;

    const updateLevel = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length / 255;
      setMicrophoneLevel(average);
      animationFrameRef.current = window.requestAnimationFrame(updateLevel);
    };

    void context.resume().catch(() => undefined);
    updateLevel();
    },
    [stopAudioMeter],
  );

  const startPreview = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setLoadingPreview(false);
      return;
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }

    stopAudioMeter();

    if (!cameraEnabled && !microphoneEnabled) {
      setLoadingPreview(false);
      setDeviceError(null);
      setPermissionState("idle");
      setHasVideoTrack(false);
      setHasAudioTrack(false);
      return;
    }

    setLoadingPreview(true);
    setDeviceError(null);

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    };

    if (selectedCameraId) {
      videoConstraints.deviceId = { exact: selectedCameraId };
    }

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    if (selectedMicrophoneId) {
      audioConstraints.deviceId = { exact: selectedMicrophoneId };
    }

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled ? videoConstraints : false,
          audio: microphoneEnabled ? audioConstraints : false,
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          (error.name === "OverconstrainedError" || error.name === "NotFoundError")
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: cameraEnabled,
            audio: microphoneEnabled,
          });
        } else {
          throw error;
        }
      }

      if (previewRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setHasVideoTrack(stream.getVideoTracks().length > 0);
      setHasAudioTrack(stream.getAudioTracks().length > 0);

      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => undefined);
      }

      setPermissionState("granted");
      await refreshDevices();

      if (microphoneEnabled) {
        attachAudioMeter(stream);
      } else {
        setMicrophoneLevel(0);
      }
    } catch (error) {
      if (previewRequestRef.current !== requestId) {
        return;
      }

      setHasVideoTrack(false);
      setHasAudioTrack(false);
      setPermissionState(
        error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
          ? "denied"
          : "idle",
      );
      setDeviceError(describeMediaError(error, cameraEnabled, microphoneEnabled));
    } finally {
      if (previewRequestRef.current === requestId) {
        setLoadingPreview(false);
      }
    }
  }, [
    attachAudioMeter,
    cameraEnabled,
    microphoneEnabled,
    refreshDevices,
    selectedCameraId,
    selectedMicrophoneId,
    stopAudioMeter,
  ]);

  useEffect(() => {
    const savedCameraEnabled = window.localStorage.getItem(prejoinStorageKeys.cameraEnabled);
    const savedMicrophoneEnabled = window.localStorage.getItem(prejoinStorageKeys.microphoneEnabled);
    const savedCameraId = window.localStorage.getItem(prejoinStorageKeys.cameraId);
    const savedMicrophoneId = window.localStorage.getItem(prejoinStorageKeys.microphoneId);

    if (savedCameraEnabled !== null) {
      setCameraEnabled(savedCameraEnabled === "true");
    }

    if (savedMicrophoneEnabled !== null) {
      setMicrophoneEnabled(savedMicrophoneEnabled === "true");
    }

    if (savedCameraId) {
      setSelectedCameraId(savedCameraId);
    }

    if (savedMicrophoneId) {
      setSelectedMicrophoneId(savedMicrophoneId);
    }

    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    window.localStorage.setItem(prejoinStorageKeys.cameraEnabled, String(cameraEnabled));
    window.localStorage.setItem(prejoinStorageKeys.microphoneEnabled, String(microphoneEnabled));
    window.localStorage.setItem(prejoinStorageKeys.cameraId, selectedCameraId);
    window.localStorage.setItem(prejoinStorageKeys.microphoneId, selectedMicrophoneId);
  }, [
    cameraEnabled,
    microphoneEnabled,
    preferencesReady,
    selectedCameraId,
    selectedMicrophoneId,
  ]);

  useEffect(() => {
    void refreshDevices();

    if (!navigator.mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    void startPreview();

    return () => {
      stopPreview();
    };
  }, [preferencesReady, startPreview, stopPreview]);

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top,#eef4ff_0,#f8fafd_36%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1320px] gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(32,33,36,0.12)] backdrop-blur md:p-7">
          <div className="flex flex-col gap-5 border-b border-[#eef0f1] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#1a73e8]">{setupLabel}</p>
              <h1 className="mt-2 text-[28px] font-normal leading-tight text-[#202124] sm:text-[36px]">
                Set up your camera and microphone before you join
              </h1>
              <p className="mt-3 max-w-[680px] text-[15px] leading-6 text-[#5f6368]">
                Check your preview, switch devices, and decide whether to join with audio or
                video before you enter the call.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f1f3f4] px-4 py-2 text-sm font-medium text-[#3c4043]">
              <Icon icon="material-symbols:lock-outline-rounded" className="h-5 w-5 text-[#1a73e8]" />
              <span>{meetingCode || "No meeting code selected"}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="relative overflow-hidden rounded-[28px] bg-[#202124] shadow-[0_20px_50px_rgba(32,33,36,0.22)]">
                <div className="relative aspect-video">
                  {hasVideoTrack ? (
                    <video
                      ref={previewRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover [transform:scaleX(-1)]"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#2a2b2d_0,#202124_58%,#17181a_100%)] px-6 text-center text-white">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-medium">
                        {getInitials(previewName)}
                      </div>
                      <p className="mt-5 text-[26px] font-normal">{previewName}</p>
                      <p className="mt-2 max-w-[360px] text-sm leading-6 text-white/70">
                        {cameraEnabled
                          ? "Turn your camera on to preview how you’ll appear in the meeting."
                          : "You’ll join with camera off. You can turn it on any time after joining."}
                      </p>
                    </div>
                  )}

                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#202124]/85 px-3 py-2 text-xs font-medium text-white backdrop-blur">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        permissionState === "granted"
                          ? "bg-[#34a853]"
                          : permissionState === "denied"
                            ? "bg-[#ea4335]"
                            : "bg-[#fbbc04]"
                      }`}
                    />
                    <span>{describePermissionState(permissionState)}</span>
                  </div>

                  <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#202124]/85 px-3 py-2 text-xs font-medium text-white backdrop-blur">
                    <Icon
                      icon={cameraEnabled ? "heroicons:video-camera" : "heroicons:video-camera-slash"}
                      className="h-4 w-4"
                    />
                    <span>{cameraEnabled ? "Camera on" : "Camera off"}</span>
                  </div>

                  {loadingPreview ? (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/15 to-transparent pb-6 pt-16">
                      <div className="inline-flex items-center gap-3 rounded-full bg-white/12 px-4 py-2 text-sm text-white backdrop-blur">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#8ab4f8]" />
                        <span>Loading device preview</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#eef0f1] bg-[#fbfcff] px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMicrophoneEnabled((current) => !current)}
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-full transition ${
                      microphoneEnabled
                        ? "bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc]"
                        : "bg-[#fce8e6] text-[#d93025] hover:bg-[#fad2cf]"
                    }`}
                  >
                    <Icon
                      icon={
                        microphoneEnabled ? "heroicons:microphone" : "heroicons:microphone-slash"
                      }
                      className="h-6 w-6"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraEnabled((current) => !current)}
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-full transition ${
                      cameraEnabled
                        ? "bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc]"
                        : "bg-[#fce8e6] text-[#d93025] hover:bg-[#fad2cf]"
                    }`}
                  >
                    <Icon
                      icon={
                        cameraEnabled
                          ? "heroicons:video-camera"
                          : "heroicons:video-camera-slash"
                      }
                      className="h-6 w-6"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => void startPreview()}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-[#dadce0] px-4 text-sm font-medium text-[#3c4043] transition hover:border-[#c7c9cc] hover:bg-white"
                  >
                    <Icon icon="material-symbols:refresh-rounded" className="h-5 w-5" />
                    <span>Retry preview</span>
                  </button>
                </div>

                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center justify-between text-sm text-[#5f6368]">
                    <span>Microphone level</span>
                    <span>{microphoneEnabled && hasAudioTrack ? "Listening" : "Muted"}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8eaed]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-150 ${
                        microphoneEnabled && hasAudioTrack ? "bg-[#34a853]" : "bg-[#c6c9cc]"
                      }`}
                      style={{
                        width:
                          microphoneEnabled && hasAudioTrack
                            ? `${Math.max(8, Math.round(microphoneLevel * 100))}%`
                            : "14%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {deviceError ? (
                <div className="mt-4 rounded-[24px] border border-[#f6c7c3] bg-[#fef7f6] px-5 py-4 text-sm leading-6 text-[#b3261e]">
                  {deviceError}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#eef0f1] bg-white p-5 shadow-[0_12px_30px_rgba(32,33,36,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[#e8f0fe]">
                    <Image src={hostAvatar} alt={hostName} fill className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                      Hosted by
                    </p>
                    <p className="truncate text-[17px] font-medium text-[#202124]">{hostName}</p>
                    <p className="truncate text-sm text-[#5f6368]">
                      {meeting?.host.email || "Meeting details available after scheduling"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                      Meeting
                    </p>
                    <h2 className="mt-1 text-[22px] font-normal leading-tight text-[#202124]">
                      {meeting?.title || "Meeting details unavailable"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                      {meeting
                        ? formatMeetingSchedule(meeting.startTime, meeting.endTime)
                        : meetingCode
                          ? "We’ll still let you continue with this meeting code."
                          : "Enter a meeting code from the home page or open a scheduled meeting."}
                    </p>
                    {meeting?.description ? (
                      <p className="mt-3 text-sm leading-6 text-[#5f6368]">{meeting.description}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                        Participants
                      </p>
                      <p className="mt-1 text-lg font-medium text-[#202124]">{participantCount}</p>
                    </div>
                    <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                        Passcode
                      </p>
                      <p className="mt-1 text-lg font-medium text-[#202124]">
                        {meeting?.passcode || "Not required"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    disabled={!meetingCode || !meeting}
                    onClick={() =>
                      meetingCode &&
                      meeting &&
                      router.push(
                        buildMeetingRoomPath(
                          meetingCode,
                          createMeetingRoomParams({
                            cameraEnabled,
                            microphoneEnabled,
                            selectedCameraId,
                            selectedMicrophoneId,
                          }),
                        ),
                      )
                    }
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#d2e3fc] disabled:text-[#5f6368]"
                  >
                    {joinLabel}
                  </button>
                  <Link
                    href="/"
                    className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#dadce0] px-6 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
                  >
                    Back to home
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#eef0f1] bg-white p-5 shadow-[0_12px_30px_rgba(32,33,36,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-[#202124]">Devices</h3>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      Your selections are remembered on this device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshDevices()}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dadce0] px-4 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
                  >
                    <Icon icon="material-symbols:refresh-rounded" className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <DeviceSelect
                    label="Microphone"
                    value={selectedMicrophoneId}
                    options={microphoneDevices}
                    onChange={setSelectedMicrophoneId}
                    emptyLabel="No microphone detected"
                    disabled={permissionState === "unsupported"}
                  />
                  <DeviceSelect
                    label="Camera"
                    value={selectedCameraId}
                    options={cameraDevices}
                    onChange={setSelectedCameraId}
                    emptyLabel="No camera detected"
                    disabled={permissionState === "unsupported"}
                  />
                </div>
              </div>

              <div className="rounded-[28px] bg-[#e8f0fe] p-5 text-[#174ea6] shadow-[0_12px_30px_rgba(26,115,232,0.12)]">
                <div className="flex items-start gap-3">
                  <Icon icon="material-symbols:security-rounded" className="mt-0.5 h-5 w-5 flex-none" />
                  <div>
                    <h3 className="text-base font-medium">Before you join</h3>
                    <p className="mt-2 text-sm leading-6 text-[#365780]">
                      Check permissions, confirm your camera framing, and make sure your microphone
                      is muted if you’re joining a crowded room.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#eef0f1] bg-white p-5 shadow-[0_12px_30px_rgba(32,33,36,0.08)]">
                <h3 className="text-lg font-medium text-[#202124]">Invite list</h3>
                {attendeePreview.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {attendeePreview.map((attendee) => (
                      <div key={attendee.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#202124]">
                            {attendee.name || attendee.email}
                          </p>
                          <p className="truncate text-sm text-[#5f6368]">{attendee.email}</p>
                        </div>
                        <span className="rounded-full bg-[#f1f3f4] px-3 py-1 text-xs font-medium uppercase text-[#5f6368]">
                          {attendee.status.toLowerCase()}
                        </span>
                      </div>
                    ))}
                    {meeting && meeting.attendees.length > attendeePreview.length ? (
                      <p className="pt-1 text-sm text-[#5f6368]">
                        +{meeting.attendees.length - attendeePreview.length} more invited
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                    {meeting
                      ? "No attendees have been added yet."
                      : "Schedule a meeting to see the invite list here before you join."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
