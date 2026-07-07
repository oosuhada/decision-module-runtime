# Reference Adoption

## Adopted in Code

| Reference | License | Files/feature used | Changes made | Credit location |
|---|---|---|---|---|
| xyflow / React Flow | MIT | `src/App.tsx` spatial workspace | Editable generated instruments, ports, data edges, node movement and deletion | `CREDITS.md` |
| OpenGenerativeUI | MIT | `src/lib/generative-protocol.ts`, `src/App.tsx` | Adapted the plan → stream → render concept into typed instrument plans and staged slot replacement; implementation is original to this repo | `CREDITS.md` |
| genui-canvas | MIT | `src/lib/generative-protocol.ts`, `src/App.tsx` | Adapted bidirectional agent/canvas state ideas into typed canvas events and agent readback after human edits | `CREDITS.md` |
| Zustand | MIT | `src/App.tsx` | Live criteria, budget and focus state shared by generated instruments | `CREDITS.md` |
| Motion | MIT | `src/App.tsx` | Precise palette/state transitions and layout feedback | `CREDITS.md` |

No OpenGenerativeUI or genui-canvas component source was copied verbatim; their MIT-licensed architecture was studied and reimplemented as a small project-specific protocol.

## Visual Principles Adopted

| Reference | Observed principle | Our interpretation | Where visible |
|---|---|---|---|
| Onlook | Editing context, properties and preview state should coexist without becoming a dashboard | runtime rail + canvas + computation log form one workstation | whole shell |
| Graphite | Ports and procedural connections make computation legible | every generated instrument exposes actual input/output handles | graph nodes and edges |
| Puck | Composition should expose a clear intermediate structure before final render | planned slots appear before instruments mount | planning phase |
| Craft.js | Human edits should become structured editor events | move/delete/input changes become typed canvas events | agent readback |
| Motion Primitives | Reconfiguration should be brief, precise and spatially causal | security focus rearranges only relevant graph regions | Focus on Security |

## Prototype / Comparison Log

1. **React Flow + typed generative protocol live prototype** — retained. It preserves one spatial editor while making the AI plan and canvas feedback explicit.
2. **Craft.js API/package comparison** — MIT; `@craftjs/core` is about 483 KB unpacked. Nesting a second drag/drop editor inside React Flow would create conflicting selection and drag semantics.
3. **Puck API/package comparison** — MIT; current package line is roughly 1.3 MB unpacked. Its page-builder renderer is powerful but too document-oriented for a dependency graph.
4. **OpenGenerativeUI/genui-canvas source architecture comparison** — both MIT; their streamed UI and bidirectional state patterns were reduced to `createSurfacePlan`, `createCanvasEvent`, and dependency readback rather than importing an application framework.

## Investigated but Rejected

| Reference | Reason rejected |
|---|---|
| Onlook | Apache-2.0 verified; Electron/visual-code-editor stack is far beyond the prototype. Information architecture only. |
| Graphite | Apache-2.0 verified; procedural editor stack is too large. Port/node principles only. |
| Puck | MIT verified; page composition duplicates the existing spatial editor and increases bundle size. |
| Craft.js | MIT verified; nested editor interaction conflicts with React Flow drag/selection. |
| Open Canvas | MIT verified; document/chat workflow is less suitable than a spatial computation graph. |
| LlamaCoder | MIT verified; code-generation app architecture is not needed for deterministic instrument composition. |
| Motion Primitives | MIT verified; current Motion dependency already provides the required layout/transition primitives. |

## Investigated Candidate Set

README, current LICENSE file and demo/homepage were checked on 2026-08-23 for: `CopilotKit/OpenGenerativeUI`, `LuisErlacher/genui-canvas`, `onlook-dev/onlook`, `GraphiteEditor/Graphite`, `puckeditor/puck`, `prevwong/craft.js`, `langchain-ai/open-canvas`, `Nutlope/llamacoder`, `ibelick/motion-primitives`, and `xyflow/xyflow`.

## License Verification

- [x] LICENSE opened and read
- [x] Attribution requirements preserved
- [x] No unknown-license code copied
- [x] No incompatible copyleft dependency introduced
- [x] CREDITS.md updated

