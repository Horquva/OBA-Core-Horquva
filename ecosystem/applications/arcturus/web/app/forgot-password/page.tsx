'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { AuthLayout, authInputStyle, authLabelStyle, authButtonStyle } from '@/components/auth/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const msg = await resetPassword(email, password);
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Set a new password for your account"
      footer={<><Link href="/login" style={{ color: 'var(--accent)' }}>Back to sign in</Link></>}
    >
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={authLabelStyle}>Email</label>
          <input style={authInputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={authLabelStyle}>New password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...authInputStyle, paddingRight: '42px' }} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="New password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 10px' }}>{error}</p>}
        {message && <p style={{ color: '#22c55e', fontSize: '13px', margin: '0 0 10px' }}>{message}</p>}
        <button style={{ ...authButtonStyle, opacity: busy ? 0.7 : 1 }} type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button>
      </form>
    </AuthLayout>
  );
}
