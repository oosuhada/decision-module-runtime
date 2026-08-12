import { z } from 'zod';
import type { WorkspaceDocument } from '../schemas/workspace';

export const agentCanvasContextSchema = z.object({
  schemaVersion: z.literal('1.0'),
  workspaceId: z.string(),
  request: z.string().max(20_000),
  modules: z.array(z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    dependencies: z.array(z.string()),
    accessibilitySummary: z.string().max(500),
  })),
  decisionState: z.object({
    hasRecommendation: z.boolean(),
    hasHumanDecision: z.boolean(),
    missingEvidenceCount: z.number().int().nonnegative(),
  }),
});

export type AgentCanvasContext = z.infer<typeof agentCanvasContextSchema>;

/**
 * Deliberately excludes raw module inputs/outputs, source locators, human rationale,
 * audit details and snapshots. Providers receive only the minimum structural state.
 */
export function createAgentCanvasContext(workspace: WorkspaceDocument): AgentCanvasContext {
  return agentCanvasContextSchema.parse({
    schemaVersion: '1.0',
    workspaceId: workspace.id,
    request: workspace.request,
    modules: workspace.modules.map((module) => ({
      id: module.id,
      type: module.type,
      status: module.status,
      dependencies: module.dependencies,
      accessibilitySummary: module.accessibilitySummary,
    })),
    decisionState: {
      hasRecommendation: Boolean(workspace.decision.recommendation),
      hasHumanDecision: Boolean(workspace.decision.humanChoice),
      missingEvidenceCount: workspace.plan?.missingInputs.length ?? 0,
    },
  });
}
