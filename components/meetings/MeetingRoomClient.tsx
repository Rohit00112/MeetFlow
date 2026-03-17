"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isTrackReference,
  LiveKitRoom,
  RoomAudioRenderer,
  type TrackReferenceOrPlaceholder,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  ConnectionState,
  type Participant,
  Track,
  type AudioCaptureOptions,
  type VideoCaptureOptions,
} from "livekit-client";
import { getInitials } from "@/lib/avatar";
import { buildMeetingJoinPath, formatMeetingSchedule } from "@/lib/meetings";
import { parseMeetingRoomPreferences } from "@/lib/prejoin";
import type { LiveKitJoinTokenResponse } from "@/lib/types/livekit";
import type { MeetingDetail } from "@/lib/types/meetings";

interface MeetingRoomClientProps {
  meetingCode: string | null;
  meeting: MeetingDetail | null;
  viewerName?: string | null;
}

function formatConnectionState(connectionState: ConnectionState) {
  switch (connectionState) {
    case ConnectionState.Connected:
      return { label: "Connected", className: "bg-[#e6f4ea] text-[#137333]" };
    case ConnectionState.Connecting:
      return { label: "Connecting", className: "bg-[#e8f0fe] text-[#174ea6]" };
    case ConnectionState.Reconnecting:
      return { label: "Reconnecting", className: "bg-[#fef7e0] text-[#b06000]" };
    case ConnectionState.SignalReconnecting:
      return { label: "Restoring signal", className: "bg-[#fef7e0] text-[#b06000]" };
    default:
      return { label: "Disconnected", className: "bg-[#fce8e6] text-[#b3261e]" };
  }
}

function buildMediaFailureMessage(kind?: MediaDeviceKind) {
  if (kind === "videoinput") {
    return "We couldn't start the selected camera in the room.";
  }

  if (kind === "audioinput") {
    return "We couldn't start the selected microphone in the room.";
  }

  return "A media device failed to start when joining the room.";
}

function getGridColumnsClass(tileCount: number) {
  if (tileCount <= 1) {
    return "grid-cols-1";
  }

  if (tileCount === 2) {
    return "sm:grid-cols-2";
  }

  if (tileCount <= 4) {
    return "sm:grid-cols-2";
  }

  if (tileCount <= 6) {
    return "sm:grid-cols-2 xl:grid-cols-3";
  }

  return "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
}

function formatParticipantLabel(participant: Participant, viewerName?: string | null) {
  if (participant.isLocal) {
    return viewerName || participant.name || "You";
  }

  return participant.name || participant.identity;
}

function sortGridTracks(
  tracks: TrackReferenceOrPlaceholder[],
  viewerName?: string | null,
) {
  return [...tracks].sort((left, right) => {
    if (left.participant.isLocal !== right.participant.isLocal) {
      return left.participant.isLocal ? 1 : -1;
    }

    if (left.participant.isSpeaking !== right.participant.isSpeaking) {
      return left.participant.isSpeaking ? -1 : 1;
    }

    if (left.participant.isCameraEnabled !== right.participant.isCameraEnabled) {
      return left.participant.isCameraEnabled ? -1 : 1;
    }

    return formatParticipantLabel(left.participant, viewerName).localeCompare(
      formatParticipantLabel(right.participant, viewerName),
    );
  });
}

function MeetingParticipantTile({
  trackRef,
  viewerName,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  viewerName?: string | null;
}) {
  const participant = trackRef.participant;
  const displayName = formatParticipantLabel(participant, viewerName);
  const hasVideo = isTrackReference(trackRef);

  return (
    <article
      className={`group relative overflow-hidden rounded-[24px] border transition ${
        participant.isSpeaking
          ? "border-[#8ab4f8] shadow-[0_0_0_1px_rgba(138,180,248,0.75)]"
          : "border-white/10"
      } bg-[#2a2b2f]`}
    >
      <div className="relative aspect-video">
        {hasVideo ? (
          <VideoTrack
            trackRef={trackRef}
            className={`h-full w-full object-cover ${participant.isLocal ? "[transform:scaleX(-1)]" : ""}`}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#3b3d42_0,#292a2d_58%,#202124_100%)] px-6 text-center text-white">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-medium">
              {getInitials(displayName)}
            </div>
            <p className="mt-4 text-[22px] font-normal">{displayName}</p>
            <p className="mt-2 text-sm text-white/65">
              {participant.isCameraEnabled
                ? "Waiting for video"
                : participant.isLocal
                  ? "Your camera is off"
                  : "Camera is off"}
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-4 pt-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
              {participant.isSpeaking ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
              ) : null}
              <span className="truncate">{displayName}</span>
              {participant.isLocal ? <span className="text-white/70">(You)</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur ${
                participant.isMicrophoneEnabled
                  ? "bg-black/35 text-white"
                  : "bg-[#5f1d1a]/85 text-[#f28b82]"
              }`}
            >
              <Icon
                icon={
                  participant.isMicrophoneEnabled
                    ? "heroicons:microphone"
                    : "heroicons:microphone-slash"
                }
                className="h-4 w-4"
              />
            </span>
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur ${
                participant.isCameraEnabled
                  ? "bg-black/35 text-white"
                  : "bg-[#5f1d1a]/85 text-[#f28b82]"
              }`}
            >
              <Icon
                icon={
                  participant.isCameraEnabled
                    ? "heroicons:video-camera"
                    : "heroicons:video-camera-slash"
                }
                className="h-4 w-4"
              />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function MeetingRoomContent({
  meeting,
  viewerName,
  tokenState,
  mediaFailure,
}: {
  meeting: MeetingDetail;
  viewerName?: string | null;
  tokenState: {
    loading: boolean;
    error: string | null;
    participantIdentity?: string;
  };
  mediaFailure: string | null;
}) {
  const router = useRouter();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const rawCameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const cameraTracks = sortGridTracks(rawCameraTracks, viewerName);
  const remoteParticipants = participants.filter((participant) => !participant.isLocal);
  const connectionStatus = formatConnectionState(connectionState);
  const liveTileCount = Math.max(cameraTracks.length, 1);

  const leaveRoom = () => {
    startTransition(() => {
      router.push(buildMeetingJoinPath(meeting.meetingCode));
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-[28px] border border-[#eef0f1] bg-white p-5 shadow-[0_14px_36px_rgba(32,33,36,0.1)] md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${connectionStatus.className}`}
              >
                {connectionStatus.label}
              </span>
              <span className="inline-flex rounded-full bg-[#f1f3f4] px-3 py-1 text-xs font-medium text-[#3c4043]">
                {participants.length} in call
              </span>
              <span className="inline-flex rounded-full bg-[#f1f3f4] px-3 py-1 text-xs font-medium text-[#3c4043]">
                {meeting.meetingCode}
              </span>
            </div>
            <h1 className="mt-3 truncate text-[28px] font-normal text-[#202124]">
              {meeting.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">
              {formatMeetingSchedule(meeting.startTime, meeting.endTime)}
            </p>
          </div>

          <button
            type="button"
            onClick={leaveRoom}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ea4335] px-5 text-sm font-medium text-white transition hover:bg-[#d93025]"
          >
            <Icon icon="heroicons:phone-x-mark" className="h-5 w-5" />
            <span>Leave call</span>
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-[#2b2c2f] bg-[#202124] p-4 shadow-[0_24px_60px_rgba(32,33,36,0.24)] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#303236_0,#202124_58%,#17181a_100%)]" />
          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-sm font-medium text-white/80">
                Participant grid
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {liveTileCount} tile{liveTileCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {isMicrophoneEnabled ? "Mic on" : "Mic off"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {isCameraEnabled ? "Camera on" : "Camera off"}
                </span>
              </div>
            </div>

            <div className={`grid gap-4 ${getGridColumnsClass(liveTileCount)}`}>
              {cameraTracks.length > 0 ? (
                cameraTracks.map((trackRef) => (
                  <MeetingParticipantTile
                    key={`${trackRef.participant.identity}-${trackRef.source}`}
                    trackRef={trackRef}
                    viewerName={viewerName}
                  />
                ))
              ) : (
                <article className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#2a2b2f]">
                  <div className="flex aspect-video items-center justify-center px-6 text-center text-white">
                    <div>
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-medium">
                        {getInitials(viewerName || meeting.host.name)}
                      </div>
                      <p className="mt-4 text-[22px] font-normal">{viewerName || meeting.host.name}</p>
                      <p className="mt-2 text-sm text-white/65">
                        Waiting for your local participant to join the room.
                      </p>
                    </div>
                  </div>
                </article>
              )}
            </div>

            {tokenState.loading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/35 backdrop-blur-sm">
                <div className="rounded-full bg-white/12 px-4 py-2 text-sm text-white">
                  Connecting to LiveKit room
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[26px] border border-[#eef0f1] bg-white p-5 shadow-[0_14px_36px_rgba(32,33,36,0.1)]">
          <h3 className="text-lg font-medium text-[#202124]">Room snapshot</h3>
          <p className="mt-1 text-sm text-[#5f6368]">
            LiveKit tracks who is actually connected. This stays separate from the invite list.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                Connected now
              </p>
              <p className="mt-1 text-2xl font-medium text-[#202124]">{participants.length}</p>
            </div>
            <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                Participant identity
              </p>
              <p className="mt-1 truncate text-sm font-medium text-[#202124]">
                {tokenState.participantIdentity || localParticipant.identity}
              </p>
            </div>
            <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                Invitees
              </p>
              <p className="mt-1 text-2xl font-medium text-[#202124]">{meeting.attendeeCount}</p>
            </div>
            <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                Remote participants
              </p>
              <p className="mt-1 text-2xl font-medium text-[#202124]">
                {remoteParticipants.length}
              </p>
            </div>
          </div>

          {tokenState.error ? (
            <div className="mt-5 rounded-[22px] border border-[#f6c7c3] bg-[#fef7f6] px-4 py-3 text-sm leading-6 text-[#b3261e]">
              {tokenState.error}
            </div>
          ) : null}

          {mediaFailure ? (
            <div className="mt-5 rounded-[22px] border border-[#fde293] bg-[#fff8e1] px-4 py-3 text-sm leading-6 text-[#8a5800]">
              {mediaFailure}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <h4 className="text-sm font-medium uppercase tracking-[0.14em] text-[#5f6368]">
              Present now
            </h4>
            <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f8fafd] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#202124]">
                  {viewerName || meeting.host.name}
                </p>
                <p className="truncate text-xs uppercase tracking-[0.12em] text-[#5f6368]">
                  Local participant
                </p>
              </div>
              <span className="rounded-full bg-[#e6f4ea] px-3 py-1 text-xs font-medium text-[#137333]">
                You
              </span>
            </div>
            {remoteParticipants.length > 0 ? (
              remoteParticipants.map((participant) => (
                <div
                  key={participant.identity}
                  className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f8fafd] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#202124]">
                      {participant.name || participant.identity}
                    </p>
                    <p className="truncate text-xs uppercase tracking-[0.12em] text-[#5f6368]">
                      {participant.isCameraEnabled ? "Camera live" : "Camera off"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e8f0fe] px-3 py-1 text-xs font-medium text-[#174ea6]">
                    Live
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#dadce0] px-4 py-4 text-sm leading-6 text-[#5f6368]">
                No one else is connected yet. As other participants join, new tiles appear in the
                grid immediately.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[26px] border border-[#eef0f1] bg-white p-5 shadow-[0_14px_36px_rgba(32,33,36,0.1)]">
          <h3 className="text-lg font-medium text-[#202124]">Meeting details</h3>
          <div className="mt-4 space-y-3 text-sm text-[#5f6368]">
            <p className="flex items-center gap-2">
              <Icon icon="heroicons:link" className="h-5 w-5 text-[#1a73e8]" />
              <span>{meeting.meetingCode}</span>
            </p>
            <p className="flex items-center gap-2">
              <Icon icon="heroicons:user-circle" className="h-5 w-5 text-[#1a73e8]" />
              <span>{meeting.host.name} (Host)</span>
            </p>
            <p className="flex items-center gap-2">
              <Icon icon="heroicons:clock" className="h-5 w-5 text-[#1a73e8]" />
              <span>{formatMeetingSchedule(meeting.startTime, meeting.endTime)}</span>
            </p>
            {meeting.passcode ? (
              <p className="flex items-center gap-2">
                <Icon icon="heroicons:lock-closed" className="h-5 w-5 text-[#1a73e8]" />
                <span>Passcode: {meeting.passcode}</span>
              </p>
            ) : null}
          </div>

          {meeting.description ? (
            <p className="mt-5 text-sm leading-6 text-[#5f6368]">{meeting.description}</p>
          ) : null}

          <div className="mt-5 rounded-[22px] bg-[#f8fafd] px-4 py-4 text-sm leading-6 text-[#5f6368]">
            The grid now reflects active room participants and camera state. Interactive media
            controls land in the next slice.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeetingRoomClient({
  meetingCode,
  meeting,
  viewerName,
}: MeetingRoomClientProps) {
  const searchParams = useSearchParams();
  const joinPreferences = parseMeetingRoomPreferences(searchParams);
  const [tokenResponse, setTokenResponse] = useState<LiveKitJoinTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(Boolean(meetingCode && meeting));
  const [mediaFailure, setMediaFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingCode || !meeting) {
      setLoadingToken(false);
      return;
    }

    const controller = new AbortController();

    const loadToken = async () => {
      try {
        setLoadingToken(true);
        setTokenError(null);

        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ meetingCode }),
          signal: controller.signal,
        });

        const data = (await response.json()) as LiveKitJoinTokenResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Unable to join the LiveKit room.");
        }

        setTokenResponse(data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setTokenResponse(null);
        setTokenError(
          error instanceof Error ? error.message : "Unable to join the LiveKit room.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingToken(false);
        }
      }
    };

    void loadToken();

    return () => {
      controller.abort();
    };
  }, [meeting, meetingCode]);

  if (!meetingCode || !meeting) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="rounded-[28px] border border-[#eef0f1] bg-white p-8 shadow-[0_18px_50px_rgba(32,33,36,0.12)]">
          <p className="text-sm font-medium text-[#1a73e8]">Room unavailable</p>
          <h1 className="mt-2 text-[32px] font-normal text-[#202124]">Meeting not found</h1>
          <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#5f6368]">
            We couldn&apos;t load a scheduled meeting for this room. Go back to the setup page or
            open the meeting from your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {meetingCode ? (
              <Link
                href={buildMeetingJoinPath(meetingCode)}
                className="inline-flex h-12 items-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc]"
              >
                Return to setup
              </Link>
            ) : null}
            <Link
              href="/meetings"
              className="inline-flex h-12 items-center rounded-full border border-[#dadce0] px-6 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa]"
            >
              Open meetings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const audioOptions: AudioCaptureOptions | boolean = joinPreferences.microphoneEnabled
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(joinPreferences.selectedMicrophoneId
          ? { deviceId: { exact: joinPreferences.selectedMicrophoneId } }
          : {}),
      }
    : false;

  const videoOptions: VideoCaptureOptions | boolean = joinPreferences.cameraEnabled
    ? {
        facingMode: "user",
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
        ...(joinPreferences.selectedCameraId
          ? { deviceId: { exact: joinPreferences.selectedCameraId } }
          : {}),
      }
    : false;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="rounded-[30px] border border-[#eef0f1] bg-white p-6 shadow-[0_20px_60px_rgba(32,33,36,0.12)]">
        <LiveKitRoom
          className="contents"
          connect={Boolean(tokenResponse?.token && tokenResponse.serverUrl) && !tokenError}
          token={tokenResponse?.token}
          serverUrl={tokenResponse?.serverUrl}
          audio={audioOptions}
          video={videoOptions}
          options={{
            adaptiveStream: true,
            dynacast: true,
          }}
          onError={(error) => setTokenError(error.message)}
          onMediaDeviceFailure={(_, kind) => setMediaFailure(buildMediaFailureMessage(kind))}
        >
          <RoomAudioRenderer />
          <MeetingRoomContent
            meeting={meeting}
            viewerName={viewerName}
            tokenState={{
              loading: loadingToken,
              error: tokenError,
              participantIdentity: tokenResponse?.participantIdentity,
            }}
            mediaFailure={mediaFailure}
          />
        </LiveKitRoom>
      </div>
    </main>
  );
}
