'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AuthLayout, authInputStyle, authLabelStyle, authButtonStyle } from '@/components/auth/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';

const ROLES = ['CEO', 'CTO', 'COO', 'Manager', 'Employee'];

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Employee');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ email, password, name, org, role: role.toLowerCase() });
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your organization"
      subtitle="Register your organization and executive profile"
      footer={<>Already have an account? <Link href="/login" style={{ color: 'var(--accent)' }}>Sign in</Link></>}
    >
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={authLabelStyle}>Full name</label>
          <input style={authInputStyle} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={authLabelStyle}>Organization</label>
          <input style={authInputStyle} value={org} onChange={(e) => setOrg(e.target.value)} required placeholder="Acme Inc." />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={authLabelStyle}>Executive role</label>
          <select style={authInputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={authLabelStyle}>Email</label>
          <input style={authInputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={authLabelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...authInputStyle, paddingRight: '42px' }} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a strong password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 10px' }}>{error}</p>}
        <button style={{ ...authButtonStyle, opacity: busy ? 0.7 : 1 }} type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}
