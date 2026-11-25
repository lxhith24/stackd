'use client';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function GoogleSignIn({ callbackURL }: { callbackURL: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signIn() {
    setBusy(true); setError('');
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL });
    if (error) { setError(error.message || 'Sign-in failed. Please try again.'); setBusy(false); }
  }
  return <>
    <button type="button" className="primary-btn" onClick={signIn} disabled={busy}>{busy ? 'Opening Google…' : 'Continue with Google'}</button>
    {error && <small role="alert">{error}</small>}
  </>;
}
