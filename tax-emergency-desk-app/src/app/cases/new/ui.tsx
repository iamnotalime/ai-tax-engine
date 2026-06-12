'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewCaseWizard() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const createRes = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType: formData.get('caseType'),
          title: formData.get('title'),
          taxpayerType: formData.get('taxpayerType'),
          taxpayerName: formData.get('taxpayerName'),
          packageCode: formData.get('packageCode'),
          sourceChannel: 'app_intake'
        })
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error?.message ?? 'Gagal membuat kasus.');
      const files = formData.getAll('files').filter((value) => value instanceof File && value.size > 0) as File[];
      if (files.length) {
        const upload = new FormData();
        for (const file of files) upload.append('files', file);
        const uploadRes = await fetch(`/api/cases/${createJson.case.id}/documents`, { method: 'POST', body: upload });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error?.message ?? 'Gagal upload dokumen.');
        await fetch(`/api/cases/${createJson.case.id}/triage`, { method: 'POST' });
      }
      router.push(`/cases/${createJson.case.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" action={submit}>
      <div className="field"><label>Tipe kasus</label><select name="caseType" required><option value="sp2dk_response">SP2DK Response</option><option value="coretax_error">Coretax Error</option><option value="efaktur_error">e-Faktur Error</option></select></div>
      <div className="field"><label>Paket</label><select name="packageCode"><option value="free_ai_scan">Free AI Scan</option><option value="reviewed_sp2dk_response_pack">Reviewed SP2DK Response Pack</option><option value="coretax_error_resolution_pack">Coretax/e-Faktur Error Resolution Pack</option></select></div>
      <div className="field"><label>Judul kasus</label><input name="title" placeholder="SP2DK PPN Masa 2024" required minLength={3} /></div>
      <div className="field"><label>Nama WP/perusahaan</label><input name="taxpayerName" placeholder="PT Contoh Makmur" /></div>
      <div className="field"><label>Tipe WP</label><select name="taxpayerType"><option value="business">Badan/Usaha</option><option value="individual">Orang Pribadi</option></select></div>
      <div className="field"><label>Dokumen</label><input name="files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xml,.txt" /></div>
      <p className="muted-dark">Dengan melanjutkan, Anda menyetujui pemrosesan dokumen untuk analisis AI/OCR dan akses reviewer jika memilih paket berbayar.</p>
      {error && <p className="alert">{error}</p>}
      <button className="button primary" type="submit" disabled={busy}>{busy ? 'Memproses…' : 'Buat case file'}</button>
    </form>
  );
}
