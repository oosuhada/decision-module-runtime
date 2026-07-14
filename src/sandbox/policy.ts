import { z } from 'zod';

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_MESSAGE_BYTES = 8 * 1024;

export const bridgeMessageSchema = z.object({
  channel: z.literal('decision-sandbox'),
  kind: z.enum(['ready', 'output', 'error']),
  value: z.string().max(MAX_MESSAGE_BYTES),
});

export type SandboxMessage = z.infer<typeof bridgeMessageSchema>;

export function createSandboxDocument(source: string) {
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) throw new Error('Sandbox source exceeds 64 KiB limit');
  const csp = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  const scriptClose = `</${'script'}>`;
  const bridge = `<script>
    (() => {
      const send = (kind, value) => parent.postMessage({channel:'decision-sandbox',kind,value:String(value).slice(0,8192)}, '*');
      window.addEventListener('error', (event) => send('error', event.message || 'sandbox error'));
      send('ready', 'sandbox ready');
      setTimeout(() => send('output', 'execution window complete'), 1200);
    })();
  ${scriptClose}`;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;font:14px system-ui;background:#fff;color:#111}body{padding:16px}</style></head><body>${bridge}${source}</body></html>`;
}

export const sandboxPolicy = {
  maxSourceBytes: MAX_SOURCE_BYTES,
  maxMessageBytes: MAX_MESSAGE_BYTES,
  sandboxTokens: ['allow-scripts'],
  sameOriginAllowed: false,
  networkAllowed: false,
} as const;
