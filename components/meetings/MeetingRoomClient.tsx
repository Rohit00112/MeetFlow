"use client";

import { startTransition, useEffect, useRef, useState } from "react";
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
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  type ChatMessage as LiveKitChatMessage,
  ConnectionState,
  type Participant,
  RoomEvent,
  Track,
  type AudioCaptureOptions,
  type VideoCaptureOptions,
} from "livekit-client";
import { getInitials } from "@/lib/avatar";
import { buildMeetingJoinPath, formatMeetingSchedule } from "@/lib/meetings";
import { parseMeetingRoomPreferences } from "@/lib/prejoin";
import type { LiveKitJoinTokenResponse } from "@/lib/types/livekit";
import type { MeetingAttendeeSummary, MeetingDetail } from "@/lib/types/meetings";

interface MeetingRoomClientProps {
  meetingCode: string | null;
  meeting: MeetingDetail | null;
  viewerName?: string | null;
}

type MeetingSidebarPanel = "people" | "chat";

interface MeetingChatEntry {
  id: string;
  message: string;
  senderName: string;
  isLocal: boolean;
  timestamp: number;
}

interface MeetingReactionBurst {
  id: string;
  emoji: string;
  senderName: string;
}

const HAND_RAISED_ATTRIBUTE = "meetflow-hand-raised";
const HAND_RAISED_AT_ATTRIBUTE = "meetflow-hand-raised-at";
const REACTION_TOPIC = "meetflow:reaction";
const REACTION_OPTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😂", label: "Laugh" },
] as const;

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

function participantHasRaisedHand(participant: Participant) {
  return participant.attributes[HAND_RAISED_ATTRIBUTE] === "true";
}

function getRaisedHandTimestamp(participant: Participant) {
  const rawTimestamp = Number(participant.attributes[HAND_RAISED_AT_ATTRIBUTE] || "0");

  if (!Number.isFinite(rawTimestamp) || rawTimestamp <= 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return rawTimestamp;
}

function sortGridTracks(
  tracks: TrackReferenceOrPlaceholder[],
  viewerName?: string | null,
) {
  return [...tracks].sort((left, right) => {
    const leftRaisedHand = participantHasRaisedHand(left.participant);
    const rightRaisedHand = participantHasRaisedHand(right.participant);

    if (leftRaisedHand !== rightRaisedHand) {
      return leftRaisedHand ? -1 : 1;
    }

    if (leftRaisedHand && rightRaisedHand) {
      return getRaisedHandTimestamp(left.participant) - getRaisedHandTimestamp(right.participant);
    }

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

function sortLiveParticipants(participants: Participant[], viewerName?: string | null) {
  return [...participants].sort((left, right) => {
    if (left.isLocal !== right.isLocal) {
      return left.isLocal ? -1 : 1;
    }

    const leftRaisedHand = participantHasRaisedHand(left);
    const rightRaisedHand = participantHasRaisedHand(right);

    if (leftRaisedHand !== rightRaisedHand) {
      return leftRaisedHand ? -1 : 1;
    }

    if (leftRaisedHand && rightRaisedHand) {
      return getRaisedHandTimestamp(left) - getRaisedHandTimestamp(right);
    }

    if (left.isSpeaking !== right.isSpeaking) {
      return left.isSpeaking ? -1 : 1;
    }

    if (left.isCameraEnabled !== right.isCameraEnabled) {
      return left.isCameraEnabled ? -1 : 1;
    }

    return formatParticipantLabel(left, viewerName).localeCompare(
      formatParticipantLabel(right, viewerName),
    );
  });
}

function participantMatchesUserId(participant: Participant, userId?: string | null) {
  return Boolean(userId && participant.identity.includes(userId));
}

function formatAttendeeLabel(attendee: MeetingAttendeeSummary) {
  return attendee.user?.name || attendee.name || attendee.email;
}

function getAttendeeStatusPresentation(status: MeetingAttendeeSummary["status"]) {
  switch (status) {
    case "ACCEPTED":
      return {
        label: "Accepted",
        className: "bg-[#e6f4ea] text-[#137333]",
      };
    case "DECLINED":
      return {
        label: "Declined",
        className: "bg-[#fce8e6] text-[#b3261e]",
      };
    case "TENTATIVE":
      return {
        label: "Tentative",
        className: "bg-[#fef7e0] text-[#b06000]",
      };
    default:
      return {
        label: "Invited",
        className: "bg-[#e8f0fe] text-[#174ea6]",
      };
  }
}

function formatChatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function buildMeetingChatEntry(
  message: LiveKitChatMessage,
  participant?: Participant,
  viewerName?: string | null,
): MeetingChatEntry {
  const senderName = participant ? formatParticipantLabel(participant, viewerName) : "Someone";

  return {
    id: message.id,
    message: message.message,
    senderName,
    isLocal: participant?.isLocal ?? false,
    timestamp: message.editTimestamp ?? message.timestamp,
  };
}

function createReactionBurst({
  emoji,
  senderName,
}: {
  emoji: string;
  senderName: string;
}): MeetingReactionBurst {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    emoji,
    senderName,
  };
}

function getTrackReferenceId(trackRef: TrackReferenceOrPlaceholder) {
  return `${trackRef.participant.identity}-${trackRef.source}`;
}

function isScreenShareTrack(trackRef: TrackReferenceOrPlaceholder) {
  return trackRef.source === Track.Source.ScreenShare;
}

function formatTrackHeadline(trackRef: TrackReferenceOrPlaceholder, viewerName?: string | null) {
  const displayName = formatParticipantLabel(trackRef.participant, viewerName);

  if (isScreenShareTrack(trackRef)) {
    return `${displayName} is presenting`;
  }

  return `${displayName} in focus`;
}

function MeetingParticipantTile({
  trackRef,
  viewerName,
  selectable,
  selected,
  onSelect,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  viewerName?: string | null;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const participant = trackRef.participant;
  const displayName = formatParticipantLabel(participant, viewerName);
  const hasVideo = isTrackReference(trackRef);
  const isHandRaised = participantHasRaisedHand(participant);
  const isScreenShare = isScreenShareTrack(trackRef);

  return (
    <article
      className={`group relative overflow-hidden rounded-[24px] border transition ${
        selected
          ? "border-[#8ab4f8] shadow-[0_0_0_1px_rgba(138,180,248,0.9)]"
          : participant.isSpeaking
          ? "border-[#8ab4f8] shadow-[0_0_0_1px_rgba(138,180,248,0.75)]"
          : "border-white/10"
      } bg-[#2a2b2f] ${selectable ? "cursor-pointer hover:border-white/30" : ""}`}
      onClick={onSelect}
    >
      <div className="relative aspect-video">
        <div className="absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2">
          {isScreenShare ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white shadow-[0_10px_24px_rgba(26,115,232,0.28)]">
              <Icon icon="heroicons:presentation-chart-line" className="h-4 w-4" />
              <span>Presenting</span>
            </div>
          ) : null}
          {isHandRaised ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fbbc04] px-3 py-1.5 text-xs font-medium text-[#202124] shadow-[0_10px_24px_rgba(251,188,4,0.28)]">
              <Icon icon="heroicons:hand-raised" className="h-4 w-4" />
              <span>Hand raised</span>
            </div>
          ) : null}
          {selectable ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <Icon icon="heroicons:arrows-pointing-out" className="h-4 w-4" />
              <span>{selected ? "Focused" : "Pin"}</span>
            </div>
          ) : null}
        </div>

        {hasVideo ? (
          <VideoTrack
            trackRef={trackRef}
            className={`h-full w-full ${
              isScreenShare
                ? "bg-[#17181a] object-contain"
                : `object-cover ${participant.isLocal ? "[transform:scaleX(-1)]" : ""}`
            }`}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#3b3d42_0,#292a2d_58%,#202124_100%)] px-6 text-center text-white">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-medium">
              {getInitials(displayName)}
            </div>
            <p className="mt-4 text-[22px] font-normal">{displayName}</p>
            <p className="mt-2 text-sm text-white/65">
              {isScreenShare
                ? "Waiting for shared content"
                : participant.isCameraEnabled
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

function MeetingFocusedTrackStage({
  trackRef,
  viewerName,
  onShowGrid,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  viewerName?: string | null;
  onShowGrid: () => void;
}) {
  const isScreenShare = isScreenShareTrack(trackRef);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">
            {isScreenShare ? "Presented content" : "Focused participant"}
          </p>
          <p className="mt-1 text-sm text-white/60">{formatTrackHeadline(trackRef, viewerName)}</p>
        </div>
        <button
          type="button"
          onClick={onShowGrid}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
        >
          <Icon icon="heroicons:squares-2x2" className="h-5 w-5" />
          <span>Show grid</span>
        </button>
      </div>

      <MeetingParticipantTile trackRef={trackRef} viewerName={viewerName} />
    </div>
  );
}

function MeetingMediaControlButton({
  active,
  busy,
  disabled,
  destructive,
  icon,
  label,
  activeLabel,
  inactiveLabel,
  onClick,
}: {
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  icon: string;
  label: string;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
}) {
  const backgroundClass = destructive
    ? "bg-[#ea4335] text-white hover:bg-[#d93025]"
    : active
      ? "bg-[#3c4043] text-white hover:bg-[#4a4d52]"
      : "bg-[#5f1d1a] text-[#f28b82] hover:bg-[#70231f]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex min-w-[128px] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${backgroundClass}`}
      title={active ? activeLabel : inactiveLabel}
    >
      <Icon icon={icon} className={`h-5 w-5 ${busy ? "animate-pulse" : ""}`} />
      <span>{busy ? `${label}...` : label}</span>
    </button>
  );
}

function MeetingPanelToggleButton({
  active,
  count,
  icon,
  activeText,
  inactiveText,
  activeTitle,
  inactiveTitle,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: string;
  activeText: string;
  inactiveText: string;
  activeTitle: string;
  inactiveTitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-w-[128px] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
          : "bg-[#3c4043] text-white hover:bg-[#4a4d52]"
      }`}
      title={active ? activeTitle : inactiveTitle}
    >
      <Icon icon={icon} className="h-5 w-5" />
      <span>{active ? activeText : inactiveText}</span>
      {typeof count === "number" ? (
        <span
          className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
            active ? "bg-white/20 text-white" : "bg-white/10 text-white/90"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function MeetingRoomStatusNotices({
  tokenError,
  mediaFailure,
}: {
  tokenError: string | null;
  mediaFailure: string | null;
}) {
  return (
    <>
      {tokenError ? (
        <div className="rounded-[22px] border border-[#f6c7c3] bg-[#fef7f6] px-4 py-3 text-sm leading-6 text-[#b3261e]">
          {tokenError}
        </div>
      ) : null}

      {mediaFailure ? (
        <div className="rounded-[22px] border border-[#fde293] bg-[#fff8e1] px-4 py-3 text-sm leading-6 text-[#8a5800]">
          {mediaFailure}
        </div>
      ) : null}
    </>
  );
}

function MeetingLiveParticipantPanelRow({
  participant,
  hostUserId,
  viewerName,
}: {
  participant: Participant;
  hostUserId: string;
  viewerName?: string | null;
}) {
  const displayName = formatParticipantLabel(participant, viewerName);
  const isHost = participantMatchesUserId(participant, hostUserId);
  const isHandRaised = participantHasRaisedHand(participant);

  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-[#f8fafd] px-4 py-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d2e3fc] text-sm font-medium text-[#174ea6]">
        {getInitials(displayName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#202124]">{displayName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5f6368]">
          {participant.isLocal ? (
            <span className="rounded-full bg-[#e6f4ea] px-2.5 py-1 font-medium text-[#137333]">
              You
            </span>
          ) : null}
          {isHost ? (
            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 font-medium text-[#174ea6]">
              Host
            </span>
          ) : null}
          {participant.isSpeaking ? (
            <span className="rounded-full bg-[#e6f4ea] px-2.5 py-1 font-medium text-[#137333]">
              Speaking
            </span>
          ) : null}
          {participant.isScreenShareEnabled ? (
            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 font-medium text-[#174ea6]">
              Presenting
            </span>
          ) : null}
          {isHandRaised ? (
            <span className="rounded-full bg-[#fef7e0] px-2.5 py-1 font-medium text-[#8a5800]">
              Hand raised
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
            participant.isMicrophoneEnabled
              ? "bg-white text-[#202124]"
              : "bg-[#5f1d1a] text-[#f28b82]"
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
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
            participant.isCameraEnabled ? "bg-white text-[#202124]" : "bg-[#5f1d1a] text-[#f28b82]"
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
  );
}

function MeetingInvitePanelRow({
  attendee,
}: {
  attendee: MeetingAttendeeSummary;
}) {
  const displayName = formatAttendeeLabel(attendee);
  const status = getAttendeeStatusPresentation(attendee.status);

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[#eef0f1] bg-white px-4 py-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-sm font-medium text-[#3c4043]">
        {getInitials(displayName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#202124]">{displayName}</p>
        <p className="truncate text-xs text-[#5f6368]">{attendee.email}</p>
      </div>

      <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
        {status.label}
      </span>
    </div>
  );
}

function MeetingChatPanel({
  controlsReady,
  messages,
  draft,
  isSending,
  error,
  onClose,
  onDraftChange,
  onSend,
}: {
  controlsReady: boolean;
  messages: MeetingChatEntry[];
  draft: string;
  isSending: boolean;
  error: string | null;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messageContainerRef.current) {
      return;
    }

    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="rounded-[26px] border border-[#eef0f1] bg-white p-5 shadow-[0_14px_36px_rgba(32,33,36,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-[#202124]">In-call chat</h3>
          <p className="mt-1 text-sm text-[#5f6368]">
            Messages are visible to everyone currently in the room.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3f4] text-[#5f6368] transition hover:bg-[#e8eaed]"
          title="Close chat panel"
        >
          <Icon icon="heroicons:x-mark" className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-[#5f6368]">
        {messages.length === 0
          ? "No chat messages yet. Start the conversation for everyone in the room."
          : `${messages.length} message${messages.length === 1 ? "" : "s"} in this call`}
      </div>

      <div
        ref={messageContainerRef}
        className="mt-5 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1"
      >
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isLocal ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${message.isLocal ? "items-end" : "items-start"}`}>
                <div className="mb-1 flex items-center gap-2 text-xs text-[#5f6368]">
                  <span className="font-medium text-[#3c4043]">{message.senderName}</span>
                  <span>{formatChatTimestamp(message.timestamp)}</span>
                </div>
                <div
                  className={`rounded-[20px] px-4 py-3 text-sm leading-6 ${
                    message.isLocal
                      ? "bg-[#1a73e8] text-white"
                      : "border border-[#eef0f1] bg-[#f8fafd] text-[#202124]"
                  }`}
                >
                  {message.message}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dadce0] px-6 text-center text-[#5f6368]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f0fe] text-[#174ea6]">
              <Icon icon="heroicons:chat-bubble-left-right" className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-medium text-[#3c4043]">Chat is ready</p>
            <p className="mt-2 text-sm leading-6">
              Send a message to everyone in the call without leaving the meeting grid.
            </p>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] border border-[#f6c7c3] bg-[#fef7f6] px-4 py-3 text-sm leading-6 text-[#b3261e]">
          {error}
        </div>
      ) : null}

      <form
        className="mt-5 flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label className="sr-only" htmlFor="meeting-chat-input">
          Send a message
        </label>
        <textarea
          id="meeting-chat-input"
          rows={3}
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
          }}
          placeholder={controlsReady ? "Send a message to everyone" : "Connect to chat"}
          disabled={!controlsReady || isSending}
          className="min-h-[108px] flex-1 resize-none rounded-[22px] border border-[#dadce0] px-4 py-3 text-sm text-[#202124] outline-none transition placeholder:text-[#80868b] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#d2e3fc] disabled:cursor-not-allowed disabled:bg-[#f8fafd]"
        />
        <button
          type="submit"
          disabled={!controlsReady || isSending || draft.trim().length === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#9aa0a6]"
        >
          <Icon
            icon={isSending ? "heroicons:arrow-path" : "heroicons:paper-airplane"}
            className={`h-5 w-5 ${isSending ? "animate-spin" : ""}`}
          />
          <span>{isSending ? "Sending" : "Send"}</span>
        </button>
      </form>
    </div>
  );
}

function MeetingReactionPicker({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-white/10 bg-[#2a2b2f]/92 px-4 py-3 shadow-[0_18px_44px_rgba(32,33,36,0.28)] backdrop-blur">
      {REACTION_OPTIONS.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          disabled={disabled}
          onClick={() => {
            onSend(reaction.emoji);
          }}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-50"
          title={reaction.label}
        >
          <span aria-hidden>{reaction.emoji}</span>
          <span className="sr-only">{reaction.label}</span>
        </button>
      ))}
    </div>
  );
}

function MeetingReactionBurstStack({
  reactions,
}: {
  reactions: MeetingReactionBurst[];
}) {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex max-w-[220px] flex-col items-end gap-2">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur"
        >
          <span className="text-xl leading-none" aria-hidden>
            {reaction.emoji}
          </span>
          <span className="text-xs font-medium">{reaction.senderName}</span>
        </div>
      ))}
    </div>
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
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const rawCameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const rawScreenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const cameraTracks = sortGridTracks(rawCameraTracks, viewerName);
  const screenShareTracks = sortGridTracks(rawScreenShareTracks, viewerName);
  const focusableTracks = [...screenShareTracks, ...cameraTracks];
  const liveParticipants = sortLiveParticipants(participants, viewerName);
  const raisedHandParticipants = liveParticipants.filter((participant) =>
    participantHasRaisedHand(participant),
  );
  const remoteParticipants = participants.filter((participant) => !participant.isLocal);
  const offlineInvitees = meeting.attendees.filter(
    (attendee) =>
      !liveParticipants.some((participant) => participantMatchesUserId(participant, attendee.user?.id)),
  );
  const connectionStatus = formatConnectionState(connectionState);
  const visibleTrackCount = Math.max(focusableTracks.length, 1);
  const controlsReady = connectionState === ConnectionState.Connected;
  const isHandRaised = participantHasRaisedHand(localParticipant);
  const localParticipantName = formatParticipantLabel(localParticipant, viewerName);
  const [pendingControl, setPendingControl] = useState<
    "microphone" | "camera" | "screenShare" | null
  >(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<MeetingSidebarPanel | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<MeetingChatEntry[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isUpdatingHandRaise, setIsUpdatingHandRaise] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [reactionBursts, setReactionBursts] = useState<MeetingReactionBurst[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [dismissedAutoFocus, setDismissedAutoFocus] = useState(false);
  const reactionTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const previousScreenShareCountRef = useRef(screenShareTracks.length);
  const hasSelectedTrack = Boolean(
    selectedTrackId &&
      focusableTracks.some((trackRef) => getTrackReferenceId(trackRef) === selectedTrackId),
  );
  const selectedFocusTrack = selectedTrackId
    ? focusableTracks.find((trackRef) => getTrackReferenceId(trackRef) === selectedTrackId) || null
    : null;
  const autoFocusedTrack = dismissedAutoFocus ? null : screenShareTracks[0] || null;
  const focusedTrack = selectedFocusTrack || autoFocusedTrack;
  const secondaryTracks = focusedTrack
    ? focusableTracks.filter(
        (trackRef) => getTrackReferenceId(trackRef) !== getTrackReferenceId(focusedTrack),
      )
    : cameraTracks;

  useEffect(() => {
    const handleChatMessage = (
      message: LiveKitChatMessage,
      participant?: Participant,
    ) => {
      const entry = buildMeetingChatEntry(message, participant, viewerName);

      setChatMessages((currentMessages) => {
        const existingMessageIndex = currentMessages.findIndex(
          (currentMessage) => currentMessage.id === entry.id,
        );

        if (existingMessageIndex >= 0) {
          return currentMessages.map((currentMessage) =>
            currentMessage.id === entry.id ? entry : currentMessage,
          );
        }

        return [...currentMessages, entry];
      });

      if (!entry.isLocal && activeSidebar !== "chat") {
        setUnreadChatCount((currentCount) => currentCount + 1);
      }
    };

    room.on(RoomEvent.ChatMessage, handleChatMessage);

    return () => {
      room.off(RoomEvent.ChatMessage, handleChatMessage);
    };
  }, [activeSidebar, room, viewerName]);

  useEffect(() => {
    if (activeSidebar === "chat") {
      setUnreadChatCount(0);
    }
  }, [activeSidebar]);

  useEffect(() => {
    const previousScreenShareCount = previousScreenShareCountRef.current;

    if (screenShareTracks.length === 0 || previousScreenShareCount === 0) {
      setDismissedAutoFocus(false);
    }

    previousScreenShareCountRef.current = screenShareTracks.length;
  }, [screenShareTracks.length]);

  useEffect(() => {
    if (selectedTrackId && !hasSelectedTrack) {
      setSelectedTrackId(null);
    }
  }, [hasSelectedTrack, selectedTrackId]);

  useEffect(() => {
    const reactionTimeouts = reactionTimeoutsRef.current;

    return () => {
      reactionTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      reactionTimeouts.clear();
    };
  }, []);

  const addReactionBurst = (reaction: MeetingReactionBurst) => {
    setReactionBursts((currentReactions) => {
      if (currentReactions.some((currentReaction) => currentReaction.id === reaction.id)) {
        return currentReactions;
      }

      return [...currentReactions, reaction];
    });

    const existingTimeout = reactionTimeoutsRef.current.get(reaction.id);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      setReactionBursts((currentReactions) =>
        currentReactions.filter((currentReaction) => currentReaction.id !== reaction.id),
      );
      reactionTimeoutsRef.current.delete(reaction.id);
    }, 4500);

    reactionTimeoutsRef.current.set(reaction.id, timeoutId);
  };

  useEffect(() => {
    const handleReactionEvent = (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== REACTION_TOPIC) {
        return;
      }

      try {
        const parsedPayload = JSON.parse(new TextDecoder().decode(payload)) as Partial<MeetingReactionBurst>;

        if (
          typeof parsedPayload.id !== "string" ||
          typeof parsedPayload.emoji !== "string" ||
          parsedPayload.emoji.length === 0
        ) {
          return;
        }

        const senderName =
          typeof parsedPayload.senderName === "string" && parsedPayload.senderName.length > 0
            ? parsedPayload.senderName
            : participant
              ? formatParticipantLabel(participant, viewerName)
              : "Someone";

        addReactionBurst({
          id: parsedPayload.id,
          emoji: parsedPayload.emoji,
          senderName,
        });
      } catch {
        // Ignore malformed reaction payloads from the data channel.
      }
    };

    room.on(RoomEvent.DataReceived, handleReactionEvent);

    return () => {
      room.off(RoomEvent.DataReceived, handleReactionEvent);
    };
  }, [room, viewerName]);

  const leaveRoom = async () => {
    try {
      await room.disconnect();
    } catch {
      // Navigation still returns the user to the prejoin screen even if disconnect throws.
    }

    startTransition(() => {
      router.push(buildMeetingJoinPath(meeting.meetingCode));
    });
  };

  const toggleMicrophone = async () => {
    if (!controlsReady || pendingControl) {
      return;
    }

    try {
      setPendingControl("microphone");
      setControlError(null);
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      setControlError("We couldn't update your microphone state.");
    } finally {
      setPendingControl(null);
    }
  };

  const toggleCamera = async () => {
    if (!controlsReady || pendingControl) {
      return;
    }

    try {
      setPendingControl("camera");
      setControlError(null);
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch {
      setControlError("We couldn't update your camera state.");
    } finally {
      setPendingControl(null);
    }
  };

  const toggleScreenShare = async () => {
    if (!controlsReady || pendingControl) {
      return;
    }

    try {
      setPendingControl("screenShare");
      setControlError(null);
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      if (!isScreenShareEnabled) {
        setDismissedAutoFocus(false);
      }
    } catch {
      setControlError("We couldn't update your screen sharing state.");
    } finally {
      setPendingControl(null);
    }
  };

  const toggleHandRaise = async () => {
    if (!controlsReady || isUpdatingHandRaise) {
      return;
    }

    try {
      setIsUpdatingHandRaise(true);
      setControlError(null);
      await localParticipant.setAttributes({
        [HAND_RAISED_ATTRIBUTE]: isHandRaised ? "false" : "true",
        [HAND_RAISED_AT_ATTRIBUTE]: isHandRaised ? "0" : String(Date.now()),
      });
    } catch {
      setControlError("We couldn't update your raised hand state.");
    } finally {
      setIsUpdatingHandRaise(false);
    }
  };

  const sendReaction = async (emoji: string) => {
    if (!controlsReady) {
      return;
    }

    const reaction = createReactionBurst({
      emoji,
      senderName: localParticipantName,
    });

    try {
      setControlError(null);
      addReactionBurst(reaction);
      setIsReactionPickerOpen(false);
      await localParticipant.publishData(new TextEncoder().encode(JSON.stringify(reaction)), {
        reliable: true,
        topic: REACTION_TOPIC,
      });
    } catch {
      setControlError("We couldn't send your reaction.");
    }
  };

  const sendChatMessage = async () => {
    const message = chatDraft.trim();

    if (!controlsReady || isSendingChat || message.length === 0) {
      return;
    }

    try {
      setIsSendingChat(true);
      setChatError(null);
      await localParticipant.sendChatMessage(message);
      setChatDraft("");
      setActiveSidebar("chat");
    } catch {
      setChatError("We couldn't send your message.");
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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

          <div className="rounded-full bg-[#f8fafd] px-4 py-2 text-sm font-medium text-[#5f6368]">
            {controlsReady ? "Controls are live" : "Waiting for room connection"}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-[#2b2c2f] bg-[#202124] p-4 shadow-[0_24px_60px_rgba(32,33,36,0.24)] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#303236_0,#202124_58%,#17181a_100%)]" />
          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-sm font-medium text-white/80">
                {focusedTrack ? "Focus layout" : "Participant grid"}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {visibleTrackCount} tile{visibleTrackCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {isMicrophoneEnabled ? "Mic on" : "Mic off"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {isCameraEnabled ? "Camera on" : "Camera off"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  {screenShareTracks.length > 0 ? `${screenShareTracks.length} presenting` : "No presentation"}
                </span>
                {raisedHandParticipants.length > 0 ? (
                  <span className="rounded-full bg-[#fbbc04]/90 px-3 py-1 text-[#202124] backdrop-blur">
                    {raisedHandParticipants.length} hand
                    {raisedHandParticipants.length === 1 ? "" : "s"} raised
                  </span>
                ) : null}
              </div>
            </div>

            <MeetingReactionBurstStack reactions={reactionBursts} />

            {focusedTrack ? (
              <div className="space-y-4">
                <MeetingFocusedTrackStage
                  trackRef={focusedTrack}
                  viewerName={viewerName}
                  onShowGrid={() => {
                    setSelectedTrackId(null);
                    setDismissedAutoFocus(true);
                  }}
                />

                {secondaryTracks.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-sm font-medium text-white/80">Filmstrip</p>
                      <p className="text-xs text-white/60">
                        Click a tile to pin it to the main stage.
                      </p>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {secondaryTracks.map((trackRef) => (
                        <div
                          key={getTrackReferenceId(trackRef)}
                          className="w-[260px] shrink-0 sm:w-[300px]"
                        >
                          <MeetingParticipantTile
                            trackRef={trackRef}
                            viewerName={viewerName}
                            selectable
                            selected={false}
                            onSelect={() => {
                              setSelectedTrackId(getTrackReferenceId(trackRef));
                              setDismissedAutoFocus(false);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : focusableTracks.length > 0 ? (
              <div className={`grid gap-4 ${getGridColumnsClass(visibleTrackCount)}`}>
                {focusableTracks.map((trackRef) => (
                  <MeetingParticipantTile
                    key={getTrackReferenceId(trackRef)}
                    trackRef={trackRef}
                    viewerName={viewerName}
                    selectable
                    selected={selectedTrackId === getTrackReferenceId(trackRef)}
                    onSelect={() => {
                      setSelectedTrackId(getTrackReferenceId(trackRef));
                      setDismissedAutoFocus(false);
                    }}
                  />
                ))}
              </div>
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

            {tokenState.loading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/35 backdrop-blur-sm">
                <div className="rounded-full bg-white/12 px-4 py-2 text-sm text-white">
                  Connecting to LiveKit room
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {controlError ? (
            <div className="w-full max-w-[540px] rounded-[22px] border border-[#f6c7c3] bg-[#fef7f6] px-4 py-3 text-sm leading-6 text-[#b3261e]">
              {controlError}
            </div>
          ) : null}

          {isReactionPickerOpen ? (
            <MeetingReactionPicker
              disabled={!controlsReady}
              onSend={(emoji) => {
                void sendReaction(emoji);
              }}
            />
          ) : null}

          <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full bg-[#202124] px-4 py-3 shadow-[0_18px_44px_rgba(32,33,36,0.28)]">
            <MeetingMediaControlButton
              active={isMicrophoneEnabled}
              busy={pendingControl === "microphone"}
              disabled={!controlsReady}
              icon={isMicrophoneEnabled ? "heroicons:microphone" : "heroicons:microphone-slash"}
              label={isMicrophoneEnabled ? "Mute" : "Unmute"}
              activeLabel="Mute microphone"
              inactiveLabel="Unmute microphone"
              onClick={() => {
                void toggleMicrophone();
              }}
            />
            <MeetingMediaControlButton
              active={isCameraEnabled}
              busy={pendingControl === "camera"}
              disabled={!controlsReady}
              icon={isCameraEnabled ? "heroicons:video-camera" : "heroicons:video-camera-slash"}
              label={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
              activeLabel="Turn off camera"
              inactiveLabel="Turn on camera"
              onClick={() => {
                void toggleCamera();
              }}
            />
            <MeetingMediaControlButton
              active={isScreenShareEnabled}
              busy={pendingControl === "screenShare"}
              disabled={!controlsReady}
              icon={
                isScreenShareEnabled
                  ? "heroicons:stop-circle"
                  : "heroicons:presentation-chart-line"
              }
              label={isScreenShareEnabled ? "Stop presenting" : "Present now"}
              activeLabel="Stop screen sharing"
              inactiveLabel="Start screen sharing"
              onClick={() => {
                void toggleScreenShare();
              }}
            />
            <MeetingPanelToggleButton
              active={isHandRaised}
              icon="heroicons:hand-raised"
              activeText="Lower hand"
              inactiveText="Raise hand"
              activeTitle="Lower your hand"
              inactiveTitle="Raise your hand"
              onClick={() => {
                void toggleHandRaise();
              }}
            />
            <MeetingPanelToggleButton
              active={isReactionPickerOpen}
              icon="heroicons:face-smile"
              activeText="Hide reactions"
              inactiveText="Reactions"
              activeTitle="Hide reaction picker"
              inactiveTitle="Open reaction picker"
              onClick={() => {
                setIsReactionPickerOpen((currentValue) => !currentValue);
              }}
            />
            <MeetingPanelToggleButton
              active={activeSidebar === "people"}
              count={liveParticipants.length}
              icon="heroicons:users"
              activeText="Hide people"
              inactiveText="People"
              activeTitle="Hide people panel"
              inactiveTitle="Show people panel"
              onClick={() => {
                setIsReactionPickerOpen(false);
                setActiveSidebar((currentValue) =>
                  currentValue === "people" ? null : "people",
                );
              }}
            />
            <MeetingPanelToggleButton
              active={activeSidebar === "chat"}
              count={activeSidebar === "chat" ? chatMessages.length : unreadChatCount}
              icon="heroicons:chat-bubble-left-right"
              activeText="Hide chat"
              inactiveText="Chat"
              activeTitle="Hide chat panel"
              inactiveTitle="Show chat panel"
              onClick={() => {
                setIsReactionPickerOpen(false);
                setActiveSidebar((currentValue) =>
                  currentValue === "chat" ? null : "chat",
                );
              }}
            />
            <MeetingMediaControlButton
              destructive
              icon="heroicons:phone-x-mark"
              label="Leave call"
              activeLabel="Leave call"
              inactiveLabel="Leave call"
              onClick={() => {
                void leaveRoom();
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <MeetingRoomStatusNotices
          tokenError={tokenState.error}
          mediaFailure={mediaFailure}
        />

        {activeSidebar === "people" ? (
          <div className="rounded-[26px] border border-[#eef0f1] bg-white p-5 shadow-[0_14px_36px_rgba(32,33,36,0.1)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-[#202124]">People</h3>
                <p className="mt-1 text-sm text-[#5f6368]">
                  See who is connected right now and who still has the invite.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSidebar(null);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3f4] text-[#5f6368] transition hover:bg-[#e8eaed]"
                title="Close people panel"
              >
                <Icon icon="heroicons:x-mark" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                  In the call
                </p>
                <p className="mt-1 text-2xl font-medium text-[#202124]">{liveParticipants.length}</p>
              </div>
              <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                  Still invited
                </p>
                <p className="mt-1 text-2xl font-medium text-[#202124]">{offlineInvitees.length}</p>
              </div>
              <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                  Hands raised
                </p>
                <p className="mt-1 text-2xl font-medium text-[#202124]">
                  {raisedHandParticipants.length}
                </p>
              </div>
              <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                  Presenting
                </p>
                <p className="mt-1 text-2xl font-medium text-[#202124]">{screenShareTracks.length}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                Connected now
              </h4>
              {liveParticipants.length > 0 ? (
                liveParticipants.map((participant) => (
                  <MeetingLiveParticipantPanelRow
                    key={participant.identity}
                    participant={participant}
                    hostUserId={meeting.host.id}
                    viewerName={viewerName}
                  />
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#dadce0] px-4 py-4 text-sm leading-6 text-[#5f6368]">
                  No one is connected yet. Join the room to start the call and populate the people
                  panel.
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                Invited
              </h4>
              {offlineInvitees.length > 0 ? (
                offlineInvitees.map((attendee) => (
                  <MeetingInvitePanelRow key={attendee.id} attendee={attendee} />
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#dadce0] px-4 py-4 text-sm leading-6 text-[#5f6368]">
                  Everyone on the invite list is already in the call, or this meeting has no extra
                  invitees.
                </div>
              )}
            </div>
          </div>
        ) : activeSidebar === "chat" ? (
          <MeetingChatPanel
            controlsReady={controlsReady}
            messages={chatMessages}
            draft={chatDraft}
            isSending={isSendingChat}
            error={chatError}
            onClose={() => {
              setActiveSidebar(null);
            }}
            onDraftChange={setChatDraft}
            onSend={() => {
              void sendChatMessage();
            }}
          />
        ) : (
          <>
            <div className="rounded-[26px] border border-[#eef0f1] bg-white p-5 shadow-[0_14px_36px_rgba(32,33,36,0.1)]">
              <h3 className="text-lg font-medium text-[#202124]">Room snapshot</h3>
              <p className="mt-1 text-sm text-[#5f6368]">
                LiveKit tracks who is actually connected. Use the toolbar for People, Chat, hand
                raise, quick reactions, and presenter focus without leaving the call.
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
                <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                    Hands raised
                  </p>
                  <p className="mt-1 text-2xl font-medium text-[#202124]">
                    {raisedHandParticipants.length}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[#f8fafd] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5f6368]">
                    Presenting now
                  </p>
                  <p className="mt-1 text-2xl font-medium text-[#202124]">
                    {screenShareTracks.length}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] bg-[#f8fafd] px-4 py-4 text-sm leading-6 text-[#5f6368]">
                Open People to inspect the roster, use Chat to message the room, or raise your
                hand, share your screen, and send reactions directly from the floating controls.
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
                Use the floating toolbar to mute, turn your camera on or off, raise your hand, send
                reactions, start presenting, pin a focused stage, open People or Chat, and leave
                the call without losing the meeting context.
              </div>
            </div>
          </>
        )}
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
