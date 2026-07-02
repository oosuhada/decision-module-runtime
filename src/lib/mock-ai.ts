import { sleep } from './shared';

export type StreamOptions = {
  delay?: number;
  chunkSize?: number;
  onChunk: (text: string) => void;
};

export async function streamDeterministicText(text: string, options: StreamOptions) {
  const delay = options.delay ?? 22;
  const chunkSize = options.chunkSize ?? 3;
  let cursor = 0;

  while (cursor < text.length) {
    const chunk = text.slice(cursor, cursor + chunkSize);
    options.onChunk(chunk);
    cursor += chunkSize;
    await sleep(delay);
  }
}

export const signalGardenSources = [
  {
    id: 'interview-01',
    source: 'Customer interview · Growth lead',
    quote: 'I can build a dashboard in ten minutes, but I still spend an hour checking whether the numbers actually mean the same thing across teams.',
    cluster: 'Trust gap',
  },
  {
    id: 'review-04',
    source: 'App review · 2 stars',
    quote: 'Search is fast until I need to explain where an answer came from. Then I end up opening five tabs and rebuilding the trail myself.',
    cluster: 'Traceability',
  },
  {
    id: 'support-12',
    source: 'Support ticket · Enterprise',
    quote: 'Our approvers will not accept AI-generated summaries unless every statement links back to the exact customer record.',
    cluster: 'Traceability',
  },
  {
    id: 'meeting-09',
    source: 'Product council · Notes',
    quote: 'Teams say they want more automation, but the actual blocker is confidence. They need to see why a recommendation changed.',
    cluster: 'Trust gap',
  },
  {
    id: 'interview-07',
    source: 'Customer interview · PM',
    quote: 'I do not need another summary. I need the evidence grouped around the decision I have to make on Friday.',
    cluster: 'Decision context',
  },
  {
    id: 'review-11',
    source: 'App review · 4 stars',
    quote: 'The AI is useful when it surfaces disagreement. When it smooths everything into one answer, I trust it less.',
    cluster: 'Contradiction',
  },
];

export const challengeResponse =
  'Counter-signal found: two power users said detailed provenance slows routine work. The opportunity should therefore expose evidence on demand, not force every user through a full audit trail. Confidence remains medium-high because enterprise and regulated-team signals still converge.';

export const skepticResponses = {
  Conservative:
    'The conservative case may underprice opportunity cost. A slow pilot protects cash, but it delays learning about defect taxonomies that competitors are already codifying.',
  Base:
    'The base case depends on supervisor adoption. If the inspection workflow adds more than 18 seconds per unit, modeled productivity gains disappear even at 92% model accuracy.',
  Aggressive:
    'The aggressive case treats integration as reversible. It is not: camera placement, line stoppages, and retraining create switching costs before model accuracy is proven in edge conditions.',
};

export const vendorEvidence = {
  Helix: ['SOC 2 Type II', 'On-prem inference option', '91% benchmark accuracy'],
  Northstar: ['ISO 27001', 'Fastest deployment', '88% benchmark accuracy'],
  Veridian: ['Private VPC', 'Highest benchmark accuracy', 'Most expensive integration'],
};

export const museumArtifacts = [
  { id: 1, title: 'First sketch', kind: 'note', year: 'Week 01', emotion: 0.72, project: 'Origin', body: 'A rough note: “What if the product showed evidence as a place you can navigate instead of a list you have to search?”' },
  { id: 2, title: 'Wireframe 07', kind: 'wireframe', year: 'Week 03', emotion: 0.42, project: 'Shape', body: 'The first spatial layout. Useful structure, but the navigation felt like a dashboard pretending to be a room.' },
  { id: 3, title: 'Failed retrieval test', kind: 'experiment', year: 'Week 05', emotion: 0.18, project: 'Break', body: 'Participants found relevant notes quickly, but could not tell why the system connected them. Retrieval worked; meaning did not.' },
  { id: 4, title: 'User voice memo', kind: 'feedback', year: 'Week 06', emotion: 0.66, project: 'Break', body: '“I want to follow the story of the project, not query a database about it.” That sentence changed the interaction model.' },
  { id: 5, title: 'Launch surface', kind: 'screen', year: 'Week 10', emotion: 0.91, project: 'Release', body: 'The final launch surface used light threads as explanation: every connection was visible before the user opened the underlying document.' },
  { id: 6, title: 'Retrospective', kind: 'reflection', year: 'Week 12', emotion: 0.84, project: 'Release', body: 'The strongest insight was not “3D is engaging.” It was that spatial arrangement can encode chronology, confidence, and emotional weight at once.' },
];
