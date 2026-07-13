import { useEffect, useMemo, useRef, useState } from 'react';
import { bridgeMessageSchema, createSandboxDocument, type SandboxMessage } from './policy';

export function SandboxPreview({ source, onMessage }: { source: string; onMessage?: (message: SandboxMessage) => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [timedOut, setTimedOut] = useState(false);
  const srcDoc = useMemo(() => createSandboxDocument(source), [source]);

  useEffect(() => {
    setTimedOut(false);
    const listener = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const parsed = bridgeMessageSchema.safeParse(event.data);
      if (!parsed.success) return;
      onMessage?.(parsed.data);
    };
    window.addEventListener('message', listener);
    const timeout = window.setTimeout(() => setTimedOut(true), 1800);
    return () => {
      window.removeEventListener('message', listener);
      window.clearTimeout(timeout);
    };
  }, [onMessage, srcDoc]);

  return (
    <div className="sandbox-shell" data-timeout={timedOut ? 'true' : 'false'}>
      <div><strong>ISOLATED HTML/JS PREVIEW</strong><span>{timedOut ? 'watchdog timeout' : 'network denied · opaque origin'}</span></div>
      {timedOut ? <p role="status">Preview stopped after the execution window. Reload the module to retry.</p> : null}
      {!timedOut ? (
        <iframe
          ref={frameRef}
          title="Experimental isolated module preview"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={srcDoc}
        />
      ) : null}
    </div>
  );
}
