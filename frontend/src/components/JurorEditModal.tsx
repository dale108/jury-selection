import React, { useState, useEffect } from 'react';
import { Participant } from '../types';
import { JurorTags } from './JurorTags';
import { api, TranscriptSegment, JurorResponse } from '../services/api';
import './JurorEditModal.css';

interface Demographics {
  badgeNumber?: string;
  age?: number | string;
  education?: string;
  gender?: string;
  ethnicity?: string;
  phone?: string;
  email?: string;
  priorJuryService?: boolean;
  priorJuryDetails?: string;
  criminalConviction?: boolean;
  criminalConvictionDetails?: string;
  hardship?: boolean;
  hardshipDetails?: string;
}

interface JurorEditModalProps {
  juror: Participant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (jurorId: string, notes: string) => Promise<void>;
  isSaving?: boolean;
  error?: string | null;
  sessionId?: string | null;
  onStatusChange?: (jurorId: string, status: Participant['status']) => void;
  onTagsChange?: (jurorId: string, tags: string[]) => void;
  // Navigation props
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  currentIndex?: number;
  totalJurors?: number;
}

export const JurorEditModal: React.FC<JurorEditModalProps> = ({
  juror,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  error = null,
  sessionId = null,
  onStatusChange,
  onTagsChange,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
  currentIndex = -1,
  totalJurors = 0,
}) => {
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'tags' | 'transcript' | 'questionnaire'>('notes');
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [jurorDetails, setJurorDetails] = useState<JurorResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (juror) {
      setNotes(juror.notes || '');
      setTags(juror.tags || []);
      setActiveTab('notes');
    }
  }, [juror]);

  useEffect(() => {
    if (juror && sessionId && isOpen && juror.backendJurorId) {
      loadTranscriptSegments();
      loadJurorDetails();
    }
  }, [juror, sessionId, isOpen]);

  const loadJurorDetails = async () => {
    if (!juror?.backendJurorId) return;

    setIsLoadingDetails(true);
    try {
      const data = await api.jurors.get(juror.backendJurorId);
      setJurorDetails(data);
      setDemographics(data.demographics as Demographics || null);
    } catch (err: any) {
      console.error('Failed to load juror details:', err);
      setDemographics(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadTranscriptSegments = async () => {
    if (!juror?.backendJurorId || !sessionId) return;

    setIsLoadingTranscripts(true);
    try {
      const data = await api.transcripts.list({
        juror_id: juror.backendJurorId,
        limit: 500,
      });
      setTranscriptSegments(data.items);
    } catch (err: any) {
      console.error('Failed to load transcript segments:', err);
      setTranscriptSegments([]);
    } finally {
      setIsLoadingTranscripts(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !juror) return null;

  const handleSave = async () => {
    try {
      await onSave(juror.id, notes);
      // Also save tags if changed
      if (onTagsChange && JSON.stringify(tags) !== JSON.stringify(juror.tags || [])) {
        onTagsChange(juror.id, tags);
      }
      onClose();
    } catch (err) {
      // Error handled by parent
    }
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    // Immediately update tags (no need to wait for save)
    if (onTagsChange) {
      onTagsChange(juror.id, newTags);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStatusClick = (status: Participant['status']) => {
    if (onStatusChange) {
      onStatusChange(juror.id, status);
    }
  };

  const getStatusClass = (status: Participant['status']) => {
    return juror.status === status ? 'active' : '';
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            {/* Navigation Arrows */}
            {onNavigate && totalJurors > 1 && (
              <div className="modal-nav">
                <button 
                  className="modal-nav-btn"
                  onClick={() => onNavigate('prev')}
                  disabled={!canNavigatePrev}
                  aria-label="Previous juror"
                  title="Previous juror"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <span className="modal-nav-count">
                  {currentIndex + 1} / {totalJurors}
                </span>
                <button 
                  className="modal-nav-btn"
                  onClick={() => onNavigate('next')}
                  disabled={!canNavigateNext}
                  aria-label="Next juror"
                  title="Next juror"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            )}
            <div className="juror-badge">#{juror.seatNumber}</div>
            <div className="modal-title-group">
              <h2 className="modal-title">{juror.name}</h2>
              <span className="modal-subtitle">Juror Profile</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <span className="status-label">Assessment:</span>
          <div className="status-buttons">
            <button 
              className={`status-btn favorable ${getStatusClass('favorable')}`}
              onClick={() => handleStatusClick('favorable')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Favorable
            </button>
            <button 
              className={`status-btn neutral ${getStatusClass('neutral')}`}
              onClick={() => handleStatusClick('neutral')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-12h2v8h-2V5z"/>
              </svg>
              Neutral
            </button>
            <button 
              className={`status-btn unfavorable ${getStatusClass('unfavorable')}`}
              onClick={() => handleStatusClick('unfavorable')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
              </svg>
              Unfavorable
            </button>
            <button 
              className={`status-btn flagged ${getStatusClass('flagged')}`}
              onClick={() => handleStatusClick('flagged')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
              </svg>
              Flagged
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Notes
          </button>
          <button
            className={`modal-tab ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            Tags
            {tags.length > 0 && (
              <span className="tab-badge">{tags.length}</span>
            )}
          </button>
          <button
            className={`modal-tab ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            Transcript
            {transcriptSegments.length > 0 && (
              <span className="tab-badge">{transcriptSegments.length}</span>
            )}
          </button>
          <button
            className={`modal-tab ${activeTab === 'questionnaire' ? 'active' : ''}`}
            onClick={() => setActiveTab('questionnaire')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Questionnaire
            {demographics && <span className="tab-badge">✓</span>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-body">
          {activeTab === 'notes' && (
            <div className="notes-section">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add observations, concerns, or notes about this juror..."
                className="notes-textarea"
              />
              <div className="notes-footer">
                <span className="char-count">{notes.length} characters</span>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="tags-section">
              <p className="tags-description">
                Add tags to quickly categorize and filter jurors based on relevant characteristics.
              </p>
              <JurorTags 
                selectedTags={tags}
                onTagsChange={handleTagsChange}
                alwaysExpanded
              />
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="transcript-section">
              {isLoadingTranscripts && (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Loading transcript segments...</span>
                </div>
              )}

              {!isLoadingTranscripts && transcriptSegments.length === 0 && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p>No transcript segments found</p>
                  <span>
                    {juror.backendJurorId 
                      ? 'Map a speaker to this juror to see their transcript segments.'
                      : 'Save this session to enable transcript features.'}
                  </span>
                </div>
              )}

              {!isLoadingTranscripts && transcriptSegments.length > 0 && (
                <div className="transcript-list">
                  {transcriptSegments.map((segment) => (
                    <div key={segment.id} className="transcript-segment">
                      <div className="segment-timestamp">
                        {formatTime(segment.start_time)}
                      </div>
                      <div className="segment-content">{segment.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'questionnaire' && (
            <div className="questionnaire-section">
              {isLoadingDetails && (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Loading questionnaire data...</span>
                </div>
              )}

              {!isLoadingDetails && !demographics && !jurorDetails && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p>No questionnaire data available</p>
                  <span>Import juror questionnaires when creating a session to populate this data.</span>
                </div>
              )}

              {!isLoadingDetails && (demographics || jurorDetails) && (
                <div className="questionnaire-content">
                  {/* Basic Info */}
                  <div className="q-section">
                    <h3 className="q-section-title">Basic Information</h3>
                    <div className="q-grid">
                      {demographics?.badgeNumber && (
                        <div className="q-field">
                          <span className="q-label">Badge Number</span>
                          <span className="q-value">{demographics.badgeNumber}</span>
                        </div>
                      )}
                      <div className="q-field">
                        <span className="q-label">Name</span>
                        <span className="q-value">{juror.name}</span>
                      </div>
                      {demographics?.age && (
                        <div className="q-field">
                          <span className="q-label">Age</span>
                          <span className="q-value">{demographics.age}</span>
                        </div>
                      )}
                      {demographics?.gender && (
                        <div className="q-field">
                          <span className="q-label">Gender</span>
                          <span className="q-value">{demographics.gender}</span>
                        </div>
                      )}
                      {demographics?.ethnicity && (
                        <div className="q-field">
                          <span className="q-label">Race/Ethnicity</span>
                          <span className="q-value">{demographics.ethnicity}</span>
                        </div>
                      )}
                      {jurorDetails?.neighborhood && (
                        <div className="q-field">
                          <span className="q-label">City/Neighborhood</span>
                          <span className="q-value">{jurorDetails.neighborhood}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employment & Education */}
                  <div className="q-section">
                    <h3 className="q-section-title">Employment & Education</h3>
                    <div className="q-grid">
                      {jurorDetails?.occupation && (
                        <div className="q-field full-width">
                          <span className="q-label">Occupation</span>
                          <span className="q-value">{jurorDetails.occupation}</span>
                        </div>
                      )}
                      {demographics?.education && (
                        <div className="q-field full-width">
                          <span className="q-label">Education Level</span>
                          <span className="q-value">{demographics.education}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(demographics?.phone || demographics?.email) && (
                    <div className="q-section">
                      <h3 className="q-section-title">Contact Information</h3>
                      <div className="q-grid">
                        {demographics?.phone && (
                          <div className="q-field">
                            <span className="q-label">Phone</span>
                            <span className="q-value">{demographics.phone}</span>
                          </div>
                        )}
                        {demographics?.email && (
                          <div className="q-field">
                            <span className="q-label">Email</span>
                            <span className="q-value">{demographics.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legal History */}
                  <div className="q-section">
                    <h3 className="q-section-title">Legal History</h3>
                    <div className="q-grid">
                      <div className="q-field">
                        <span className="q-label">Prior Jury Service</span>
                        <span className={`q-value q-badge ${demographics?.priorJuryService ? 'yes' : 'no'}`}>
                          {demographics?.priorJuryService ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {demographics?.priorJuryDetails && (
                        <div className="q-field full-width">
                          <span className="q-label">Prior Jury Details</span>
                          <span className="q-value">{demographics.priorJuryDetails}</span>
                        </div>
                      )}
                      <div className="q-field">
                        <span className="q-label">Criminal Conviction</span>
                        <span className={`q-value q-badge ${demographics?.criminalConviction ? 'alert' : 'no'}`}>
                          {demographics?.criminalConviction ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {demographics?.criminalConvictionDetails && (
                        <div className="q-field full-width">
                          <span className="q-label">Conviction Details</span>
                          <span className="q-value">{demographics.criminalConvictionDetails}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hardship */}
                  {(demographics?.hardship || demographics?.hardshipDetails) && (
                    <div className="q-section">
                      <h3 className="q-section-title">Hardship Claim</h3>
                      <div className="q-grid">
                        <div className="q-field">
                          <span className="q-label">Claims Hardship</span>
                          <span className={`q-value q-badge ${demographics?.hardship ? 'alert' : 'no'}`}>
                            {demographics?.hardship ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {demographics?.hardshipDetails && (
                          <div className="q-field full-width">
                            <span className="q-label">Hardship Details</span>
                            <span className="q-value">{demographics.hardshipDetails}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {(activeTab === 'notes' || activeTab === 'tags') && (
          <div className="modal-footer">
            {error && (
              <div className="error-banner">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}
            <div className="footer-actions">
              <button className="btn-cancel" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button 
                className="btn-save" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="btn-spinner"></div>
                    Saving...
                  </>
                ) : (
                  activeTab === 'notes' ? 'Save Notes' : 'Done'
                )}
              </button>
            </div>
          </div>
        )}

        {(activeTab === 'transcript' || activeTab === 'questionnaire') && (
          <div className="modal-footer">
            <div className="footer-actions">
              <button className="btn-cancel" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
