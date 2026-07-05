import { z } from 'zod';
import { moduleInstanceSchema, moduleTypeSchema, positionSchema } from '../schemas/workspace';

const envelope = {
  protocol: z.literal('1.0'),
  actionId: z.string().uuid(),
  runId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  actor: z.enum(['agent', 'human', 'system']),
};

export const protocolActionSchema = z.discriminatedUnion('type', [
  z.object({ ...envelope, type: z.literal('plan_module'), payload: z.object({ id: z.string(), type: moduleTypeSchema, title: z.string(), purpose: z.string() }) }),
  z.object({ ...envelope, type: z.literal('add_module'), payload: z.object({ module: moduleInstanceSchema }) }),
  z.object({ ...envelope, type: z.literal('update_module'), payload: z.object({ id: z.string(), patch: z.record(z.unknown()) }) }),
  z.object({ ...envelope, type: z.literal('remove_module'), payload: z.object({ id: z.string() }) }),
  z.object({ ...envelope, type: z.literal('connect'), payload: z.object({ id: z.string(), source: z.string(), target: z.string() }) }),
  z.object({ ...envelope, type: z.literal('disconnect'), payload: z.object({ id: z.string() }) }),
  z.object({ ...envelope, type: z.literal('set_input'), payload: z.object({ id: z.string(), input: z.record(z.unknown()) }) }),
  z.object({ ...envelope, type: z.literal('focus'), payload: z.object({ id: z.string().nullable() }) }),
  z.object({ ...envelope, type: z.literal('explain'), payload: z.object({ message: z.string().max(4000) }) }),
  z.object({ ...envelope, type: z.literal('propose_decision'), payload: z.object({ recommendation: z.string(), uncertainty: z.string(), counterCase: z.string() }) }),
  z.object({ ...envelope, type: z.literal('finish'), payload: z.object({ summary: z.string().max(4000) }) }),
  z.object({ ...envelope, type: z.literal('move_module'), payload: z.object({ id: z.string(), position: positionSchema }) }),
]);

export type ProtocolAction = z.infer<typeof protocolActionSchema>;

export type ParseResult =
  | { ok: true; action: ProtocolAction }
  | { ok: false; reason: string; raw: unknown };

export function parseProtocolAction(raw: unknown): ParseResult {
  const parsed = protocolActionSchema.safeParse(raw);
  if (parsed.success) return { ok: true, action: parsed.data };
  return {
    ok: false,
    reason: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    raw,
  };
}

export function serializeAction(action: ProtocolAction): string {
  return `${JSON.stringify(action)}\n`;
}

export function parseActionStream(buffer: string): { actions: ParseResult[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const actions = lines.filter(Boolean).map((line) => {
    try {
      return parseProtocolAction(JSON.parse(line) as unknown);
    } catch {
      return { ok: false, reason: 'invalid JSON', raw: line } as ParseResult;
    }
  });
  return { actions, rest };
}
