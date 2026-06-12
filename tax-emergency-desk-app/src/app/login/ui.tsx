'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = {
      email: String(formData.get('email')).trim(),
      password: String(formData.get('password')),
      fullName: String(formData.get('fullName') ?? 'Tax Desk User').trim()
    };
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const contentType = res.headers.get('content-type') ?? '';
      const json = contentType.includes('application/json') ? await res.json() : null;
      setError(json?.error?.message ?? 'Gagal login.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }
  return (
    <form className="form-card" action={submit}>
      <div className="actions" style={{ marginBottom: 18 }}>
        <button className="button" type="button" onClick={() => setMode('login')}>Login</button>
        <button className="button" type="button" onClick={() => setMode('signup')}>Daftar</button>
      </div>
      {mode === 'signup' && <div className="field"><label>Nama lengkap</label><input name="fullName" required minLength={2} /></div>}
      <div className="field"><label>Email</label><input name="email" type="email" required /></div>
      <div className="field"><label>Password</label><input name="password" type="password" required minLength={mode === 'signup' ? 10 : 1} /></div>
      {error && <p className="alert">{error}</p>}
      <button className="button primary" type="submit">{mode === 'login' ? 'Masuk' : 'Buat akun'}</button>
    </form>
  );
}
