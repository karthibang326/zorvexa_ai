import React from "react";

type State = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown runtime error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep diagnostics available in devtools.
    console.error("App runtime crash", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white grid place-items-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <h1 className="text-lg font-bold">Dashboard failed to render</h1>
          <p className="mt-2 text-sm text-white/80 break-words">{this.state.message}</p>
          <p className="mt-3 text-xs text-white/60">
            Try refresh. If this persists, share this message and I will patch immediately.
          </p>
        </div>
      </div>
    );
  }
}

