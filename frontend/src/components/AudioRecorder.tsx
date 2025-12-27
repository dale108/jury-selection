import React, { useState, useRef, useCallback, useEffect } from 'react';
import './AudioRecorder.css';

interface AudioRecorderProps {
  sessionId: string;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onTranscriptUpdate?: (segment: TranscriptSegment) => void;
  onError?: (error: string) => void;
}

export interface TranscriptSegment {
  segment_id: string;
  speaker_label: string;
  content: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  sessionId,
  onRecordingStart,
  onRecordingStop,
  onTranscriptUpdate,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioWebSocketRef = useRef<WebSocket | null>(null);
  const transcriptWebSocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const levelIntervalRef = useRef<number | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWebSocketUrl = (path: string): string => {
    // In development, connect directly to the backend gateway
    // In production, use the same host as the page
    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (isDev) {
      // Use backend gateway directly in development
      const backendHost = import.meta.env.VITE_WS_HOST || 'localhost:8000';
      return `${protocol}//${backendHost}${path}`;
    }
    
    return `${protocol}//${window.location.host}${path}`;
  };

  const connectTranscriptWebSocket = useCallback(() => {
    const wsUrl = getWebSocketUrl(`/api/transcripts/live/${sessionId}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Transcript WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
          onTranscriptUpdate?.(data.data);
        }
      } catch (e) {
        console.error('Error parsing transcript message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('Transcript WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Transcript WebSocket closed');
      // Reconnect if still recording
      if (isRecording) {
        setTimeout(() => connectTranscriptWebSocket(), 1000);
      }
    };

    transcriptWebSocketRef.current = ws;
  }, [sessionId, isRecording, onTranscriptUpdate]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analysis for level meter
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Connect to audio WebSocket
      setConnectionStatus('connecting');
      const wsUrl = getWebSocketUrl(`/api/audio/stream/${sessionId}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Audio WebSocket connected');
        setConnectionStatus('connected');
        
        // Start MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(1000); // Send chunks every second
        mediaRecorderRef.current = mediaRecorder;
        
        setIsRecording(true);
        onRecordingStart?.();
        
        // Start duration timer
        durationIntervalRef.current = window.setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
        
        // Start audio level monitoring
        levelIntervalRef.current = window.setInterval(() => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average / 255);
          }
        }, 100);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Audio WebSocket message:', data);
        } catch (e) {
          console.error('Error parsing audio message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('Audio WebSocket error:', error);
        setConnectionStatus('disconnected');
        onError?.('Failed to connect to audio server');
      };

      ws.onclose = () => {
        console.log('Audio WebSocket closed');
        setConnectionStatus('disconnected');
      };

      audioWebSocketRef.current = ws;

      // Connect transcript WebSocket
      connectTranscriptWebSocket();

    } catch (error) {
      console.error('Error starting recording:', error);
      onError?.('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Close audio WebSocket
    if (audioWebSocketRef.current) {
      if (audioWebSocketRef.current.readyState === WebSocket.OPEN) {
        audioWebSocketRef.current.send(JSON.stringify({ type: 'end' }));
      }
      audioWebSocketRef.current.close();
    }

    // Close transcript WebSocket
    if (transcriptWebSocketRef.current) {
      transcriptWebSocketRef.current.close();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Clear intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
    }

    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    setConnectionStatus('disconnected');
    onRecordingStop?.();
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
    setIsPaused(!isPaused);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  return (
    <div className={`audio-recorder ${isRecording ? 'recording' : ''}`}>
      <div className="recorder-header">
        <div className="recorder-status">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span className="status-text">
            {connectionStatus === 'connected' ? 'Live' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             'Ready'}
          </span>
        </div>
        <div className="recorder-duration">
          {formatDuration(duration)}
        </div>
      </div>

      {isRecording && (
        <div className="audio-level-container">
          <div 
            className="audio-level-bar" 
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      )}

      <div className="recorder-controls">
        {!isRecording ? (
          <button 
            className="record-btn start"
            onClick={startRecording}
            title="Start recording"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
            Start Recording
          </button>
        ) : (
          <>
            <button 
              className={`record-btn pause ${isPaused ? 'paused' : ''}`}
              onClick={togglePause}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              )}
            </button>
            <button 
              className="record-btn stop"
              onClick={stopRecording}
              title="Stop recording"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              Stop
            </button>
          </>
        )}
      </div>

      {isRecording && isPaused && (
        <div className="paused-indicator">
          ⏸ Recording Paused
        </div>
      )}
    </div>
  );
};

