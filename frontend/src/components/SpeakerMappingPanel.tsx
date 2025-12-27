import React, { useState, useEffect } from 'react';
import { api, JurorResponse } from '../services/api';
import { Participant } from '../types';
import './SpeakerMappingPanel.css';

interface SpeakerMappingPanelProps {
  sessionId: string | null;
  jurors: JurorResponse[];
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  onMappingUpdate?: () => void;
  embedded?: boolean;
}

interface SpeakerInfo {
  label: string;
  mappedTo?: {
    type: 'juror' | 'defense' | 'prosecutor';
    id: string;
    name: string;
    seatNumber?: number;
  };
  segmentCount: number;
}

interface ParticipantMapping {
  speaker_label: string;
  participant_type: 'juror' | 'defense' | 'prosecutor';
  participant_id: string;
  participant_name: string;
  seat_number?: number;
}

export const SpeakerMappingPanel: React.FC<SpeakerMappingPanelProps> = ({
  sessionId,
  jurors,
  participants,
  isOpen,
  onClose,
  onMappingUpdate,
  embedded = false,
}) => {
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappingSpeaker, setMappingSpeaker] = useState<{ speaker: string; participantType: 'juror' | 'defense' | 'prosecutor'; participantId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [participantMappings, setParticipantMappings] = useState<Map<string, ParticipantMapping>>(new Map());

  useEffect(() => {
    if (sessionId && isOpen) {
      loadSpeakerInfo();
      loadParticipantMappings();
    }
  }, [sessionId, isOpen, jurors, participants]);

  const loadParticipantMappings = async () => {
    if (!sessionId) return;

    try {
      const session = await api.sessions.get(sessionId);
      const mappings = session.metadata?.speaker_mappings || [];
      const mappingMap = new Map<string, ParticipantMapping>();
      mappings.forEach((m: ParticipantMapping) => {
        mappingMap.set(m.speaker_label, m);
      });
      setParticipantMappings(mappingMap);
    } catch (err) {
      console.error('Failed to load participant mappings:', err);
    }
  };

  const saveParticipantMappings = async (mappings: ParticipantMapping[]) => {
    if (!sessionId) return;

    try {
      const session = await api.sessions.get(sessionId);
      const updatedMetadata = {
        ...(session.metadata || {}),
        speaker_mappings: mappings,
      };
      
      try {
        await api.sessions.update(sessionId, { metadata: updatedMetadata });
      } catch (updateErr) {
        console.warn('Could not save to backend, storing locally:', updateErr);
      }
      
      const mappingMap = new Map<string, ParticipantMapping>();
      mappings.forEach((m) => {
        mappingMap.set(m.speaker_label, m);
      });
      setParticipantMappings(mappingMap);
    } catch (err) {
      console.error('Failed to save participant mappings:', err);
    }
  };

  const loadSpeakerInfo = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const transcriptsBySpeaker = await api.transcripts.getBySpeaker(sessionId);
      const speakerMap = new Map<string, SpeakerInfo>();

      transcriptsBySpeaker.forEach((group) => {
        let mappedTo: SpeakerInfo['mappedTo'] | undefined;
        
        if (group.juror_id) {
          const juror = jurors.find(j => j.id === group.juror_id);
          if (juror) {
            mappedTo = {
              type: 'juror',
              id: juror.id,
              name: `${juror.first_name} ${juror.last_name}`,
              seatNumber: juror.seat_number,
            };
          }
        }
        
        if (!mappedTo) {
          const participantMapping = participantMappings.get(group.speaker_label);
          if (participantMapping) {
            const participant = participants.find(p => {
              if (participantMapping.participant_type === 'defense' && p.role === 'defense') {
                return p.id === participantMapping.participant_id || p.seatNumber === participantMapping.seat_number;
              }
              if (participantMapping.participant_type === 'prosecutor' && p.role === 'prosecutor') {
                return p.id === participantMapping.participant_id || p.seatNumber === participantMapping.seat_number;
              }
              return false;
            });
            
            if (participant) {
              mappedTo = {
                type: participantMapping.participant_type,
                id: participant.id,
                name: participant.name,
                seatNumber: participant.seatNumber,
              };
            }
          }
        }

        speakerMap.set(group.speaker_label, {
          label: group.speaker_label,
          mappedTo,
          segmentCount: group.segments.length,
        });
      });

      setSpeakers(Array.from(speakerMap.values()).sort((a, b) => a.label.localeCompare(b.label)));
    } catch (err: any) {
      console.error('Failed to load speaker info:', err);
      let errorMessage = 'Failed to load speaker information';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((e: any) => (typeof e === 'string' ? e : e.msg || String(e)))
            .join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(String(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapSpeaker = async (speakerLabel: string, participantType: 'juror' | 'defense' | 'prosecutor', participantId: string) => {
    setIsSaving(true);
    setError(null);

    try {
      if (participantType === 'juror') {
        await api.jurors.mapSpeaker(participantId, speakerLabel);
      } else {
        const participant = participants.find(p => {
          if (participantType === 'defense' && p.role === 'defense') {
            return p.id === participantId || (p.seatNumber && p.seatNumber.toString() === participantId);
          }
          if (participantType === 'prosecutor' && p.role === 'prosecutor') {
            return p.id === participantId || (p.seatNumber && p.seatNumber.toString() === participantId);
          }
          return false;
        });

        if (!participant) {
          throw new Error('Participant not found');
        }

        const newMapping: ParticipantMapping = {
          speaker_label: speakerLabel,
          participant_type: participantType,
          participant_id: participant.id,
          participant_name: participant.name,
          seat_number: participant.seatNumber,
        };

        const currentMappings = Array.from(participantMappings.values());
        const updatedMappings = currentMappings.filter(m => m.speaker_label !== speakerLabel);
        updatedMappings.push(newMapping);
        
        await saveParticipantMappings(updatedMappings);
      }

      await loadSpeakerInfo();
      onMappingUpdate?.();
    } catch (err: any) {
      console.error('Failed to map speaker:', err);
      let errorMessage = 'Failed to map speaker';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((e: any) => (typeof e === 'string' ? e : e.msg || String(e)))
            .join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(String(errorMessage));
    } finally {
      setIsSaving(false);
      setMappingSpeaker(null);
    }
  };

  const getAvailableParticipants = (type: 'juror' | 'defense' | 'prosecutor') => {
    if (type === 'juror') {
      return jurors.map(j => ({
        id: j.id,
        name: `${j.first_name} ${j.last_name}`,
        seatNumber: j.seat_number,
      }));
    } else {
      return participants
        .filter(p => p.role === type)
        .map(p => ({
          id: p.id,
          name: p.name,
          seatNumber: p.seatNumber,
        }));
    }
  };

  if (!isOpen && !embedded) return null;

  // Embedded mode
  if (embedded) {
    return (
      <div className="mapping-embedded">
        {isLoading && (
          <div className="mapping-loading">
            <div className="loading-spinner"></div>
            <span>Loading speakers...</span>
          </div>
        )}

        {error && (
          <div className="mapping-error">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && speakers.length === 0 && (
          <div className="mapping-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 15c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z"/>
              <path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2"/>
            </svg>
            <p>No speakers found</p>
            <span>Load a transcript to map speakers</span>
          </div>
        )}

        {!isLoading && !error && speakers.length > 0 && (
          <div className="speaker-cards">
            {speakers.map((speaker) => (
              <div 
                key={speaker.label} 
                className={`speaker-card ${speaker.mappedTo ? 'mapped' : ''}`}
              >
                <div className="speaker-card-header">
                  <div className="speaker-badge">{speaker.label}</div>
                  <span className="segment-count">{speaker.segmentCount} segments</span>
                </div>

                {speaker.mappedTo ? (
                  <div className="mapped-info">
                    <span className={`mapped-tag ${speaker.mappedTo.type}`}>
                      {speaker.mappedTo.type === 'juror' 
                        ? `Juror ${speaker.mappedTo.seatNumber}` 
                        : speaker.mappedTo.name}
                    </span>
                    <button
                      className="btn-change"
                      onClick={() => setMappingSpeaker({ 
                        speaker: speaker.label, 
                        participantType: speaker.mappedTo!.type,
                        participantId: speaker.mappedTo!.id 
                      })}
                      disabled={isSaving}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-map"
                    onClick={() => {
                      if (jurors.length > 0) {
                        setMappingSpeaker({ speaker: speaker.label, participantType: 'juror', participantId: jurors[0].id });
                      } else if (participants.filter(p => p.role === 'defense').length > 0) {
                        const firstDefense = participants.find(p => p.role === 'defense');
                        if (firstDefense) {
                          setMappingSpeaker({ speaker: speaker.label, participantType: 'defense', participantId: firstDefense.id });
                        }
                      }
                    }}
                    disabled={isSaving || (jurors.length === 0 && participants.filter(p => p.role === 'defense' || p.role === 'prosecutor').length === 0)}
                  >
                    + Map Speaker
                  </button>
                )}

                {mappingSpeaker?.speaker === speaker.label && (
                  <div className="mapping-form">
                    <div className="form-group">
                      <label>Type</label>
                      <select
                        value={mappingSpeaker.participantType}
                        onChange={(e) => {
                          const type = e.target.value as 'juror' | 'defense' | 'prosecutor';
                          const available = getAvailableParticipants(type);
                          if (available.length > 0) {
                            setMappingSpeaker({ speaker: speaker.label, participantType: type, participantId: available[0].id });
                          }
                        }}
                      >
                        {jurors.length > 0 && <option value="juror">Juror</option>}
                        {participants.filter(p => p.role === 'defense').length > 0 && <option value="defense">Defense</option>}
                        {participants.filter(p => p.role === 'prosecutor').length > 0 && <option value="prosecutor">Prosecutor</option>}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Participant</label>
                      <select
                        value={mappingSpeaker.participantId}
                        onChange={(e) => setMappingSpeaker({ ...mappingSpeaker, participantId: e.target.value })}
                      >
                        {getAvailableParticipants(mappingSpeaker.participantType).map((p) => (
                          <option key={p.id} value={p.id}>
                            {mappingSpeaker.participantType === 'juror' 
                              ? `Seat ${p.seatNumber} - ${p.name}`
                              : p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-actions">
                      <button
                        className="btn-save"
                        onClick={() => handleMapSpeaker(speaker.label, mappingSpeaker.participantType, mappingSpeaker.participantId)}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => setMappingSpeaker(null)}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Modal mode (legacy)
  return (
    <div className="speaker-mapping-overlay" onClick={onClose}>
      <div className="speaker-mapping-panel" onClick={(e) => e.stopPropagation()}>
        <div className="speaker-mapping-header">
          <h2>Map Speakers</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        {/* ... */}
      </div>
    </div>
  );
};
