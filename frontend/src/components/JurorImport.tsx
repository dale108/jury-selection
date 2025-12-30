import React, { useState, useCallback } from 'react';
import { JurorDemographics, ColumnMapping, JUROR_IMPORT_FIELDS } from '../types';
import './JurorImport.css';

interface JurorImportProps {
  onImport: (jurors: JurorDemographics[]) => void;
  onCancel: () => void;
}

// Simple CSV parser
const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Handle quoted values
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
};

// Auto-detect column mappings based on header names
const autoDetectMappings = (headers: string[]): ColumnMapping[] => {
  const mappings: ColumnMapping[] = [];

  const patterns: { field: keyof JurorDemographics; patterns: RegExp[] }[] = [
    { field: 'badgeNumber', patterns: [/badge/i, /juror.*#/i, /juror.*number/i, /juror.*id/i] },
    { field: 'firstName', patterns: [/first.*name/i, /given.*name/i] },
    { field: 'lastName', patterns: [/last.*name/i, /surname/i, /family.*name/i] },
    { field: 'age', patterns: [/^age$/i, /your.*age/i] },
    { field: 'city', patterns: [/city/i, /town/i, /neighborhood/i, /live.*in/i] },
    { field: 'occupation', patterns: [/occupation/i, /job/i, /profession/i, /business/i, /employment/i] },
    { field: 'education', patterns: [/education/i, /degree/i, /school/i] },
    { field: 'gender', patterns: [/gender/i, /sex/i] },
    { field: 'ethnicity', patterns: [/race/i, /ethnicity/i, /ethnic/i, /category.*describes/i] },
    { field: 'priorJuryService', patterns: [/served.*jury/i, /prior.*jury/i, /jury.*before/i] },
    { field: 'criminalConviction', patterns: [/convicted/i, /conviction/i, /crime/i] },
    { field: 'phone', patterns: [/phone/i, /telephone/i, /cell/i, /mobile/i] },
    { field: 'email', patterns: [/email/i, /e-mail/i] },
  ];

  for (const header of headers) {
    let matched = false;
    for (const { field, patterns: fieldPatterns } of patterns) {
      if (fieldPatterns.some(p => p.test(header))) {
        // Check if already mapped
        if (!mappings.some(m => m.jurorField === field)) {
          mappings.push({ csvColumn: header, jurorField: field });
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      mappings.push({ csvColumn: header, jurorField: 'skip' });
    }
  }

  return mappings;
};

// Convert row to JurorDemographics based on mappings
const rowToJuror = (row: string[], headers: string[], mappings: ColumnMapping[]): JurorDemographics => {
  const juror: Partial<JurorDemographics> = {};

  mappings.forEach(mapping => {
    if (mapping.jurorField === 'skip') return;

    const colIndex = headers.indexOf(mapping.csvColumn);
    if (colIndex === -1 || colIndex >= row.length) return;

    const value = row[colIndex]?.trim();
    if (!value) return;

    switch (mapping.jurorField) {
      case 'age':
        const ageNum = parseInt(value);
        juror.age = isNaN(ageNum) ? value : ageNum;
        break;
      case 'priorJuryService':
      case 'criminalConviction':
      case 'hardship':
        juror[mapping.jurorField] = /yes/i.test(value) || value === '1' || value.toLowerCase() === 'true';
        break;
      default:
        (juror as any)[mapping.jurorField] = value;
    }
  });

  return {
    firstName: juror.firstName || 'Unknown',
    lastName: juror.lastName || '',
    ...juror,
  };
};

export const JurorImport: React.FC<JurorImportProps> = ({ onImport, onCancel }) => {
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewJurors, setPreviewJurors] = useState<JurorDemographics[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);

        if (parsed.headers.length === 0) {
          setError('Could not parse CSV file. Please check the format.');
          return;
        }

        setCsvData(parsed);
        const autoMappings = autoDetectMappings(parsed.headers);
        setMappings(autoMappings);
        setStep('map');
      } catch (err) {
        setError('Error reading file. Please ensure it is a valid CSV.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleMappingChange = (csvColumn: string, newField: keyof JurorDemographics | 'skip') => {
    setMappings(prev => 
      prev.map(m => m.csvColumn === csvColumn ? { ...m, jurorField: newField } : m)
    );
  };

  const handlePreview = () => {
    if (!csvData) return;

    const jurors = csvData.rows.map(row => rowToJuror(row, csvData.headers, mappings));
    // Assign seat numbers
    jurors.forEach((juror, index) => {
      juror.seatNumber = index + 1;
    });
    setPreviewJurors(jurors);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    onImport(previewJurors);
  };

  return (
    <div className="juror-import-overlay">
      <div className="juror-import-modal">
        <div className="import-header">
          <h2>Import Juror Questionnaires</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        {/* Progress Steps */}
        <div className="import-steps">
          <div className={`step ${step === 'upload' ? 'active' : 'complete'}`}>
            <span className="step-number">1</span>
            <span className="step-label">Upload</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 'map' ? 'active' : step === 'preview' ? 'complete' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Map Fields</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 'preview' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        <div className="import-content">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="upload-step">
              <div className="upload-zone">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  id="csv-upload"
                  className="file-input"
                />
                <label htmlFor="csv-upload" className="upload-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  <span className="upload-title">Drop CSV file here or click to upload</span>
                  <span className="upload-hint">
                    Export questionnaire responses from Microsoft Forms as CSV
                  </span>
                </label>
              </div>

              <div className="upload-info">
                <h3>Supported Formats</h3>
                <ul>
                  <li>CSV exports from Microsoft Forms</li>
                  <li>Excel spreadsheets saved as CSV</li>
                  <li>Any comma-separated values file</li>
                </ul>
                <h3>Based on King County Questionnaire</h3>
                <p>
                  Auto-detects fields from the{' '}
                  <a href="https://www.courts.wa.gov/newsinfo/content/Sample%20Trial%20Documents/Jury%20Questionnaire.pdf" target="_blank" rel="noopener noreferrer">
                    King County juror questionnaire
                  </a>
                </p>
              </div>

              {error && <div className="import-error">{error}</div>}
            </div>
          )}

          {/* Step 2: Map Fields */}
          {step === 'map' && csvData && (
            <div className="map-step">
              <p className="map-instructions">
                Match CSV columns to juror fields. We've auto-detected some mappings for you.
              </p>
              
              <div className="mapping-list">
                {mappings.map(mapping => (
                  <div key={mapping.csvColumn} className="mapping-row">
                    <div className="csv-column">
                      <span className="column-name">{mapping.csvColumn}</span>
                      <span className="sample-value">
                        {csvData.rows[0]?.[csvData.headers.indexOf(mapping.csvColumn)] || '—'}
                      </span>
                    </div>
                    <span className="mapping-arrow">→</span>
                    <select
                      value={mapping.jurorField}
                      onChange={(e) => handleMappingChange(mapping.csvColumn, e.target.value as any)}
                      className={`field-select ${mapping.jurorField !== 'skip' ? 'mapped' : ''}`}
                    >
                      <option value="skip">— Skip this column —</option>
                      {JUROR_IMPORT_FIELDS.map(field => (
                        <option 
                          key={field.key} 
                          value={field.key}
                          disabled={mappings.some(m => m.jurorField === field.key && m.csvColumn !== mapping.csvColumn)}
                        >
                          {field.label} {field.required ? '*' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="map-actions">
                <button className="btn btn-secondary" onClick={() => setStep('upload')}>
                  Back
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handlePreview}
                  disabled={!mappings.some(m => m.jurorField === 'firstName')}
                >
                  Preview Import
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="preview-step">
              <p className="preview-summary">
                Ready to import <strong>{previewJurors.length} jurors</strong>
              </p>

              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Age</th>
                      <th>City</th>
                      <th>Occupation</th>
                      <th>Prior Jury</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewJurors.slice(0, 10).map((juror, index) => (
                      <tr key={index}>
                        <td>{juror.seatNumber}</td>
                        <td>{juror.firstName} {juror.lastName}</td>
                        <td>{juror.age || '—'}</td>
                        <td>{juror.city || '—'}</td>
                        <td className="occupation-cell">{juror.occupation || '—'}</td>
                        <td>{juror.priorJuryService ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewJurors.length > 10 && (
                  <p className="preview-more">
                    ...and {previewJurors.length - 10} more jurors
                  </p>
                )}
              </div>

              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setStep('map')}>
                  Back
                </button>
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  Import {previewJurors.length} Jurors
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

