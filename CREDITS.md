# Credits and licenses

Generative Decision Surface uses open-source libraries as infrastructure; its module system, visual language, and decision-flow design are original to this prototype.

## React Flow / xyflow
- Repository: https://github.com/xyflow/xyflow
- Steward: webkid GmbH and contributors
- License: MIT
- Use: draggable spatial workspace, dependency connectors, pan/zoom, and node handles.

## Zustand
- Repository: https://github.com/pmndrs/zustand
- Steward: Poimandres / pmndrs contributors
- License: MIT
- Use: live decision criteria, budget, and focus state shared by generated instruments.

## Motion
- Repository: https://github.com/motiondivision/motion
- License: MIT
- Use: command palette and generated-state transitions.

## Lucide
- Repository: https://github.com/lucide-icons/lucide
- License: ISC
- Use: workstation iconography.

No code was copied from v0, Framer Marketplace, or HTML-in-Canvas. Those products informed only the broad idea of interfaces assembling dynamically.

## Open Generative UI
- Repository: https://github.com/CopilotKit/OpenGenerativeUI
- Steward: CopilotKit contributors
- License: MIT
- Use: architecture reference for visible plan → stream → render stages. The implementation in `src/lib/generative-protocol.ts` is project-specific and not a verbatim source copy.

## genui-canvas
- Repository: https://github.com/LuisErlacher/genui-canvas
- Author: Luis Erlacher and contributors
- License: MIT
- Use: architecture reference for bidirectional agent/canvas state. Human edits are translated into local typed canvas events and agent readback.

## Onlook
- Repository: https://github.com/onlook-dev/onlook
- Steward: Onlook contributors
- License: Apache-2.0
- Use: visual-editor information architecture reference only; no Onlook source code is included.

## Graphite
- Repository: https://github.com/GraphiteEditor/Graphite
- Steward: Graphite contributors
- License: Apache-2.0
- Use: procedural ports/node information design reference only; no Graphite source code is included.
