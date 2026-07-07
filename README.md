# Generative Decision Surface

**An interface that assembles itself around the decision.** This prototype begins as an empty computational workspace, plans the instruments required by a vendor-selection decision, then builds and connects those instruments live.

## Art direction

The Surface is a spatial operating system: bright neutral canvas, strict grid, square instrument modules, tiny runtime typography, visible data dependencies, and fast layout changes. It intentionally avoids chat UI, glass, paper texture, and decorative 3D.

## Core interactions

- Empty workspace → visible planned slots/ports → streamed live module assembly.
- React Flow dependency graph with draggable and deletable instrument nodes.
- Zustand-backed criteria and budget state; dependent recommendation content recomputes instantly.
- Human node moves, deletes and input changes are encoded as canvas events that the agent readback consumes.
- Command palette and `Focus on Security` spatial reconfiguration.
- Vendor matrix, risk vector, counter-case, rationale, and human decision gate.
- Responsive compact workstation layout, reduced-motion behavior, and low-power animation reduction.

## Visual reference adoption

The required catalog is preserved verbatim at [`docs/visual-reference-catalog.md`](docs/visual-reference-catalog.md). The OpenGenerativeUI/genui-canvas architecture adaptation, editor comparisons and license decisions are documented in [`docs/reference-adoption.md`](docs/reference-adoption.md).

### Latest captures

![Generative Decision Surface desktop](./public/preview.png)

![Generative Decision Surface mobile](./public/preview-mobile.png)

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
