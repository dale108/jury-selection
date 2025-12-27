import React, { useRef, useEffect } from 'react';
import { TranscriptSegment } from './AudioRecorder';
import './LiveTranscript.css';

interface LiveTranscriptProps {
  segments: TranscriptSegment[];
  speakerMappings?: Record<string, string>;
  autoScroll?: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  segments,
  speakerMappings = {},
  autoScroll = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments, autoScroll]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerDisplay = (label: string): string => {
    if (speakerMappings[label]) {
      return speakerMappings[label];
    }
    // Convert SPEAKER_A to "Speaker A"
    const match = label.match(/SPEAKER_([A-Z0-9]+)/);
    if (match) {
      return `Speaker ${match[1]}`;
    }
    return label;
  };

  const getSpeakerColor = (label: string): string => {
    // Generate consistent color based on speaker label
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#14b8a6', // teal
    ];
    
    // Simple hash to get consistent color
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="live-transcript" ref={containerRef}>
      {segments.length === 0 ? (
        <div className="transcript-empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z"/>
              <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/>
              <path d="M12 8V5M12 19v-3M8 12H5M19 12h-3"/>
            </svg>
          </div>
          <p>Waiting for audio...</p>
          <span>Start recording to see live transcription</span>
        </div>
      ) : (
        <div className="transcript-segments">
          {segments.map((segment, index) => (
            <div key={segment.segment_id || index} className="transcript-segment">
              <div className="segment-header">
                <span 
                  className="segment-speaker"
                  style={{ color: getSpeakerColor(segment.speaker_label) }}
                >
                  {getSpeakerDisplay(segment.speaker_label)}
                </span>
                <span className="segment-time">
                  {formatTime(segment.start_time)}
                </span>
              </div>
              <p className="segment-content">{segment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

