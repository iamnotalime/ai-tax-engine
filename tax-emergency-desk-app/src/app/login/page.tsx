import { Nav } from '@/components/Nav';
import { LoginForm } from './ui';

export default function LoginPage() {
  return (
    <>
      <Nav />
      <main className="shell section">
        <div className="split">
          <div className="stack">
            <p className="eyebrow">Secure access</p>
            <h2>Masuk ke ruang kasus.</h2>
            <p className="lede">Gunakan akun user, ops, atau reviewer. Untuk demo lokal, jalankan seed untuk membuat akun contoh.</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
