import React from "react";

type State = { hasError: boolean; message: string; routeName: string };
type Props = React.PropsWithChildren<{ routeName: string }>;

/**
 * Route-level error boundary.
 * Wrap each protected/lazy route so a crash in one page doesn't
 * bring down the whole app.  AppErrorBoundary at the root catches
 * anything that slips through.
 *
 * Usage:
 *   <RouteErrorBoundary routeName="Dashboard">
 *     <Dashboard />
 *   </RouteErrorBoundary>
 */
export default class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "", routeName: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface in devtools; swap for Sentry/Datadog in production.
    console.error(`[RouteErrorBoundary:${this.props.routeName}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "", routeName: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white grid place-items-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 space-y-3">
          <h2 className="text-base font-semibold text-yellow-300">
            {this.props.routeName} failed to load
          </h2>
          <p className="text-sm text-white/70 break-words font-mono">{this.state.message}</p>
          <button
            onClick={this.handleRetry}
            className="mt-2 text-xs px-4 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
