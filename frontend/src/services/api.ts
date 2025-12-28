import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SessionCreate {
  case_number: string;
  case_name: string;
  court: string;
  metadata?: Record<string, any>;
}

export interface SessionResponse {
  id: string;
  case_number: string;
  case_name: string;
  court: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  metadata?: Record<string, any>;
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
  demographics?: Record<string, any>;
  flags?: Record<string, any>;
}

export interface JurorUpdate {
  seat_number?: number;
  first_name?: string;
  last_name?: string;
  occupation?: string;
  neighborhood?: string;
  notes?: string;
  demographics?: Record<string, any>;
  flags?: Record<string, any>;
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
  demographics?: Record<string, any>;
  flags?: Record<string, any>;
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
    list: async (sessionId: string): Promise<{ id: string; session_id: string; juror_id: string; speaker_label: string; created_at: string }[]> => {
      const response = await apiClient.get(`/jurors/session/${sessionId}/speaker-mappings`);
      return response.data;
    },
  },

  // System
  system: {
    getMode: async (): Promise<{ mode: 'demo' | 'live'; demo_mode: boolean; description: string }> => {
      const response = await apiClient.get('/transcripts/mode');
      return response.data;
    },
  },
};

export default api;
