/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * Provides graceful error handling with professional error display
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = window.location.pathname;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <h1 className="error-title">Something went wrong</h1>
            <p className="error-message">
              We encountered an unexpected error. Your session data has been preserved.
            </p>
            
            <div className="error-actions">
              <button 
                className="error-btn error-btn-primary" 
                onClick={this.handleReload}
              >
                Reload Page
              </button>
              <button 
                className="error-btn error-btn-secondary" 
                onClick={this.handleGoHome}
              >
                Go to Home
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for individual components
 */
interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  onReset?: () => void;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
}

export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="component-error">
          <p className="component-error-text">
            Failed to load {this.props.componentName || 'this section'}
          </p>
          <button 
            className="component-error-btn"
            onClick={this.handleReset}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

