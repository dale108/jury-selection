/**
 * ConfirmDialog - Reusable confirmation dialog component
 */
import React from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div 
      className="confirm-overlay" 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="confirm-dialog">
        <div className="confirm-header">
          <h3 id="confirm-title" className="confirm-title">{title}</h3>
        </div>
        <div className="confirm-body">
          <p id="confirm-message" className="confirm-message">{message}</p>
        </div>
        <div className="confirm-footer">
          <button 
            className="confirm-btn confirm-btn-cancel" 
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button 
            className={`confirm-btn confirm-btn-${confirmVariant}`}
            onClick={onConfirm}
            type="button"
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

