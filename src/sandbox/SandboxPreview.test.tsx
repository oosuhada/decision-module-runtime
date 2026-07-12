import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SandboxPreview } from './SandboxPreview';
import { createSandboxDocument, sandboxPolicy } from './policy';

describe('sandbox isolation', () => {
  it('denies same-origin and network capabilities by contract', () => {
    const document = createSandboxDocument('<p>safe preview</p>');
    expect(document).toContain("connect-src 'none'");
    expect(document).toContain("default-src 'none'");
    expect(sandboxPolicy.sameOriginAllowed).toBe(false);
    expect(sandboxPolicy.networkAllowed).toBe(false);
  });

  it('renders an iframe with allow-scripts but never allow-same-origin', () => {
    render(<SandboxPreview source="<p>Hello</p>" />);
    const frame = screen.getByTitle('Experimental isolated module preview');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });
});
