import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-amber-50/70 border border-amber-200 text-stone-800 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            {this.props.fallbackTitle || 'A gentle pause in the view'}
          </h2>
          <p className="text-sm text-stone-600 font-sans max-w-md mx-auto leading-relaxed">
            {this.state.error?.message || 'The view encountered an unexpected state. Your journal memories are safe.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-100 hover:bg-stone-900 text-xs font-medium transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
