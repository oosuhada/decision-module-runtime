import { describe, expect, it } from 'vitest';
import { parseActionStream, parseProtocolAction, serializeAction, type ProtocolAction } from './actions';

function action(): ProtocolAction {
  return {
    protocol: '1.0',
    actionId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    sequence: 0,
    actor: 'agent',
    type: 'finish',
    payload: { summary: 'done' },
  };
}

describe('generative protocol parser', () => {
  it('accepts a versioned typed action', () => {
    const parsed = parseProtocolAction(action());
    expect(parsed.ok).toBe(true);
  });

  it('rejects malformed and unregistered action types', () => {
    const parsed = parseProtocolAction({ protocol: '1.0', type: 'install_package', payload: { name: 'bad' } });
    expect(parsed.ok).toBe(false);
  });

  it('parses newline streaming while retaining a partial frame', () => {
    const first = action();
    const second = action();
    const streamed = `${serializeAction(first)}${JSON.stringify(second).slice(0, 19)}`;
    const result = parseActionStream(streamed);
    expect(result.actions).toHaveLength(1);
    expect(result.rest.length).toBeGreaterThan(0);
  });
});
