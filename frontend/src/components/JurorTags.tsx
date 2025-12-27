import React, { useState } from 'react';
import { JUROR_TAGS, JurorTagKey } from '../types';
import './JurorTags.css';

interface JurorTagsProps {
  selectedTags: (JurorTagKey | string)[];
  onTagsChange: (tags: (JurorTagKey | string)[]) => void;
  compact?: boolean;
  readOnly?: boolean;
  alwaysExpanded?: boolean; // Show all tags without needing to expand
}

// Helper to check if a tag is a predefined tag
const isPredefinedTag = (tag: string): tag is JurorTagKey => {
  return tag in JUROR_TAGS;
};

// Helper to get custom tag label (removes 'custom:' prefix if present)
const getCustomTagLabel = (tag: string): string => {
  return tag.startsWith('custom:') ? tag.slice(7) : tag;
};

export const JurorTags: React.FC<JurorTagsProps> = ({
  selectedTags,
  onTagsChange,
  compact = false,
  readOnly = false,
  alwaysExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);
  const [customTagInput, setCustomTagInput] = useState('');

  const toggleTag = (tagKey: JurorTagKey | string) => {
    if (readOnly) return;
    
    if (selectedTags.includes(tagKey)) {
      onTagsChange(selectedTags.filter(t => t !== tagKey));
    } else {
      onTagsChange([...selectedTags, tagKey]);
    }
  };

  const addCustomTag = () => {
    if (!customTagInput.trim() || readOnly) return;
    
    const customTag = `custom:${customTagInput.trim()}`;
    if (!selectedTags.includes(customTag)) {
      onTagsChange([...selectedTags, customTag]);
    }
    setCustomTagInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const allTags = Object.entries(JUROR_TAGS) as [JurorTagKey, typeof JUROR_TAGS[JurorTagKey]][];
  
  // Separate predefined and custom tags
  const customTags = selectedTags.filter(t => !isPredefinedTag(t));

  // Compact view - just show selected tags
  if (compact) {
    if (selectedTags.length === 0) return null;
    
    return (
      <div className="juror-tags-compact">
        {selectedTags.map(tagKey => {
          if (isPredefinedTag(tagKey)) {
            const tag = JUROR_TAGS[tagKey];
            return (
              <span 
                key={tagKey} 
                className="tag-badge"
                style={{ backgroundColor: tag.color }}
                title={tag.label}
              >
                {tag.icon}
              </span>
            );
          } else {
            // Custom tag - show first letter
            const label = getCustomTagLabel(tagKey);
            return (
              <span 
                key={tagKey} 
                className="tag-badge custom"
                title={label}
              >
                {label.charAt(0).toUpperCase()}
              </span>
            );
          }
        })}
      </div>
    );
  }

  // Always expanded mode - show grid of clickable tags
  if (alwaysExpanded && !readOnly) {
    return (
      <div className="juror-tags always-expanded">
        {/* Custom tag input */}
        <div className="custom-tag-input">
          <input
            type="text"
            placeholder="Add custom tag..."
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="custom-tag-field"
          />
          <button 
            className="custom-tag-btn"
            onClick={addCustomTag}
            disabled={!customTagInput.trim()}
          >
            Add
          </button>
        </div>

        {/* Custom tags display */}
        {customTags.length > 0 && (
          <div className="custom-tags-list">
            {customTags.map(tag => (
              <span key={tag} className="custom-tag-pill">
                <span className="custom-tag-text">{getCustomTagLabel(tag)}</span>
                <button 
                  className="custom-tag-remove"
                  onClick={() => toggleTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Predefined tags grid */}
        <div className="tag-grid">
          {allTags.map(([key, tag]) => {
            const isSelected = selectedTags.includes(key);
            return (
              <button
                key={key}
                className={`tag-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleTag(key)}
                style={isSelected ? { 
                  borderColor: tag.color,
                  backgroundColor: `${tag.color}15`
                } : {}}
              >
                <span className="tag-card-icon" style={{ color: tag.color }}>{tag.icon}</span>
                <span className="tag-card-label">{tag.label}</span>
                {isSelected && (
                  <div className="tag-card-check" style={{ backgroundColor: tag.color }}>
                    <svg viewBox="0 0 24 24" fill="white" width="12" height="12">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="juror-tags">
      <div className="tags-header" onClick={() => !readOnly && setIsExpanded(!isExpanded)}>
        <span className="tags-label">Tags</span>
        {selectedTags.length > 0 && (
          <span className="tags-count">{selectedTags.length} selected</span>
        )}
        {!readOnly && (
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`chevron ${isExpanded ? 'up' : ''}`}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        )}
      </div>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="selected-tags">
          {selectedTags.map(tagKey => {
            if (isPredefinedTag(tagKey)) {
              const tag = JUROR_TAGS[tagKey];
              return (
                <span 
                  key={tagKey} 
                  className="tag-pill"
                  style={{ 
                    backgroundColor: `${tag.color}15`,
                    borderColor: tag.color,
                    color: tag.color
                  }}
                >
                  <span className="tag-icon">{tag.icon}</span>
                  <span className="tag-text">{tag.label}</span>
                  {!readOnly && (
                    <button 
                      className="tag-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(tagKey);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            } else {
              // Custom tag
              const label = getCustomTagLabel(tagKey);
              return (
                <span 
                  key={tagKey} 
                  className="tag-pill custom-pill"
                >
                  <span className="tag-text">{label}</span>
                  {!readOnly && (
                    <button 
                      className="tag-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(tagKey);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            }
          })}
        </div>
      )}

      {/* Tag selector dropdown */}
      {isExpanded && !readOnly && (
        <div className="tag-selector">
          {allTags.map(([key, tag]) => {
            const isSelected = selectedTags.includes(key);
            return (
              <button
                key={key}
                className={`tag-option ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleTag(key)}
              >
                <span className="tag-icon">{tag.icon}</span>
                <span className="tag-label">{tag.label}</span>
                {isSelected && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Tag filter component for filtering juror list
interface TagFilterProps {
  selectedFilters: JurorTagKey[];
  onFiltersChange: (filters: JurorTagKey[]) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedFilters,
  onFiltersChange,
}) => {
  const allTags = Object.entries(JUROR_TAGS) as [JurorTagKey, typeof JUROR_TAGS[JurorTagKey]][];

  const toggleFilter = (tagKey: JurorTagKey) => {
    if (selectedFilters.includes(tagKey)) {
      onFiltersChange(selectedFilters.filter(t => t !== tagKey));
    } else {
      onFiltersChange([...selectedFilters, tagKey]);
    }
  };

  return (
    <div className="tag-filter">
      <span className="filter-label">Filter by tag:</span>
      <div className="filter-options">
        {allTags.map(([key, tag]) => {
          const isActive = selectedFilters.includes(key);
          return (
            <button
              key={key}
              className={`filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => toggleFilter(key)}
              title={tag.label}
              style={isActive ? { 
                backgroundColor: tag.color,
                borderColor: tag.color 
              } : {}}
            >
              {tag.icon}
            </button>
          );
        })}
        {selectedFilters.length > 0 && (
          <button 
            className="clear-filters"
            onClick={() => onFiltersChange([])}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

