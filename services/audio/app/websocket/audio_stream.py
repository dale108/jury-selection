"""WebSocket handler for audio streaming."""
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.audio_processor import AudioProcessor
from ..config import settings

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from shared.redis_client import redis_client, Channels
from shared.schemas.events import AudioChunkEvent


class AudioStreamHandler:
    """Handles WebSocket audio streaming."""
    
    def __init__(
        self,
        websocket: WebSocket,
        session_id: uuid.UUID,
        db: AsyncSession,
    ):
        self.websocket = websocket
        self.session_id = session_id
        self.db = db
        self.processor = AudioProcessor(db)
        self.recording_id: Optional[uuid.UUID] = None
        self.chunk_index = 0
        self.total_duration = 0.0
        self.is_recording = False
        # Accumulate all audio data for complete file
        self.all_audio_data: list[bytes] = []
    
    async def handle(self) -> None:
        """Main handler for the WebSocket connection."""
        try:
            await self.websocket.accept()
            
            # Create a new recording
            recording = await self.processor.create_recording(self.session_id)
            self.recording_id = recording.id
            self.is_recording = True
            
            # Send start confirmation
            await self.websocket.send_json({
                "type": "start",
                "data": {
                    "recording_id": str(self.recording_id),
                    "session_id": str(self.session_id),
                },
            })
            
            # Receive audio chunks
            while self.is_recording:
                try:
                    # Receive binary audio data
                    data = await self.websocket.receive()
                    
                    if "bytes" in data:
                        await self._process_chunk(data["bytes"])
                    elif "text" in data:
                        message = json.loads(data["text"])
                        if message.get("type") == "end":
                            print("AudioStreamHandler: Received end message", flush=True)
                            break
                        elif message.get("type") == "ping":
                            await self.websocket.send_json({"type": "pong"})
                    
                except WebSocketDisconnect:
                    print("AudioStreamHandler: WebSocket disconnected", flush=True)
                    break
                except RuntimeError as e:
                    if "disconnect" in str(e).lower():
                        print("AudioStreamHandler: Client disconnected", flush=True)
                        break
                    raise
            
        except Exception as e:
            import traceback
            print(f"AudioStreamHandler: Error during streaming: {e}", flush=True)
            traceback.print_exc()
            # Only try to send error if connection is still open
            try:
                await self.websocket.send_json({
                    "type": "error",
                    "error": str(e),
                })
            except Exception:
                pass  # Connection already closed
        finally:
            # Always finalize recording when handler exits
            print(f"AudioStreamHandler: Handler exiting, finalizing...", flush=True)
            try:
                await self._finalize()
            except Exception as e:
                import traceback
                print(f"AudioStreamHandler: Error during finalization: {e}", flush=True)
                traceback.print_exc()
                if self.recording_id:
                    await self.processor.mark_failed(self.recording_id)
    
    async def _process_chunk(self, audio_data: bytes) -> None:
        """Process an audio chunk."""
        if not self.recording_id:
            return
        
        print(f"AudioStreamHandler: Processing chunk {self.chunk_index}, size={len(audio_data)} bytes", flush=True)
        
        # Accumulate audio data for complete file
        self.all_audio_data.append(audio_data)
        
        # Estimate duration based on typical WebM audio
        chunk_duration = settings.chunk_duration_seconds
        
        # Save chunk to storage (for backup/debugging)
        chunk = await self.processor.save_chunk(
            recording_id=self.recording_id,
            session_id=self.session_id,
            chunk_index=self.chunk_index,
            audio_data=audio_data,
            duration_seconds=chunk_duration,
        )
        
        self.chunk_index += 1
        self.total_duration += chunk_duration
        
        # Note: We no longer publish chunk events - we'll transcribe the complete file
        
        # Send confirmation
        await self.websocket.send_json({
            "type": "chunk_received",
            "data": {
                "chunk_index": self.chunk_index,
                "total_duration": self.total_duration,
            },
        })
    
    async def _finalize(self) -> None:
        """Finalize the recording and trigger transcription."""
        if self.recording_id and self.all_audio_data:
            # Combine all audio chunks into one file
            complete_audio = b''.join(self.all_audio_data)
            print(f"AudioStreamHandler: Finalizing recording with {len(complete_audio)} bytes total", flush=True)
            
            # Save complete recording file (WAV format from frontend)
            complete_file_path = f"sessions/{self.session_id}/recordings/{self.recording_id}.wav"
            await self.processor.save_complete_recording(
                recording_id=self.recording_id,
                session_id=self.session_id,
                audio_data=complete_audio,
                file_path=complete_file_path,
            )
            
            await self.processor.finalize_recording(
                self.recording_id,
                self.total_duration,
            )
            
            # Publish recording complete event for transcription
            from shared.schemas.events import RecordingCompleteEvent
            event = RecordingCompleteEvent(
                session_id=str(self.session_id),
                recording_id=str(self.recording_id),
                file_path=complete_file_path,
                duration_seconds=self.total_duration,
            )
            
            channel = f"recording:complete:{self.session_id}"
            print(f"AudioStreamHandler: Publishing recording complete to {channel}", flush=True)
            await redis_client.publish(channel, event.model_dump(mode="json"))
            
            try:
                await self.websocket.send_json({
                    "type": "end",
                    "data": {
                        "recording_id": str(self.recording_id),
                        "total_chunks": self.chunk_index,
                        "total_duration": self.total_duration,
                    },
                })
            except Exception:
                pass  # Connection may already be closed

