import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, useNodesState, type Node, type NodeProps } from '@xyflow/react';
import { Grip, RotateCcw, Trash2 } from 'lucide-react';
import type { ModuleInstance, ModulePosition, WorkspaceDocument } from '../schemas/workspace';
import { ModuleRenderer } from '../modules/ModuleRenderer';

type CanvasActions = {
  setInput: (id: string, input: Record<string, unknown>) => void;
  removeModule: (id: string) => void;
  recordDecision: (choice: string, rationale: string) => void;
  focusModule: (id: string) => void;
};

const CanvasActionsContext = createContext<CanvasActions | null>(null);

type DecisionNodeData = { module: ModuleInstance; readonly: boolean };

function widthFor(module: ModuleInstance) {
  if (module.type === 'vendor-matrix' || module.type === 'scenario-comparison') return 330;
  if (module.type === 'human-decision-gate') return 340;
  return 290;
}

function ModuleNode({ data, id }: NodeProps<Node<DecisionNodeData>>) {
  const actions = useContext(CanvasActionsContext);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const module = data.module;
  if (!actions) return null;
  return (
    <article className={`instrument-shell module-status-${module.status}`} aria-label={`${module.title}. ${module.accessibilitySummary}`}>
      <Handle type="target" position={Position.Left} className="data-handle" />
      <header className="instrument-head">
        <span>{module.type.slice(0, 3).toUpperCase()}</span>
        <button className="module-title nodrag" onClick={() => actions.focusModule(id)}>{module.title}</button>
        <Grip size={12} aria-hidden="true" />
      </header>
      <div className="module-meta"><span>{module.status}</span><span>v{module.version}</span><span>{module.provenance.createdBy}</span></div>
      {module.status === 'error' ? <div className="module-error" role="alert">{module.error}</div> : null}
      {module.status === 'stale' ? <div className="module-stale"><RotateCcw size={11} /> stale · queued for recompute</div> : null}
      <div className="instrument-body">
        <ModuleRenderer module={module} readonly={data.readonly} onInput={(input) => actions.setInput(id, input)} onDecision={actions.recordDecision} />
      </div>
      {!data.readonly ? (
        <div className="node-delete-wrap nodrag">
          {confirmDelete ? <button className="node-delete-confirm" onClick={() => actions.removeModule(id)}>Confirm delete</button> : null}
          <button className="node-delete" aria-label={`Delete ${module.title}`} onClick={() => setConfirmDelete((value) => !value)}><Trash2 size={11} /></button>
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="data-handle" />
    </article>
  );
}

const nodeTypes = { module: ModuleNode };

export function DecisionCanvas({ workspace, quietMotion, onMove, actions }: { workspace: WorkspaceDocument; quietMotion: boolean; onMove: (id: string, position: ModulePosition) => void; actions: CanvasActions }) {
  const mappedNodes = useMemo(() => workspace.modules.map((module) => ({
    id: module.id,
    type: 'module',
    position: module.position,
    data: { module, readonly: workspace.mode === 'readonly' },
    style: { width: widthFor(module) },
    draggable: workspace.mode !== 'readonly',
  } satisfies Node<DecisionNodeData>)), [workspace.modules, workspace.mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DecisionNodeData>>(mappedNodes);

  useEffect(() => setNodes(mappedNodes), [mappedNodes, setNodes]);

  const edges = workspace.edges.map((edge) => ({
    ...edge,
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    className: 'data-edge',
    animated: !quietMotion && workspace.run.status === 'assembling',
  }));

  return (
    <CanvasActionsContext.Provider value={actions}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onNodeDragStop={(_, node) => onMove(node.id, node.position)}
        fitView
        fitViewOptions={{ padding: 0.18, duration: quietMotion ? 0 : 420, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.4}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#c9ccd0" gap={20} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </CanvasActionsContext.Provider>
  );
}
