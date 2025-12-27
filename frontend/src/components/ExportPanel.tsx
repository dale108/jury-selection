import React, { useState } from 'react';
import { Participant, QuickNote, ChallengeConfig } from '../types';
import { api } from '../services/api';
import './ExportPanel.css';

interface ExportPanelProps {
  sessionId: string;
  participants: Participant[];
  quickNotes: QuickNote[];
  challengeConfig: ChallengeConfig;
  caseName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  sessionId,
  participants,
  quickNotes,
  challengeConfig,
  caseName = 'Voir Dire Session',
  isOpen,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const jurors = participants.filter(p => p.role === 'juror');
  const challengedJurors = jurors.filter(p => p.challenged);
  const favorableJurors = jurors.filter(p => p.status === 'favorable' && !p.challenged);
  const unfavorableJurors = jurors.filter(p => p.status === 'unfavorable' && !p.challenged);

  const generateJurorNotesText = (): string => {
    let text = `JUROR NOTES - ${caseName}\n`;
    text += `Generated: ${formatDate(new Date())}\n`;
    text += `Session ID: ${sessionId}\n`;
    text += '='.repeat(60) + '\n\n';

    text += `SUMMARY\n`;
    text += '-'.repeat(40) + '\n';
    text += `Total Jurors: ${jurors.length}\n`;
    text += `Favorable: ${favorableJurors.length}\n`;
    text += `Unfavorable: ${unfavorableJurors.length}\n`;
    text += `Struck (Peremptory): ${challengeConfig.peremptoryUsed}\n`;
    text += `Challenged (For Cause): ${challengedJurors.filter(j => j.challenged === 'cause').length}\n`;
    text += '\n';

    text += `JUROR DETAILS\n`;
    text += '-'.repeat(40) + '\n\n';

    jurors.forEach(juror => {
      text += `#${juror.seatNumber} - ${juror.name}\n`;
      text += `Status: ${juror.challenged ? (juror.challenged === 'peremptory' ? 'STRUCK' : 'FOR CAUSE') : (juror.status || 'Neutral')}\n`;
      if (juror.challenged && juror.challengeReason) {
        text += `Challenge Reason: ${juror.challengeReason}\n`;
      }
      if (juror.tags && juror.tags.length > 0) {
        text += `Tags: ${juror.tags.join(', ')}\n`;
      }
      if (juror.notes) {
        text += `Notes:\n${juror.notes}\n`;
      }
      text += '\n';
    });

    return text;
  };

  const generateQuickNotesText = (): string => {
    let text = `QUICK NOTES - ${caseName}\n`;
    text += `Generated: ${formatDate(new Date())}\n`;
    text += '='.repeat(60) + '\n\n';

    if (quickNotes.length === 0) {
      text += 'No quick notes recorded.\n';
    } else {
      quickNotes
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(note => {
          const juror = note.jurorId 
            ? participants.find(p => p.id === note.jurorId)
            : null;
          text += `[${formatTime(note.timestamp)}]`;
          if (juror) {
            text += ` Juror #${juror.seatNumber}:`;
          }
          text += ` ${note.content}\n`;
        });
    }

    return text;
  };

  const generateTranscriptText = async (): Promise<string> => {
    let text = `TRANSCRIPT - ${caseName}\n`;
    text += `Generated: ${formatDate(new Date())}\n`;
    text += '='.repeat(60) + '\n\n';

    try {
      const transcriptData = await api.transcripts.list({
        session_id: sessionId,
        limit: 500,
      });

      // Get speaker mappings
      const speakerMappings = await api.speakerMappings.list(sessionId);
      const sessionData = await api.sessions.get(sessionId);
      
      const getSpeakerName = (speakerLabel: string): string => {
        // Check juror mappings
        const mapping = speakerMappings.find(m => m.speaker_label === speakerLabel);
        if (mapping) {
          const juror = jurors.find(j => j.backendJurorId === mapping.juror_id);
          if (juror) return `Juror #${juror.seatNumber}`;
        }
        
        // Check session metadata for counsel mappings
        const metadata = sessionData.metadata || {};
        if (metadata.speakerMappings) {
          const counselMapping = metadata.speakerMappings[speakerLabel];
          if (counselMapping) {
            return counselMapping.displayName;
          }
        }
        
        return speakerLabel;
      };

      if (transcriptData.items.length === 0) {
        text += 'No transcript segments available.\n';
      } else {
        transcriptData.items
          .sort((a, b) => a.start_time - b.start_time)
          .forEach(segment => {
            const speaker = getSpeakerName(segment.speaker_label);
            text += `[${formatTime(segment.start_time)}] ${speaker}:\n`;
            text += `${segment.content}\n\n`;
          });
      }
    } catch (err) {
      text += 'Error loading transcript.\n';
    }

    return text;
  };

  const generateFullReport = async (): Promise<string> => {
    let text = '='.repeat(60) + '\n';
    text += `VOIR DIRE REPORT\n`;
    text += `${caseName}\n`;
    text += '='.repeat(60) + '\n';
    text += `Generated: ${formatDate(new Date())}\n`;
    text += `Session ID: ${sessionId}\n\n`;

    text += generateJurorNotesText();
    text += '\n' + '='.repeat(60) + '\n\n';
    text += generateQuickNotesText();
    text += '\n' + '='.repeat(60) + '\n\n';
    text += await generateTranscriptText();

    return text;
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: 'jurors' | 'notes' | 'transcript' | 'full') => {
    setIsExporting(true);
    setExportStatus(`Generating ${type} export...`);

    try {
      let content = '';
      let filename = '';
      const dateStr = new Date().toISOString().split('T')[0];

      switch (type) {
        case 'jurors':
          content = generateJurorNotesText();
          filename = `juror-notes-${dateStr}.txt`;
          break;
        case 'notes':
          content = generateQuickNotesText();
          filename = `quick-notes-${dateStr}.txt`;
          break;
        case 'transcript':
          content = await generateTranscriptText();
          filename = `transcript-${dateStr}.txt`;
          break;
        case 'full':
          content = await generateFullReport();
          filename = `voir-dire-report-${dateStr}.txt`;
          break;
      }

      downloadFile(content, filename);
      setExportStatus('Export complete!');
      setTimeout(() => setExportStatus(null), 2000);
    } catch (err) {
      setExportStatus('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-panel-overlay" onClick={onClose}>
      <div className="export-panel" onClick={e => e.stopPropagation()}>
        <div className="export-header">
          <h2>Export Reports</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="export-content">
          <p className="export-description">
            Export your voir dire session data for your case file.
          </p>

          <div className="export-options">
            <button 
              className="export-option"
              onClick={() => handleExport('jurors')}
              disabled={isExporting}
            >
              <div className="option-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <div className="option-text">
                <span className="option-title">Juror Notes</span>
                <span className="option-desc">All jurors with notes, tags, and status</span>
              </div>
            </button>

            <button 
              className="export-option"
              onClick={() => handleExport('notes')}
              disabled={isExporting}
            >
              <div className="option-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                </svg>
              </div>
              <div className="option-text">
                <span className="option-title">Quick Notes</span>
                <span className="option-desc">Timestamped notes from the session</span>
              </div>
            </button>

            <button 
              className="export-option"
              onClick={() => handleExport('transcript')}
              disabled={isExporting}
            >
              <div className="option-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM9 13v2h6v-2H9zm0 4v2h4v-2H9z"/>
                </svg>
              </div>
              <div className="option-text">
                <span className="option-title">Transcript</span>
                <span className="option-desc">Full transcript with speaker names</span>
              </div>
            </button>

            <button 
              className="export-option full-report"
              onClick={() => handleExport('full')}
              disabled={isExporting}
            >
              <div className="option-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
                </svg>
              </div>
              <div className="option-text">
                <span className="option-title">Full Report</span>
                <span className="option-desc">Complete voir dire report with all data</span>
              </div>
            </button>
          </div>

          {exportStatus && (
            <div className={`export-status ${exportStatus.includes('complete') ? 'success' : ''}`}>
              {exportStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

