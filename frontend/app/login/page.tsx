'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AuthLayout, authInputStyle, authLabelStyle, authButtonStyle } from '@/components/auth/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your Organizational Brain workspace"
    >
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label style={authLabelStyle}>Email</label>
          <input style={authInputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={authLabelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...authInputStyle, paddingRight: '42px' }} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {/* No "Forgot password?" link. Self-service recovery needs a mailbox
            round-trip this deployment has no mail service for; the endpoint
            that used to sit behind this link let anyone overwrite any account's
            password from the email address alone. A locked-out user is reset by
            an admin until a real flow exists. Signed-in users change their own
            password at /account. */}
        <div style={{ marginBottom: '10px' }} />
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 10px' }}>{error}</p>}
        <button style={{ ...authButtonStyle, opacity: busy ? 0.7 : 1 }} type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}
