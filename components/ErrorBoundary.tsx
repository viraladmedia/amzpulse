import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-200">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <h1 className="text-lg font-bold text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-300">
              The workspace hit an unexpected error. Reloading usually clears it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-amz-accent px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-orange-400"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
