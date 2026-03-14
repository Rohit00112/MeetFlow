from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="MeetFlow Transcription Service")


class TranscriptionRequest(BaseModel):
    room_id: str
    recording_url: str | None = None


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "transcription"}


@app.post("/transcriptions")
def create_transcription(_: TranscriptionRequest) -> dict[str, str]:
    return {
        "status": "queued",
        "message": "Transcription processing will be implemented in the captions feature branch.",
    }
