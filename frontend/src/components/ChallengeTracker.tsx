import React, { useState } from 'react';
import { Participant, ChallengeConfig } from '../types';
import './ChallengeTracker.css';

interface ChallengeTrackerProps {
  participants: Participant[];
  challengeConfig: ChallengeConfig;
  onChallengeConfigChange: (config: ChallengeConfig) => void;
  onChallengeJuror: (jurorId: string, type: 'peremptory' | 'cause', reason?: string) => void;
  onRemoveChallenge: (jurorId: string) => void;
}

export const ChallengeTracker: React.FC<ChallengeTrackerProps> = ({
  participants,
  challengeConfig,
  onChallengeConfigChange,
  onChallengeJuror,
  onRemoveChallenge,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCauseModal, setShowCauseModal] = useState(false);
  const [selectedJurorId, setSelectedJurorId] = useState<string | null>(null);
  const [causeReason, setCauseReason] = useState('');

  const jurors = participants.filter(p => p.role === 'juror');
  const challengedJurors = jurors.filter(p => p.challenged);
  const peremptoryChallenges = jurors.filter(p => p.challenged === 'peremptory');
  const causeChallenges = jurors.filter(p => p.challenged === 'cause');
  const remainingPeremptory = challengeConfig.peremptoryTotal - challengeConfig.peremptoryUsed;

  const handleCauseChallenge = () => {
    if (selectedJurorId && causeReason.trim()) {
      onChallengeJuror(selectedJurorId, 'cause', causeReason);
      setShowCauseModal(false);
      setSelectedJurorId(null);
      setCauseReason('');
    }
  };

  const getProgressColor = (remaining: number, total: number) => {
    const ratio = remaining / total;
    if (ratio > 0.5) return 'var(--color-favorable)';
    if (ratio > 0.2) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className={`challenge-tracker ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="tracker-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="tracker-title">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
          </svg>
          <span>Challenge Tracker</span>
        </div>
        <div className="tracker-summary">
          <span className={`peremptory-badge ${remainingPeremptory <= 2 ? 'warning' : ''}`}>
            {remainingPeremptory} left
          </span>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`chevron ${isExpanded ? 'up' : 'down'}`}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="tracker-content">
          {/* Peremptory Challenges */}
          <div className="challenge-section">
            <div className="section-header">
              <h4>Peremptory Strikes</h4>
              <div className="strikes-info">
                {challengeConfig.peremptoryUsed} of {challengeConfig.peremptoryTotal} used
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${(remainingPeremptory / challengeConfig.peremptoryTotal) * 100}%`,
                  backgroundColor: getProgressColor(remainingPeremptory, challengeConfig.peremptoryTotal)
                }}
              />
              <span className="progress-text">
                {remainingPeremptory} remaining
              </span>
            </div>

            <div className="strike-controls">
              <button 
                className="strike-btn use-strike"
                onClick={() => onChallengeConfigChange({
                  ...challengeConfig,
                  peremptoryUsed: Math.min(challengeConfig.peremptoryTotal, challengeConfig.peremptoryUsed + 1)
                })}
                disabled={remainingPeremptory === 0}
                title="Use a peremptory strike"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14"/>
                </svg>
                Use Strike
              </button>
              <button 
                className="strike-btn undo-strike"
                onClick={() => onChallengeConfigChange({
                  ...challengeConfig,
                  peremptoryUsed: Math.max(0, challengeConfig.peremptoryUsed - 1)
                })}
                disabled={challengeConfig.peremptoryUsed === 0}
                title="Undo last strike"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Undo
              </button>
            </div>

            {peremptoryChallenges.length > 0 && (
              <div className="challenge-list">
                {peremptoryChallenges.map(juror => (
                  <div key={juror.id} className="challenge-item peremptory">
                    <span className="juror-info">
                      <span className="seat">#{juror.seatNumber}</span>
                      {juror.name}
                    </span>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemoveChallenge(juror.id)}
                      title="Remove challenge"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cause Challenges */}
          <div className="challenge-section">
            <div className="section-header">
              <h4>Challenges for Cause</h4>
              <span className="cause-count">{causeChallenges.length} filed</span>
            </div>

            {causeChallenges.length > 0 && (
              <div className="challenge-list">
                {causeChallenges.map(juror => (
                  <div key={juror.id} className="challenge-item cause">
                    <div className="juror-info">
                      <span className="seat">#{juror.seatNumber}</span>
                      {juror.name}
                    </div>
                    <div className="cause-reason">{juror.challengeReason}</div>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemoveChallenge(juror.id)}
                      title="Remove challenge"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="tracker-stats">
            <div className="stat">
              <span className="stat-value">{jurors.length - challengedJurors.length}</span>
              <span className="stat-label">In Panel</span>
            </div>
            <div className="stat">
              <span className="stat-value favorable">
                {jurors.filter(j => j.status === 'favorable' && !j.challenged).length}
              </span>
              <span className="stat-label">Favorable</span>
            </div>
            <div className="stat">
              <span className="stat-value unfavorable">
                {jurors.filter(j => j.status === 'unfavorable' && !j.challenged).length}
              </span>
              <span className="stat-label">Unfavorable</span>
            </div>
          </div>
        </div>
      )}

      {/* Cause Challenge Modal */}
      {showCauseModal && (
        <div className="modal-overlay" onClick={() => setShowCauseModal(false)}>
          <div className="cause-modal" onClick={e => e.stopPropagation()}>
            <h3>Challenge for Cause</h3>
            <div className="form-group">
              <label>Select Juror</label>
              <select 
                value={selectedJurorId || ''}
                onChange={e => setSelectedJurorId(e.target.value)}
              >
                <option value="">Choose a juror...</option>
                {jurors.filter(j => !j.challenged).map(juror => (
                  <option key={juror.id} value={juror.id}>
                    #{juror.seatNumber} - {juror.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Reason for Cause</label>
              <select
                value={causeReason}
                onChange={e => setCauseReason(e.target.value)}
              >
                <option value="">Select reason...</option>
                <option value="Cannot be fair and impartial">Cannot be fair and impartial</option>
                <option value="Bias against defendant">Bias against defendant</option>
                <option value="Cannot follow law as instructed">Cannot follow law as instructed</option>
                <option value="Personal connection to case">Personal connection to case</option>
                <option value="Prior knowledge of case">Prior knowledge of case</option>
                <option value="Hardship">Hardship</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {causeReason === 'Other' && (
              <div className="form-group">
                <label>Specify Reason</label>
                <input
                  type="text"
                  placeholder="Enter reason..."
                  onChange={e => setCauseReason(e.target.value)}
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCauseModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-submit"
                onClick={handleCauseChallenge}
                disabled={!selectedJurorId || !causeReason.trim()}
              >
                File Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

