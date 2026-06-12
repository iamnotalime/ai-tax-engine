import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { getSessionUser } from '@/server/auth/session';
import { NewCaseWizard } from './ui';

export default async function NewCasePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return (
    <>
      <Nav />
      <main className="shell section">
        <div className="split">
          <div className="stack">
            <p className="eyebrow">Intake wizard</p>
            <h2>Ubah dokumen panik menjadi case file.</h2>
            <p className="lede">Mulai dengan surat SP2DK atau screenshot error. Jangan unggah credential DJP/Coretax.</p>
            <div className="disclaimer">Output AI adalah draft/checklist. Paid case-specific output wajib direview profesional.</div>
          </div>
          <NewCaseWizard />
        </div>
      </main>
    </>
  );
}
