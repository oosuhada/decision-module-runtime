import { ReactFlowProvider } from '@xyflow/react';
import { ErrorBoundary } from './app/ErrorBoundary';
import { DecisionWorkspace } from './app/DecisionWorkspace';

export function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <DecisionWorkspace />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
