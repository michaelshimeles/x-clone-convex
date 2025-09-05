"use client";

import React from "react";
import Link from "next/link";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error;
    resetError: () => void;
  }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error; 
  resetError: () => void; 
}) {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-sm text-foreground/60 mb-6">
          We're sorry, but something unexpected happened. Please try again.
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left mb-6 p-4 bg-foreground/10 border border-foreground/20">
            <summary className="cursor-pointer text-sm font-mono">
              Error Details (Development)
            </summary>
            <pre className="text-xs mt-2 overflow-auto">
              {error.message}
              {"\n"}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="space-y-4">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold"
          >
            [ TRY AGAIN ]
          </button>
          
          <div className="flex gap-4 text-sm">
            <Link 
              href="/feed" 
              className="flex-1 px-4 py-2 border border-foreground hover:bg-foreground hover:text-background transition-colors text-center"
            >
              [ GO TO FEED ]
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 border border-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              [ RELOAD PAGE ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for functional components
export function useErrorHandler() {
  return React.useCallback((error: Error) => {
    console.error("Caught error:", error);
    // Could integrate with error reporting service here
    throw error; // Re-throw to be caught by ErrorBoundary
  }, []);
}

export default ErrorBoundary;