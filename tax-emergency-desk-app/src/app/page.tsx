import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { FREE_SCAN_DISCLAIMER } from '@/lib/constants';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="shell">
        <section className="hero">
          <div className="stack">
            <p className="eyebrow">SP2DK · Coretax · e-Faktur</p>
            <h1>Response pack pajak, bukan chatbot pajak.</h1>
            <p className="lede">
              Unggah surat atau error pajak. Sistem menyusun ringkasan isu, checklist bukti,
              draft awal, dan workbench untuk reviewer profesional. Tidak ada janji hasil, tidak ada
              filing otomatis, tidak ada penyimpanan credential DJP.
            </p>
            <div className="actions">
              <Link className="button primary" href="/cases/new">Upload dokumen</Link>
              <Link className="button" href="/login">Login</Link>
            </div>
            <div className="disclaimer">{FREE_SCAN_DISCLAIMER}</div>
          </div>
          <aside className="hero-card">
            <p className="eyebrow" style={{ color: '#6c4b16' }}>Case File Preview</p>
            <h2 style={{ fontSize: '2.8rem' }}>SP2DK clarity desk</h2>
            <div className="case-file">
              <div className="case-file-row"><strong>Issue</strong><span>PPN mismatch</span></div>
              <div className="case-file-row"><strong>Evidence</strong><span>Invoice · Faktur · Mutasi</span></div>
              <div className="case-file-row"><strong>Reviewer</strong><span>Senior QC required</span></div>
              <div className="case-file-row"><strong>Status</strong><span>Draft, not final advice</span></div>
            </div>
          </aside>
        </section>
        <section className="section grid">
          <div className="card"><h3>1. Intake terstruktur</h3><p className="muted">Dokumen masuk sebagai case file, bukan chat acak.</p></div>
          <div className="card"><h3>2. RAG + agentic workflow</h3><p className="muted">OCR, klasifikasi, extraction, evidence checklist, draft, support check.</p></div>
          <div className="card"><h3>3. Human review</h3><p className="muted">Paid case-specific output wajib melalui reviewer profesional.</p></div>
        </section>
      </main>
    </>
  );
}
