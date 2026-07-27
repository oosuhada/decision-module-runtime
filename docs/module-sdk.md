# Module SDK

The Module SDK is a closed registry of trusted decision instruments. An agent may instantiate a registered contract, but cannot introduce executable code or a new trusted renderer at runtime.

## Contract

Each `ModuleContract` contains:

```ts
type ModuleContract = {
  type: ModuleType;
  version: string;
  inputSchema: ZodType<Record<string, unknown>>;
  outputSchema: ZodType<Record<string, unknown>>;
  renderer: ModuleType;
  deterministicCompute(context): Record<string, unknown>;
  accessibilitySummary(output): string;
  formula: string | null;
};
```

Each instantiated module additionally stores its id, position, dependencies, status, error state, provenance, input/output, and accessibility summary.

## Registered v1 modules

| Type | Purpose | Deterministic behavior |
| --- | --- | --- |
| `text-evidence` | request/evidence scope | counts and exposes structured evidence fixture |
| `criteria-weights` | human priorities | validates weighted criteria and total |
| `vendor-matrix` | option scoring | normalized weighted vendor score |
| `cost-model` | budget constraint | explicit cost-fit curve |
| `risk-matrix` | independent risk view | security/adoption risk formula |
| `scenario-comparison` | alternate scenarios | compares top deterministic outcomes |
| `chart` | visual score readout | derives series from ranking |
| `counter-case` | strongest reversal | deterministic sensitivity narrative |
| `recommendation-logic` | advisory recommendation | argmax weighted score |
| `human-decision-gate` | final human choice | reports readiness; never auto-selects |
| `source-ledger` | provenance ledger | structured source count/list |

## Compute rules

1. Validate module input.
2. Resolve dependency outputs by incoming edges.
3. Run the registered deterministic function.
4. Validate output.
5. Set `ready`, clear errors, record formula and recompute time.
6. If validation or compute fails, set only that module to `error`; do not synthesize a fallback answer.

Input changes mark descendants `stale`, calculate the affected transitive closure, and recompute only those modules in topological order. Upstream unrelated modules are not recomputed.

## Renderer rules

Trusted renderers are ordinary React components selected by the registry type. They receive structured module data and typed callbacks. They must not:

- use `dangerouslySetInnerHTML` for agent output;
- execute source text;
- make module-controlled network requests;
- expose credentials;
- mutate workspace state outside the command/store boundary.

## Adding a production module

A new module type requires a source-code change and review:

1. add the type to `moduleTypeSchema`;
2. define strict input/output schemas;
3. implement deterministic compute;
4. provide a renderer and accessibility summary;
5. document provenance/formula semantics;
6. add compute, malformed-input, stale-propagation, and accessibility tests;
7. update this registry table.

This review requirement is intentional. LLM output alone cannot expand the trusted execution surface.
