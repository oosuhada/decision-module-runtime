import { z } from 'zod';
import { moduleTypeSchema, type WorkspaceDocument } from '../schemas/workspace';

const evidenceItem = z.object({ source: z.string().min(1), note: z.string().min(1) });
const sourceItem = z.object({ label: z.string().min(1), locator: z.string().min(1) });
const vendorItem = z.object({
  name: z.string().min(1),
  cost: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  adoption: z.number().min(0).max(100),
});

const legacyDecisionInputPackSchema = z.object({
  format: z.literal('decision-input-pack/1.0'),
  request: z.string().min(3),
  evidence: z.array(evidenceItem).min(1),
  sources: z.array(sourceItem).min(1),
  vendors: z.array(vendorItem).min(2),
  weights: z.record(z.number().finite().nonnegative()),
  budgetIndex: z.number().min(0).max(100),
});

const genericDecisionInputPackSchema = z.object({
  format: z.literal('decision-input-pack/2.0'),
  request: z.string().min(3),
  modules: z.array(z.object({
    id: z.string().min(1),
    type: moduleTypeSchema,
    input: z.record(z.unknown()),
  })).min(1),
});

export const decisionInputPackSchema = z.union([legacyDecisionInputPackSchema, genericDecisionInputPackSchema]);

export type DecisionInputPack = z.infer<typeof decisionInputPackSchema>;

export function createInputPack(workspace: WorkspaceDocument): DecisionInputPack {
  return genericDecisionInputPackSchema.parse({
    format: 'decision-input-pack/2.0',
    request: workspace.request,
    modules: workspace.modules.map((module) => ({ id: module.id, type: module.type, input: module.input })),
  });
}

export function downloadInputPack(workspace: WorkspaceDocument) {
  const pack = createInputPack(workspace);
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${workspace.id}-inputs.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readInputPack(file: File) {
  return decisionInputPackSchema.parse(JSON.parse(await file.text()));
}
