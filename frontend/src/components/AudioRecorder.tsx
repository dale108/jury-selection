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

// Target sample rate for output WAV (OpenAI API prefers 16kHz for speech)
const TARGET_SAMPLE_RATE = 16000;

// Resample audio from source rate to target rate using linear interpolation
function resample(samples: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return samples;
  }
  
  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    // Linear interpolation between adjacent samples
    result[i] = samples[srcIndexFloor] * (1 - fraction) + samples[srcIndexCeil] * fraction;
  }
  
  return result;
}

// Encode samples as WAV at the target sample rate
function encodeWAV(samples: Float32Array, sampleRate: number = TARGET_SAMPLE_RATE): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true); // Audio format (PCM)
  view.setUint16(22, 1, true); // Number of channels (mono)
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write samples as 16-bit PCM
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(view: DataView, offset: number, samples: Float32Array): void {
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWebSocketRef = useRef<WebSocket | null>(null);
  const transcriptWebSocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const levelIntervalRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const nativeSampleRateRef = useRef<number>(48000);
  
  // Buffer to accumulate audio samples
  const audioBufferRef = useRef<Float32Array[]>([]);
  const bufferIntervalRef = useRef<number | null>(null);

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

  // Send buffered audio as WAV
  const sendBufferedAudio = useCallback(() => {
    const ws = audioWebSocketRef.current;
    const buffers = audioBufferRef.current;
    
    if (!ws || ws.readyState !== WebSocket.OPEN || buffers.length === 0) {
      return;
    }

    // Combine all buffered samples
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const combinedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      combinedSamples.set(buf, offset);
      offset += buf.length;
    }

    // Clear buffer
    audioBufferRef.current = [];

    // Resample from native rate to target rate (16kHz)
    const resampledSamples = resample(combinedSamples, nativeSampleRateRef.current, TARGET_SAMPLE_RATE);
    
    // Encode as WAV and send
    const wavBuffer = encodeWAV(resampledSamples, TARGET_SAMPLE_RATE);
    ws.send(wavBuffer);
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone access - don't force sample rate, let browser use native
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Create AudioContext with browser's default sample rate
      // This avoids the sample rate mismatch error
      audioContextRef.current = new AudioContext();
      nativeSampleRateRef.current = audioContextRef.current.sampleRate;
      console.log(`AudioContext sample rate: ${nativeSampleRateRef.current}Hz`);
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      // Set up analyser for level meter
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Connect to audio WebSocket first
      setConnectionStatus('connecting');
      const wsUrl = getWebSocketUrl(`/api/audio/stream/${sessionId}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Audio WebSocket connected');
        setConnectionStatus('connected');
        
        // Set up ScriptProcessorNode for raw PCM capture
        // Use a larger buffer for higher sample rates
        const bufferSize = nativeSampleRateRef.current >= 44100 ? 8192 : 4096;
        const processor = audioContextRef.current!.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (isPausedRef.current) return;
          
          // Get input data (mono channel)
          const inputData = e.inputBuffer.getChannelData(0);
          // Clone the data since the buffer gets reused
          const samples = new Float32Array(inputData.length);
          samples.set(inputData);
          
          // Add to buffer (at native sample rate, will resample when sending)
          audioBufferRef.current.push(samples);
        };
        
        // Connect the processor (need to connect to destination for it to work)
        source.connect(processor);
        processor.connect(audioContextRef.current!.destination);
        
        // Send buffered audio every second as WAV chunks
        bufferIntervalRef.current = window.setInterval(() => {
          sendBufferedAudio();
        }, 1000);
        
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
    // Send any remaining buffered audio
    sendBufferedAudio();

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Clear buffer interval
    if (bufferIntervalRef.current) {
      clearInterval(bufferIntervalRef.current);
      bufferIntervalRef.current = null;
    }

    // Clear audio buffer
    audioBufferRef.current = [];

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
    if (isPaused) {
      isPausedRef.current = false;
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      isPausedRef.current = true;
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
