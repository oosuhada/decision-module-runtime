# Generative Protocol v1.0

The protocol is the only supported route from an agent/provider into trusted workspace state. It is defined in `src/protocol/actions.ts` and validated with Zod before dispatch.

## Envelope

Every action carries:

```json
{
  "protocol": "1.0",
  "actionId": "uuid",
  "runId": "uuid",
  "sequence": 0,
  "actor": "agent",
  "type": "add_module",
  "payload": {}
}
```

`actionId` is the idempotency key. `runId` binds the action to the active generation run. `sequence` must exactly equal the next expected sequence. A duplicate `actionId` becomes a no-op; a gap, stale sequence, wrong run, or malformed payload is rejected without mutating the graph.

## Action vocabulary

| Action | Intent | Trusted effect |
| --- | --- | --- |
| `plan_module` | explain a planned module | audit/plan metadata only |
| `add_module` | mount a registered module | registry + module schema validation |
| `update_module` | structured module patch | typed dispatcher boundary |
| `remove_module` | remove module and incident edges | graph mutation |
| `connect` | connect dependency | endpoint + cycle validation |
| `disconnect` | remove edge | graph mutation |
| `set_input` | update module input | deterministic downstream recompute |
| `move_module` | update canvas position | layout state only |
| `focus` | request UI focus | audit/focus state |
| `explain` | attach bounded explanation | audit information only |
| `propose_decision` | system recommendation | never records human choice |
| `finish` | end assembly | topological deterministic compute |

There is deliberately no `execute_js`, `install_package`, `fetch_url`, `shell`, or arbitrary `render_html` action in the trusted protocol.

## Lifecycle

```text
request
  → planning
  → awaiting-approval
  → approved plan
  → assembling
  → action stream
  → deterministic graph compute
  → complete
```

Cancellation can occur while planning or assembling. Partial accepted state is preserved and the run becomes `cancelled`. Retry creates a new `runId`, clears the partial generated graph, keeps the approved plan, resets sequence to zero, and replays assembly from the plan.

## Streaming

`parseActionStream()` supports newline-delimited JSON frames while retaining an incomplete tail frame. The deterministic provider yields typed actions as an async generator. The backend exposes an SSE demo stream to exercise streaming transport without requiring provider credentials.

Production provider adapters should convert provider-specific streaming formats into this protocol server-side. Raw provider chunks must never be dispatched directly.

## Replay and rollback

- **Replay:** ordered accepted actions plus the deterministic module registry reconstruct the same graph.
- **Idempotency:** the audit action ID set prevents duplicate state mutation.
- **Partial failure:** invalid actions are rejected while the last valid workspace remains intact.
- **Rollback:** human-edit history and named snapshots restore previous graph/decision frames.
- **Retry:** a new generation run starts from an approved plan with a new idempotency namespace.

## Provider timeout and abort

`createRemoteProvider()` composes an external AbortSignal with a 15-second default provider timeout. The timeout is configurable for adapters and tested with an intentionally non-resolving provider request. UI cancellation aborts the same provider boundary.

## Data minimization

`createAgentCanvasContext()` sends only:

- workspace id and decision request;
- module id/type/status/dependency ids;
- accessibility summary;
- booleans indicating recommendation/human-decision state;
- missing-evidence count.

It excludes raw module inputs/outputs, source locators, snapshots, audit details, and human decision rationale. Providers that need more data must obtain it through a future explicitly permissioned tool boundary rather than receiving the entire canvas by default.
