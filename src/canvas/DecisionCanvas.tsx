import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Background, BaseEdge, Controls, EdgeToolbar, Handle, MarkerType, Position, ReactFlow, getBezierPath, useNodesState, type Edge, type EdgeProps, type Node, type NodeProps } from '@xyflow/react';
import { GitBranch, Grip, RotateCcw, Trash2, Unplug, X } from 'lucide-react';
import type { ModuleInstance, ModulePosition, WorkspaceDocument } from '../schemas/workspace';
import { ModuleRenderer } from '../modules/ModuleRenderer';

type CanvasActions = {
  setInput: (id: string, input: Record<string, unknown>) => void;
  removeModule: (id: string) => void;
  recordDecision: (choice: string, rationale: string) => void;
  focusModule: (id: string) => void;
  disconnectEdge: (id: string) => void;
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

type InspectableEdgeData = { onSelect: (id: string) => void; selected: boolean };

function InspectableEdge(props: EdgeProps<Edge<InspectableEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath(props);
  return <>
    <BaseEdge id={props.id} path={edgePath} markerEnd={props.markerEnd} style={props.style} interactionWidth={30} />
    <EdgeToolbar edgeId={props.id} x={labelX} y={labelY} isVisible>
      <button
        type="button"
        className={`edge-surgery-handle nodrag nopan ${props.data?.selected ? 'active' : ''}`}
        onClick={(event) => { event.stopPropagation(); props.data?.onSelect(props.id); }}
        aria-label={`Inspect dependency ${props.source} to ${props.target}`}
        title="Inspect dependency blast radius"
      >
        <GitBranch size={9} />
      </button>
    </EdgeToolbar>
  </>;
}

const edgeTypes = { inspectable: InspectableEdge };

export function DecisionCanvas({ workspace, quietMotion, onMove, actions }: { workspace: WorkspaceDocument; quietMotion: boolean; onMove: (id: string, position: ModulePosition) => void; actions: CanvasActions }) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const selectedEdge = workspace.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const impactIds = useMemo(() => {
    if (!selectedEdge) return new Set<string>();
    const impacted = new Set<string>([selectedEdge.target]);
    const queue = [selectedEdge.target];
    while (queue.length) {
      const source = queue.shift();
      for (const edge of workspace.edges) {
        if (edge.source !== source || impacted.has(edge.target)) continue;
        impacted.add(edge.target);
        queue.push(edge.target);
      }
    }
    return impacted;
  }, [selectedEdge, workspace.edges]);
  const mappedNodes = useMemo(() => workspace.modules.map((module) => ({
    id: module.id,
    type: 'module',
    position: module.position,
    data: { module, readonly: workspace.mode === 'readonly' },
    style: { width: widthFor(module) },
    draggable: workspace.mode !== 'readonly',
    className: selectedEdge
      ? module.id === selectedEdge.source ? 'graph-impact-source'
        : module.id === selectedEdge.target ? 'graph-impact-target'
          : impactIds.has(module.id) ? 'graph-impact-affected'
            : 'graph-impact-muted'
      : '',
  } satisfies Node<DecisionNodeData>)), [impactIds, selectedEdge, workspace.modules, workspace.mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DecisionNodeData>>(mappedNodes);

  useEffect(() => setNodes(mappedNodes), [mappedNodes, setNodes]);

  const edges = workspace.edges.map((edge) => ({
    ...edge,
    type: 'inspectable',
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    className: `data-edge ${selectedEdge ? (edge.id === selectedEdge.id ? 'graph-impact-selected' : impactIds.has(edge.source) && impactIds.has(edge.target) ? 'graph-impact-downstream' : 'graph-impact-muted') : ''}`,
    interactionWidth: 28,
    selectable: true,
    data: { onSelect: setSelectedEdgeId, selected: edge.id === selectedEdgeId },
    animated: !quietMotion && (workspace.run.status === 'assembling' || Boolean(selectedEdge && (edge.id === selectedEdge.id || (impactIds.has(edge.source) && impactIds.has(edge.target))))),
  } satisfies Edge<InspectableEdgeData>));

  const sourceModule = selectedEdge ? workspace.modules.find((module) => module.id === selectedEdge.source) : null;
  const targetModule = selectedEdge ? workspace.modules.find((module) => module.id === selectedEdge.target) : null;
  const affectedModules = selectedEdge ? workspace.modules.filter((module) => impactIds.has(module.id)) : [];

  return (
    <CanvasActionsContext.Provider value={actions}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onEdgeClick={(event, edge) => { event.stopPropagation(); setSelectedEdgeId(edge.id); }}
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
      {selectedEdge ? <aside className="graph-surgery-panel" aria-live="polite">
        <header><div><GitBranch size={14} /><span>KILLER INTERACTION / GRAPH SURGERY</span></div><button type="button" onClick={() => setSelectedEdgeId(null)} aria-label="Close graph impact preview"><X size={13} /></button></header>
        <strong>{sourceModule?.title ?? selectedEdge.source} → {targetModule?.title ?? selectedEdge.target}</strong>
        <p>Previewing the dependency blast radius before mutation. Illuminated modules are downstream of the selected edge.</p>
        <div className="graph-impact-chain">{affectedModules.map((module, index) => <span key={module.id}><b>{String(index + 1).padStart(2, '0')}</b>{module.title}<small>{module.type}</small></span>)}</div>
        <footer><span>{affectedModules.length} downstream module{affectedModules.length === 1 ? '' : 's'} will be recomputed from the edited DAG.</span>{workspace.mode === 'edit' ? <button type="button" onClick={() => { actions.disconnectEdge(selectedEdge.id); setSelectedEdgeId(null); }}><Unplug size={12} /> DISCONNECT + RECOMPUTE</button> : null}</footer>
      </aside> : null}
    </CanvasActionsContext.Provider>
  );
}
