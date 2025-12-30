/**
 * API Service - Centralized API client with error handling
 */
import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Error message mapping for user-friendly messages
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'You are not authorized. Please log in.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This operation conflicts with existing data.',
  422: 'The provided data is invalid.',
  429: 'Too many requests. Please try again later.',
  500: 'An unexpected server error occurred.',
  502: 'The server is temporarily unavailable.',
  503: 'Service is currently unavailable. Please try again later.',
};

// Parse error response for user-friendly message
const parseErrorMessage = (error: AxiosError): string => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to connect to server. Please check your connection.';
    }
    return 'An unexpected error occurred. Please try again.';
  }

  const { status, data } = error.response;
  
  // Try to extract message from response data
  if (typeof data === 'object' && data !== null) {
    const responseData = data as Record<string, unknown>;
    
    // FastAPI standard error format
    if (typeof responseData.detail === 'string') {
      return responseData.detail;
    }
    
    // Pydantic validation errors
    if (Array.isArray(responseData.detail)) {
      const messages = responseData.detail
        .map((err: { msg?: string; message?: string }) => err.msg || err.message)
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join('. ');
      }
    }
    
    if (typeof responseData.message === 'string') {
      return responseData.message;
    }
  }

  return ERROR_MESSAGES[status] || `Request failed with status ${status}`;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = parseErrorMessage(error);
    const status = error.response?.status || 0;
    const code = error.code;
    const details = error.response?.data;

    console.error(`API Error [${status}]:`, message, details);

    throw new ApiError(message, status, code, details);
  }
);

// Type definitions
export interface SessionCreate {
  case_number: string;
  case_name: string;
  court: string;
  metadata?: Record<string, unknown>;
}

export interface SessionResponse {
  id: string;
  case_number: string;
  case_name: string;
  court: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface JurorCreate {
  session_id: string;
  seat_number: number;
  first_name: string;
  last_name: string;
  occupation?: string;
  neighborhood?: string;
  notes?: string;
  demographics?: Record<string, unknown>;
  flags?: Record<string, unknown>;
}

export interface JurorUpdate {
  seat_number?: number;
  first_name?: string;
  last_name?: string;
  occupation?: string;
  neighborhood?: string;
  notes?: string;
  demographics?: Record<string, unknown>;
  flags?: Record<string, unknown>;
}

export interface JurorResponse {
  id: string;
  session_id: string;
  seat_number: number;
  first_name: string;
  last_name: string;
  occupation?: string;
  neighborhood?: string;
  notes?: string;
  demographics?: Record<string, unknown>;
  flags?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: string;
  session_id: string;
  speaker_label: string;
  content: string;
  start_time: number;
  end_time: number;
  confidence: number;
  audio_recording_id?: string;
  created_at: string;
}

export interface TranscriptList {
  items: TranscriptSegment[];
  total: number;
  session_id?: string;
}

export interface TranscriptByJuror {
  speaker_label: string;
  juror_id?: string;
  juror_name?: string;
  segments: TranscriptSegment[];
  total_speaking_time: number;
}

export interface SpeakerMappingResponse {
  id: string;
  session_id: string;
  juror_id: string;
  speaker_label: string;
  created_at: string;
}

export interface SystemModeResponse {
  mode: 'demo' | 'live';
  demo_mode: boolean;
  description: string;
}

// API methods
export const api = {
  // Sessions
  sessions: {
    create: async (data: SessionCreate): Promise<SessionResponse> => {
      const response = await apiClient.post<SessionResponse>('/sessions/', data);
      return response.data;
    },
    get: async (id: string): Promise<SessionResponse> => {
      const response = await apiClient.get<SessionResponse>(`/sessions/${id}`);
      return response.data;
    },
    list: async (): Promise<{ items: SessionResponse[]; total: number }> => {
      const response = await apiClient.get<{ items: SessionResponse[]; total: number }>('/sessions/');
      return response.data;
    },
    updateStatus: async (id: string, status: string): Promise<SessionResponse> => {
      const response = await apiClient.patch<SessionResponse>(`/sessions/${id}/status`, { status });
      return response.data;
    },
    update: async (id: string, data: Partial<SessionResponse>): Promise<SessionResponse> => {
      const response = await apiClient.put<SessionResponse>(`/sessions/${id}`, data);
      return response.data;
    },
  },

  // Jurors
  jurors: {
    create: async (data: JurorCreate): Promise<JurorResponse> => {
      const response = await apiClient.post<JurorResponse>('/jurors/', data);
      return response.data;
    },
    get: async (id: string): Promise<JurorResponse> => {
      const response = await apiClient.get<JurorResponse>(`/jurors/${id}`);
      return response.data;
    },
    list: async (sessionId: string): Promise<{ items: JurorResponse[]; total: number }> => {
      const response = await apiClient.get<{ items: JurorResponse[]; total: number }>('/jurors/', {
        params: { session_id: sessionId },
      });
      return response.data;
    },
    update: async (id: string, data: JurorUpdate): Promise<JurorResponse> => {
      const response = await apiClient.put<JurorResponse>(`/jurors/${id}`, data);
      return response.data;
    },
    mapSpeaker: async (jurorId: string, speakerLabel: string): Promise<void> => {
      await apiClient.post(`/jurors/${jurorId}/speaker-mapping`, { speaker_label: speakerLabel });
    },
  },

  // Transcripts
  transcripts: {
    list: async (params?: {
      session_id?: string;
      juror_id?: string;
      speaker_label?: string;
      start_time_min?: number;
      start_time_max?: number;
      search?: string;
      skip?: number;
      limit?: number;
    }): Promise<TranscriptList> => {
      const response = await apiClient.get<TranscriptList>('/transcripts/', { params });
      return response.data;
    },
    getBySpeaker: async (sessionId: string): Promise<TranscriptByJuror[]> => {
      const response = await apiClient.get<TranscriptByJuror[]>(`/transcripts/session/${sessionId}/by-speaker`);
      return response.data;
    },
  },

  // Speaker Mappings
  speakerMappings: {
    list: async (sessionId: string): Promise<SpeakerMappingResponse[]> => {
      const response = await apiClient.get<SpeakerMappingResponse[]>(`/jurors/session/${sessionId}/speaker-mappings`);
      return response.data;
    },
  },

  // System
  system: {
    getMode: async (): Promise<SystemModeResponse> => {
      const response = await apiClient.get<SystemModeResponse>('/transcripts/mode');
      return response.data;
    },
  },
};

export default api;
