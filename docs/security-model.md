# Security Model and Threat Model

## Security objective

Generative Decision Workspace treats the model/provider, imported decision data, and experimental HTML/JavaScript as untrusted. The trusted computing base is intentionally small: schemas, protocol dispatcher, module registry, deterministic runtime, React renderers, and persistence adapters.

## Trust boundaries

```text
untrusted provider output
        │ Zod protocol validation
        ▼
typed dispatcher ────── audit/idempotency/sequence boundary
        │
        ▼
trusted module registry ────── deterministic compute
        │
        ├── React renderer (trusted application origin)
        └── experimental HTML/JS → opaque sandboxed iframe

browser state ── schema validation ── IndexedDB / FastAPI / PostgreSQL
```

## Threats and controls

| Threat | Control |
| --- | --- |
| Prompt injection asks agent to execute code/install packages | no such protocol action; closed module registry |
| Model invents a module/type | `moduleTypeSchema` and registry lookup reject it |
| Malformed or adversarial protocol | Zod discriminated union; wrong sequence/run rejected |
| Replay/duplicate actions | UUID idempotency key retained in audit history |
| Dependency-cycle resource abuse | cycle rejection before connection commit |
| Provider hangs | abort propagation + 15 s default remote-provider timeout |
| Partial generation failure | last valid workspace preserved; retry gets new run id |
| Source/decision data over-sharing | `createAgentCanvasContext()` removes raw data, source locators, audit and human rationale |
| XSS in normal modules | React text rendering; no arbitrary HTML action and no `dangerouslySetInnerHTML` path |
| Experimental HTML steals app credentials | opaque iframe origin, no `allow-same-origin`, no parent DOM/storage access |
| Experimental HTML exfiltrates data | iframe CSP `connect-src 'none'`, `default-src 'none'`; no form action |
| Sandbox message forgery/oversize | `event.source` check + channel/kind Zod schema + 8 KiB limit |
| Oversized sandbox source | 64 KiB source cap |
| Sandbox runs indefinitely | parent watchdog removes iframe after the execution window |
| Unauthorized workspace mutation | UI read-only mode; server can require bearer auth for writes; public share endpoint is GET-only |
| Guessable public share | cryptographically random `token_urlsafe(24)` frozen snapshot tokens |
| Sensitive caching/referrer leakage | API `Cache-Control: no-store`, `Referrer-Policy: no-referrer` |
| Browser privilege requests | API `Permissions-Policy` denies camera, microphone, geolocation |
| Oversized API request | 2 MiB content-length boundary |
| Agent overwrites final human choice | recommendation and `humanChoice` are separate fields; only human UI records choice |

## Sandbox contract

`SandboxPreview` is for experimental freedom, not ordinary decision modules.

```text
sandbox tokens: allow-scripts
allow-same-origin: absent
network: denied by CSP
storage origin: opaque
parent DOM: inaccessible
source: ≤64 KiB
bridge message: ≤8 KiB and schema validated
execution window: parent watchdog
```

### Residual risk: CPU exhaustion

Browser iframe removal is a practical timeout but is not a hard CPU-preemption primitive. A malicious tight loop may temporarily monopolize a renderer process before the parent can run its watchdog. Therefore internet-facing support for arbitrary hostile JavaScript should move experimental execution to a separate origin/process (for example a dedicated isolated preview service or worker/container with CPU and wall-clock quotas). The current boundary is suitable for bounded experimental previews, and trusted modules never need it.

## API authorization

Local development defaults to `DECISION_REQUIRE_AUTH=0` so the product runs without credentials. Internet-facing deployments must terminate authenticated sessions at a reverse proxy/OIDC layer or set `DECISION_REQUIRE_AUTH=1` and a server-side `DECISION_API_TOKEN` for write clients. Health, frozen share reads, and API documentation remain deliberately separate routes.

The repository contains no production credentials. Provider tokens must remain server-side; no `VITE_*` secret is used.

## Security test coverage

- malformed/unregistered protocol action rejection;
- sequence and idempotency behavior;
- graph cycle detection;
- provider abort and timeout;
- sandbox CSP, no-same-origin, and network-deny contract;
- agent context minimization;
- API persistence/share isolation and security headers;
- read-only UI path;
- exact schema-validated persistence restore.
