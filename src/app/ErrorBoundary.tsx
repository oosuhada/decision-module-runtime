import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Decision workspace render boundary', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-boundary" role="alert">
        <span>WORKSPACE RENDER FAILURE</span>
        <h1>The decision state is still stored.</h1>
        <p>{this.state.error.message}</p>
        <button onClick={() => window.location.reload()}>Reload saved workspace</button>
      </main>
    );
  }
}
