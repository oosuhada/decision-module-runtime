import { z } from 'zod';

export const moduleTypeSchema = z.enum([
  'text-evidence',
  'criteria-weights',
  'vendor-matrix',
  'cost-model',
  'risk-matrix',
  'scenario-comparison',
  'chart',
  'counter-case',
  'recommendation-logic',
  'human-decision-gate',
  'source-ledger',
]);

export type ModuleType = z.infer<typeof moduleTypeSchema>;

export const actorSchema = z.enum(['agent', 'human', 'system']);
export type Actor = z.infer<typeof actorSchema>;

export const moduleStatusSchema = z.enum(['planned', 'loading', 'ready', 'stale', 'error', 'cancelled']);
export type ModuleStatus = z.infer<typeof moduleStatusSchema>;

export const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
export type ModulePosition = z.infer<typeof positionSchema>;

export const provenanceSchema = z.object({
  createdBy: actorSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sources: z.array(z.string()).default([]),
  formula: z.string().nullable().default(null),
  lastRecomputeAt: z.string().datetime().nullable().default(null),
  previousVersion: z.string().nullable().default(null),
  runId: z.string().nullable().default(null),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const moduleInstanceSchema = z.object({
  id: z.string().min(1).max(96),
  type: moduleTypeSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(1).max(120),
  position: positionSchema,
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).default({}),
  dependencies: z.array(z.string()).default([]),
  status: moduleStatusSchema,
  error: z.string().nullable().default(null),
  provenance: provenanceSchema,
  accessibilitySummary: z.string().min(1).max(500),
});
export type ModuleInstance = z.infer<typeof moduleInstanceSchema>;

export const edgeSchema = z.object({
  id: z.string().min(1).max(128),
  source: z.string().min(1).max(96),
  target: z.string().min(1).max(96),
});
export type WorkspaceEdge = z.infer<typeof edgeSchema>;

export const auditEventSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  actor: actorSchema,
  kind: z.string(),
  detail: z.string(),
  at: z.string().datetime(),
  runId: z.string().nullable().default(null),
  moduleId: z.string().nullable().default(null),
  sequence: z.number().int().nonnegative().nullable().default(null),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const decisionSchema = z.object({
  recommendation: z.string().nullable().default(null),
  counterCase: z.string().nullable().default(null),
  uncertainty: z.string().nullable().default(null),
  missingEvidence: z.array(z.string()).default([]),
  humanChoice: z.string().nullable().default(null),
  rationale: z.string().nullable().default(null),
  decidedAt: z.string().datetime().nullable().default(null),
});
export type HumanDecision = z.infer<typeof decisionSchema>;

export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
  parentSnapshotId: z.string().nullable().default(null),
  modules: z.array(moduleInstanceSchema),
  edges: z.array(edgeSchema),
  decision: decisionSchema,
});
export type WorkspaceSnapshot = z.infer<typeof snapshotSchema>;

export const planItemSchema = z.object({
  id: z.string(),
  type: moduleTypeSchema,
  title: z.string(),
  purpose: z.string(),
  position: positionSchema,
  dependencies: z.array(z.string()),
  input: z.record(z.unknown()),
});
export type PlanItem = z.infer<typeof planItemSchema>;

export const agentPlanSchema = z.object({
  id: z.string(),
  request: z.string().min(3),
  createdAt: z.string().datetime(),
  status: z.enum(['draft', 'approved', 'rejected']),
  items: z.array(planItemSchema),
  missingInputs: z.array(z.string()),
  assumptions: z.array(z.string()),
  computeNotes: z.array(z.string()),
});
export type AgentPlan = z.infer<typeof agentPlanSchema>;

export const generationRunSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.enum(['idle', 'planning', 'awaiting-approval', 'assembling', 'complete', 'cancelled', 'error']),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  sequence: z.number().int().nonnegative(),
  error: z.string().nullable(),
});
export type GenerationRun = z.infer<typeof generationRunSchema>;

export const workspaceDocumentSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().min(1),
  name: z.string().min(1),
  request: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  modules: z.array(moduleInstanceSchema),
  edges: z.array(edgeSchema),
  plan: agentPlanSchema.nullable(),
  run: generationRunSchema,
  snapshots: z.array(snapshotSchema),
  audit: z.array(auditEventSchema),
  decision: decisionSchema,
  mode: z.enum(['edit', 'readonly']).default('edit'),
});
export type WorkspaceDocument = z.infer<typeof workspaceDocumentSchema>;

export function emptyDecision(): HumanDecision {
  return decisionSchema.parse({});
}

export function createEmptyWorkspace(id: string, request: string): WorkspaceDocument {
  const now = new Date().toISOString();
  return workspaceDocumentSchema.parse({
    schemaVersion: '1.0',
    id,
    name: 'Vendor decision workspace',
    request,
    createdAt: now,
    updatedAt: now,
    modules: [],
    edges: [],
    plan: null,
    run: {
      id: crypto.randomUUID(),
      provider: 'deterministic-demo',
      status: 'idle',
      startedAt: null,
      finishedAt: null,
      sequence: 0,
      error: null,
    },
    snapshots: [],
    audit: [],
    decision: emptyDecision(),
    mode: 'edit',
  });
}
