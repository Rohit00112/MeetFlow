export interface MeetingJoinPreferences {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  selectedCameraId: string;
  selectedMicrophoneId: string;
}

export const prejoinStorageKeys = {
  cameraEnabled: "meetflow.prejoin.camera.enabled",
  microphoneEnabled: "meetflow.prejoin.microphone.enabled",
  cameraId: "meetflow.prejoin.camera.deviceId",
  microphoneId: "meetflow.prejoin.microphone.deviceId",
} as const;

export function createMeetingRoomParams(preferences: MeetingJoinPreferences) {
  return {
    cam: preferences.cameraEnabled ? "1" : "0",
    mic: preferences.microphoneEnabled ? "1" : "0",
    camDeviceId: preferences.selectedCameraId || undefined,
    micDeviceId: preferences.selectedMicrophoneId || undefined,
  };
}

export function parseMeetingRoomPreferences(
  source:
    | URLSearchParams
    | {
        get(name: string): string | null | undefined;
      },
): MeetingJoinPreferences {
  return {
    cameraEnabled: source.get("cam") !== "0",
    microphoneEnabled: source.get("mic") !== "0",
    selectedCameraId: source.get("camDeviceId") || "",
    selectedMicrophoneId: source.get("micDeviceId") || "",
  };
}
