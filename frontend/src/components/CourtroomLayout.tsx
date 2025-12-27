import React from 'react';
import { Participant, JurorTagKey } from '../types';
import { JurorTags } from './JurorTags';
import './CourtroomLayout.css';

interface CourtroomLayoutProps {
  participants: Participant[];
  jurorsPerRow?: number;
  onJurorClick?: (juror: Participant) => void;
  onJurorStatusChange?: (jurorId: string, status: Participant['status']) => void;
  onTagsChange?: (jurorId: string, tags: JurorTagKey[]) => void;
  onChallengeJuror?: (jurorId: string, type: 'peremptory' | 'cause') => void;
  onRemoveChallenge?: (jurorId: string) => void;
}

export const CourtroomLayout: React.FC<CourtroomLayoutProps> = ({ 
  participants, 
  jurorsPerRow = 6,
  onJurorClick,
  onJurorStatusChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTagsChange: _onTagsChange,
  onChallengeJuror,
  onRemoveChallenge,
}) => {
  const judge = participants.find(p => p.role === 'judge');
  const jurors = participants.filter(p => p.role === 'juror').sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
  const defense = participants.filter(p => p.role === 'defense').sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
  const prosecutors = participants.filter(p => p.role === 'prosecutor').sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

  // Group jurors into rows
  const jurorRows: Participant[][] = [];
  for (let i = 0; i < jurors.length; i += jurorsPerRow) {
    jurorRows.push(jurors.slice(i, i + jurorsPerRow));
  }

  const getStatusClass = (status?: Participant['status']) => {
    if (!status) return '';
    return `status-${status}`;
  };

  const handleQuickStatus = (e: React.MouseEvent, juror: Participant, status: Participant['status']) => {
    e.stopPropagation();
    onJurorStatusChange?.(juror.id, status);
  };

  const handleStrike = (e: React.MouseEvent, juror: Participant) => {
    e.stopPropagation();
    onChallengeJuror?.(juror.id, 'peremptory');
  };

  const handleUndoChallenge = (e: React.MouseEvent, juror: Participant) => {
    e.stopPropagation();
    onRemoveChallenge?.(juror.id);
  };

  return (
    <div className="courtroom">
      {/* Courtroom Header */}
      <div className="courtroom-header">
        <div className="bench-area">
          {judge && (
            <div className="judge-bench">
              <div className="bench-label">The Bench</div>
              <div className="judge-card">
                <div className="judge-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z"/>
                  </svg>
                </div>
                <div className="judge-info">
                  <div className="judge-title">Presiding Judge</div>
                  <div className="judge-name">{judge.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Counsel Tables */}
      <div className="counsel-area">
        <div className="counsel-table defense-table">
          <div className="table-header">
            <div className="table-icon defense-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <span>Defense</span>
          </div>
          <div className="counsel-seats">
            {defense.map((counsel, idx) => (
              <div key={counsel.id} className="counsel-seat">
                <div className="counsel-number">{idx + 1}</div>
                <div className="counsel-name">{counsel.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="well-area">
          <div className="well-label">The Well</div>
        </div>

        <div className="counsel-table prosecution-table">
          <div className="table-header">
            <div className="table-icon prosecution-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <span>Prosecution</span>
          </div>
          <div className="counsel-seats">
            {prosecutors.map((prosecutor, idx) => (
              <div key={prosecutor.id} className="counsel-seat">
                <div className="counsel-number">{idx + 1}</div>
                <div className="counsel-name">{prosecutor.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Jury Box */}
      <div className="jury-area">
        <div className="jury-box-header">
          <h3>Jury Panel</h3>
          <div className="jury-legend">
            <div className="legend-item favorable">
              <span className="legend-dot"></span>
              Favorable
            </div>
            <div className="legend-item unfavorable">
              <span className="legend-dot"></span>
              Unfavorable
            </div>
            <div className="legend-item flagged">
              <span className="legend-dot"></span>
              Flagged
            </div>
            <div className="legend-item struck">
              <span className="legend-dot"></span>
              Struck
            </div>
            <div className="legend-item cause">
              <span className="legend-dot"></span>
              For Cause
            </div>
          </div>
        </div>
        
        <div className="jury-box">
          {jurorRows.map((row, rowIndex) => (
            <div key={rowIndex} className="jury-row">
              {row.map((juror) => (
                <div 
                  key={juror.id} 
                  className={`juror-card ${getStatusClass(juror.status)} ${juror.notes ? 'has-notes' : ''} ${juror.challenged ? 'challenged' : ''}`}
                  onClick={() => !juror.challenged && onJurorClick?.(juror)}
                >
                  {/* Challenge Overlay */}
                  {juror.challenged && (
                    <div className={`challenge-overlay ${juror.challenged}`}>
                      <div className="challenge-icon">
                        {juror.challenged === 'peremptory' ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
                          </svg>
                        )}
                      </div>
                      <span className="challenge-label">
                        {juror.challenged === 'peremptory' ? 'STRUCK' : 'FOR CAUSE'}
                      </span>
                      {juror.challengeReason && (
                        <span className="challenge-reason">{juror.challengeReason}</span>
                      )}
                      <button 
                        className="challenge-undo"
                        onClick={(e) => handleUndoChallenge(e, juror)}
                        title="Undo challenge"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                  
                  <div className="juror-header">
                    <div className="juror-seat">#{juror.seatNumber}</div>
                    <div className="juror-badges">
                      {juror.notes && (
                        <div className="juror-notes-badge" title="Has notes">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                          </svg>
                        </div>
                      )}
                      {/* Show tag icons */}
                      <JurorTags selectedTags={juror.tags || []} onTagsChange={() => {}} compact readOnly />
                    </div>
                  </div>
                  <div className="juror-name">{juror.name}</div>
                  
                  {/* Quick Status Buttons */}
                  {!juror.challenged && (
                    <div className="quick-actions">
                      <button 
                        className={`quick-btn favorable ${juror.status === 'favorable' ? 'active' : ''}`}
                        onClick={(e) => handleQuickStatus(e, juror, 'favorable')}
                        title="Mark as favorable"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </button>
                      <button 
                        className={`quick-btn unfavorable ${juror.status === 'unfavorable' ? 'active' : ''}`}
                        onClick={(e) => handleQuickStatus(e, juror, 'unfavorable')}
                        title="Mark as unfavorable"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                        </svg>
                      </button>
                      <button 
                        className={`quick-btn flagged ${juror.status === 'flagged' ? 'active' : ''}`}
                        onClick={(e) => handleQuickStatus(e, juror, 'flagged')}
                        title="Flag for review"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
                        </svg>
                      </button>
                      <button 
                        className="quick-btn strike"
                        onClick={(e) => handleStrike(e, juror)}
                        title="Strike juror (peremptory)"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
