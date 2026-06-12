'use client';

import { LogIn, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = {
      email: String(formData.get('email')).trim(),
      password: String(formData.get('password')),
      fullName: String(formData.get('fullName') ?? 'Tax Desk User').trim()
    };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        const json = contentType.includes('application/json') ? await res.json() : null;
        setError(json?.error?.message ?? 'Gagal login.');
        return;
      }
      window.location.assign('/dashboard');
    } catch {
      setError('Gagal menghubungi server login.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-card" action="/api/auth/login" method="post" onSubmit={submit}>
      <div className="actions mode-switch">
        <button className={mode === 'login' ? 'button primary' : 'button'} type="button" onClick={() => setMode('login')} disabled={busy}><LogIn size={18} aria-hidden="true" /> Login</button>
        <button className={mode === 'signup' ? 'button primary' : 'button'} type="button" onClick={() => setMode('signup')} disabled={busy}><UserPlus size={18} aria-hidden="true" /> Daftar</button>
      </div>
      {mode === 'signup' && <div className="field"><label htmlFor="fullName">Nama lengkap</label><input id="fullName" name="fullName" required minLength={2} autoComplete="name" /></div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={mode === 'signup' ? 10 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
      <div aria-live="polite">{error && <p className="alert">{error}</p>}</div>
      <button className="button primary" type="submit" disabled={busy}>
        {mode === 'login' ? <><LogIn size={18} aria-hidden="true" /> {busy ? 'Masuk...' : 'Masuk'}</> : <><UserPlus size={18} aria-hidden="true" /> {busy ? 'Membuat akun...' : 'Buat akun'}</>}
      </button>
    </form>
  );
}
