# Production Architecture

Status: **Accepted**<br>
Decision date: 2026-08-24
Scope: Generative Decision Workspace production hardening

## ADR-001 — Treat the generated UI as a validated decision graph

### Context

The visual prototype assembled a fixed set of React Flow nodes from deterministic mock behavior inside `App.tsx`. UI state, agent behavior, graph computation, and canvas events shared one component boundary. That made the concept clear, but made replay, persistence, undo/redo, provenance, isolation, and provider substitution unsafe.

### Decision

The production system is a versioned, schema-validated decision graph. The LLM/provider may **propose protocol actions**, but it does not own application state and cannot render arbitrary components in the trusted React tree.

```text
Decision request
    │
    ▼
AgentProvider.plan()
    │   minimal context only
    ▼
AgentPlan (Zod)
    │
    ▼
Human approval / edit
    │
    ▼
ProtocolAction stream (Zod + sequence + idempotency)
    │
    ▼
Typed dispatcher ──► audit trail
    │
    ▼
Allowed module registry
    │
    ▼
Deterministic DAG runtime
    │
    ├──► React registry renderers
    ├──► provenance/version state
    └──► IndexedDB + FastAPI persistence
```

The graph document in `src/schemas/workspace.ts` is the browser source of truth. A module's computed output is always derived from validated inputs and validated dependency outputs through `src/modules/registry.ts`. Provider text is never accepted as computed truth simply because a model produced it.

### Consequences

- Provider output is untrusted until `protocolActionSchema` accepts it.
- Unknown module types are rejected before entering trusted application state.
- Connections are rejected if they introduce a dependency cycle.
- Human and agent changes have separate actor identities in the audit trail.
- All human graph edits that change decision state are captured in undo/redo history.
- Exact workspace documents can be reconstructed after refresh from IndexedDB or the API.
- The same ordered protocol actions replay to the same graph when deterministic module inputs are unchanged.

## ADR-002 — Local-first exact restore with database synchronization

The browser writes every accepted workspace document to IndexedDB. It also attempts to persist the same validated document to `/api/workspaces/{id}`. This gives local development and interrupted-network sessions an exact restore path without weakening the server model.

The FastAPI backend uses SQLAlchemy and Alembic. SQLite is a zero-credential local fallback; Docker Compose uses PostgreSQL 17. The schema includes the requested production entities:

`workspaces`, `requests`, `generation_runs`, `plans`, `modules`, `module_versions`, `edges`, `canvas_events`, `snapshots`, `agent_actions`, `human_actions`, `computation_runs`, `decisions`, `exports`, and `shares`.

The current API stores the complete validated workspace document as the canonical read model so refresh restore is atomic. Normalized tables provide the production persistence schema for querying, history, and future append-only projections. Alembic revision `74e3ca148483` creates the complete schema.

## ADR-003 — Trusted registry renderers; experimental HTML only in an opaque iframe

Normal decision modules use React renderers in `ModuleRenderer.tsx`. The agent cannot install packages, import code, call `eval`, or add a renderer to the registry.

Experimental HTML/JavaScript uses `SandboxPreview` only. It is deliberately outside the normal module path and has:

- `sandbox="allow-scripts"` with **no** `allow-same-origin`;
- CSP `default-src 'none'` and `connect-src 'none'`;
- no parent DOM access;
- no parent credentials or storage origin;
- 64 KiB source and 8 KiB bridge-message limits;
- source-window verification and Zod validation on messages;
- a parent watchdog that removes the iframe after the execution window.

See `docs/security-model.md` for the residual CPU-exhaustion limitation of same-browser-process sandboxing.

## ADR-004 — Desktop canvas and mobile reading modes are different products surfaces

Desktop keeps the spatial xyflow workspace because positions and visible dependencies carry meaning. Mobile does **not** scale the desktop graph down. Below 760 px the primary surface becomes:

1. Module Stack — default, readable one-module-at-a-time interaction.
2. Focused Module — previous/next module traversal.
3. Dependency Path — textual dependency breadcrumb and ancestor path.
4. Decision Summary — recommendation, counter-case, uncertainty, human decision.

The spatial canvas remains a desktop/landscape overview concern. The list/tree view is the complete non-canvas accessibility path on desktop.

## Runtime boundaries

| Boundary | Trusted input | Rejected / minimized input |
| --- | --- | --- |
| Provider | request + minimized structural context | raw source locators, snapshots, audit details, human rationale |
| Protocol | Zod-valid v1 actions in exact sequence | unknown action type, malformed payload, wrong run, duplicate mutation |
| Module SDK | registered module + valid input/output | unknown renderer/type, invalid schema |
| Graph | acyclic dependencies | missing endpoints, cycles |
| Sandbox | bounded HTML/JS source | network, same-origin, parent storage/DOM, oversized bridge messages |
| Persistence | validated workspace document | schema-invalid stored state |
| Decision | recommendation is advisory | agent cannot create a human decision record |

## Folder boundaries

```text
src/
├── app/          application shell and error boundary
├── routes/       URL workspace/share routing
├── workspaces/   state, history, export
├── canvas/       xyflow, mobile modes, accessible tree
├── modules/      allowed registry and renderers
├── protocol/     structured action protocol
├── agent/        providers, plan approval, minimized context
├── runtime/      dispatcher, DAG validation, deterministic recompute
├── sandbox/      experimental isolated preview boundary
├── provenance/   inspector, history, audit
├── persistence/  IndexedDB adapter
├── api/          FastAPI client
├── schemas/      source-of-truth Zod models
└── test/         test runtime setup
```

## Deployment boundary

No external deployment is performed by this repository task. Local production-equivalent services are:

```bash
# browser app
corepack pnpm dev

# API with zero-credential SQLite fallback
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8103

# optional PostgreSQL production topology
docker compose up --build
```

Before internet exposure, place the API behind authenticated TLS ingress/OIDC, set `DECISION_REQUIRE_AUTH=1`, provide a server-side API token for write clients, and rotate all environment secrets outside the repository.
