'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured Next.js App Error:', error);
  }, [error]);

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', background: '#fff', color: '#111' }}>
      <h2 style={{ color: '#E4491B' }}>Runtime Error in Paper Studio</h2>
      <p style={{ fontWeight: 'bold' }}>{error.message}</p>
      <pre style={{ color: '#c00', fontSize: '12px', whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
        {error.stack}
      </pre>
      <button
        onClick={() => reset()}
        style={{ padding: '8px 16px', marginTop: '16px', cursor: 'pointer', background: '#111', color: '#fff', borderRadius: '6px' }}
      >
        Try again
      </button>
    </div>
  );
}
