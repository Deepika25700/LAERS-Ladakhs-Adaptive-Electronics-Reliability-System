import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LAERS Digital Twin caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded bg-[#13171e] border border-amber-500/40 font-mono text-xs text-[#cbd5e1] space-y-4 max-w-4xl mx-auto shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#232a36] pb-3">
            <div className="p-2 rounded bg-amber-950/60 border border-amber-600/40 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f8fafc]">
                {this.props.fallbackTitle || 'DIGITAL TWIN TELEMETRY RECOVERY'}
              </h2>
              <p className="text-[11px] text-[#94a3b8]">
                Transient telemetry exception intercepted. Digital Twin state preserved.
              </p>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0c0e12] border border-[#1e2430] space-y-1">
            <span className="text-[10px] text-amber-400 font-bold block">ERROR DETAILS:</span>
            <div className="text-[11px] text-red-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Awaiting valid digital twin state vector'}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-[#64748b]">
              LAERS Closed-Loop Digital Twin Failsafe Mechanism
            </span>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e2636] hover:bg-[#283348] text-amber-300 border border-amber-500/40 font-bold cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RE-INITIALIZE TELEMETRY STREAM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
