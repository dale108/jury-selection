#!/usr/bin/env python3
"""
Transcribe audio with speaker diarization using OpenAI GPT-4o Transcribe-Diarize model.

Usage:
    python scripts/transcribe_with_diarization.py audio_file.webm
    python scripts/transcribe_with_diarization.py audio_file.webm --output transcript.json
"""

import argparse
import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import List, Dict, Any

try:
    from openai import AsyncOpenAI
except ImportError as e:
    print(f"Error: Missing required package. Install with:")
    print(f"  pip install openai")
    print(f"\nMissing: {e.name}")
    sys.exit(1)


class AudioTranscriber:
    """Transcribe audio with speaker diarization using GPT-4o Transcribe-Diarize."""
    
    def __init__(self, openai_api_key: str = None):
        """Initialize transcriber.
        
        Args:
            openai_api_key: OpenAI API key (or set OPENAI_API_KEY env var)
        """
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY env var or pass as argument.")
        
        self.client = AsyncOpenAI(api_key=self.openai_api_key)
        self.model = "gpt-4o-transcribe-diarize"
    
    async def transcribe(self, audio_path: str, language: str = "en") -> Dict[str, Any]:
        """Transcribe audio file using OpenAI GPT-4o Transcribe-Diarize.
        
        Returns:
            Dict with 'text', 'segments' (with speaker labels), 'language', 'duration'
        """
        print(f"Transcribing {audio_path} with GPT-4o Transcribe-Diarize...")
        
        try:
            # Open audio file and transcribe with diarization
            with open(audio_path, "rb") as audio_file:
                response = await self.client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    language=language,
                    response_format="diarized_json",
                    chunking_strategy="auto",  # Handles long audio automatically
                )
            
            # Extract segments with speaker labels
            segments = []
            for seg in response.segments:
                segments.append({
                    "speaker": seg.speaker,
                    "text": seg.text,
                    "start": seg.start,
                    "end": seg.end,
                })
            
            # Diarized response doesn't have 'language' attribute
            # Use the language parameter we passed, or try to get it if available
            detected_language = getattr(response, 'language', language)
            
            result = {
                "text": response.text,
                "segments": segments,
                "language": detected_language,
                "duration": getattr(response, 'duration', None),  # May also be missing
            }
            
            speakers = set(seg["speaker"] for seg in segments)
            print(f"✓ Transcription complete: {len(segments)} segments from {len(speakers)} speakers")
            return result
            
        except Exception as e:
            print(f"Error during transcription: {e}")
            raise
    
    
    async def transcribe_with_diarization(
        self,
        audio_path: str,
        language: str = "en",
        num_speakers: int = None,  # Not used with GPT-4o, kept for compatibility
    ) -> Dict[str, Any]:
        """Transcribe audio with speaker diarization using GPT-4o.
        
        Returns:
            Dict with transcription and speaker labels
        """
        # GPT-4o Transcribe-Diarize does both transcription and diarization in one call
        transcription = await self.transcribe(audio_path, language)
        
        # Calculate duration from segments if not provided
        duration = transcription.get("duration")
        if not duration and transcription["segments"]:
            duration = max(seg["end"] for seg in transcription["segments"])
        
        return {
            "full_text": transcription["text"],
            "language": transcription.get("language", language),
            "duration": duration,
            "segments": transcription["segments"],  # Already includes speaker labels
            "speakers": list(set(seg["speaker"] for seg in transcription["segments"])),
        }


def format_output(result: Dict[str, Any], format: str = "json") -> str:
    """Format transcription result for output."""
    if format == "json":
        return json.dumps(result, indent=2, ensure_ascii=False)
    
    elif format == "text":
        lines = []
        lines.append(f"Language: {result['language']}")
        lines.append(f"Duration: {result['duration']:.1f}s")
        lines.append(f"Speakers: {', '.join(result['speakers'])}")
        lines.append("")
        lines.append("=" * 60)
        lines.append("TRANSCRIPT")
        lines.append("=" * 60)
        lines.append("")
        
        for seg in result["segments"]:
            lines.append(f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['speaker']}")
            lines.append(f"  {seg['text']}")
            lines.append("")
        
        return "\n".join(lines)
    
    elif format == "srt":
        # SubRip subtitle format
        lines = []
        for i, seg in enumerate(result["segments"], 1):
            lines.append(str(i))
            lines.append(
                f"{format_timestamp(seg['start'])} --> {format_timestamp(seg['end'])}"
            )
            lines.append(f"{seg['speaker']}: {seg['text']}")
            lines.append("")
        return "\n".join(lines)
    
    else:
        raise ValueError(f"Unknown format: {format}")


def format_timestamp(seconds: float) -> str:
    """Format seconds as SRT timestamp (HH:MM:SS,mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


async def main():
    parser = argparse.ArgumentParser(
        description="Transcribe audio with speaker diarization using OpenAI GPT-4o Transcribe-Diarize"
    )
    parser.add_argument("audio_file", help="Path to audio file (webm, mp3, wav, etc.)")
    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: print to stdout)",
    )
    parser.add_argument(
        "-f", "--format",
        choices=["json", "text", "srt"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "-l", "--language",
        default="en",
        help="Language code (default: en)",
    )
    parser.add_argument(
        "-n", "--num-speakers",
        type=int,
        help="Number of speakers (optional, auto-detect if not specified) - Note: GPT-4o auto-detects",
    )
    parser.add_argument(
        "--openai-key",
        help="OpenAI API key (or set OPENAI_API_KEY env var)",
    )
    
    args = parser.parse_args()
    
    # Check if file exists
    if not os.path.exists(args.audio_file):
        print(f"Error: File not found: {args.audio_file}")
        sys.exit(1)
    
    # Initialize transcriber
    try:
        transcriber = AudioTranscriber(
            openai_api_key=args.openai_key,
        )
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    # Transcribe
    try:
        result = await transcriber.transcribe_with_diarization(
            args.audio_file,
            language=args.language,
            num_speakers=args.num_speakers,
        )
        
        # Format output
        output = format_output(result, args.format)
        
        # Write to file or stdout
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"\n✓ Output saved to: {args.output}")
        else:
            print("\n" + output)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

