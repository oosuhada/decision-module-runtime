# Generative Decision Surface

**An interface that assembles itself around the decision.** This prototype begins as an empty computational workspace, plans the instruments required by a vendor-selection decision, then builds and connects those instruments live.

## Art direction

The Surface is a spatial operating system: bright neutral canvas, strict grid, square instrument modules, tiny runtime typography, visible data dependencies, and fast layout changes. It intentionally avoids chat UI, glass, paper texture, and decorative 3D.

## Core interactions

- Empty workspace → planning → live module assembly.
- React Flow dependency graph with draggable and deletable instrument nodes.
- Zustand-backed criteria and budget state; dependent recommendation content recomputes instantly.
- Command palette and `Focus on Security` spatial reconfiguration.
- Vendor matrix, risk vector, counter-case, rationale, and human decision gate.
- Responsive compact workstation layout and reduced-motion behavior.

## Run locally

```bash
corepack pnpm install
corepack pnpm dev
```

Open http://localhost:3103.

## Quality checks

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

This repository does not rely on any local workspace package or sibling repository.
