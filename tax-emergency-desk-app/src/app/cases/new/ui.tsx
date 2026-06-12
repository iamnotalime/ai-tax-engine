'use client';

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, FilePlus2, RotateCw, UploadCloud, X } from 'lucide-react';
import { PACKAGES, UPLOAD_LIMITS } from '@/lib/constants';

type WizardStep = 0 | 1 | 2 | 3;
type FileState = 'ready' | 'invalid' | 'uploading' | 'uploaded' | 'failed';

type FileItem = {
  id: string;
  file: File;
  state: FileState;
  progress: number;
  message: string;
};

const STEPS = ['Case', 'Taxpayer', 'Documents', 'Review'];
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/csv', 'application/xml', 'text/xml']);
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.csv', '.xml', '.txt'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const CASE_TYPES = [
  { value: 'sp2dk_response', label: 'SP2DK Response' },
  { value: 'coretax_error', label: 'Coretax Error' },
  { value: 'efaktur_error', label: 'e-Faktur Error' }
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatPrice(value: number) {
  return value === 0 ? 'Free' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function packageLimit(packageCode: string) {
  return packageCode === 'free_ai_scan' ? UPLOAD_LIMITS.maxFilesFreeScan : UPLOAD_LIMITS.maxFilesPaidCase;
}

function packageSupportsCase(item: (typeof PACKAGES)[number], caseType: string) {
  return (item.caseTypes as readonly string[]).includes(caseType);
}

function validateFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (file.size > MAX_FILE_BYTES) return `File exceeds ${formatBytes(MAX_FILE_BYTES)}.`;
  if (file.type && !ALLOWED_TYPES.has(file.type)) return `Unsupported type: ${file.type}.`;
  if (!file.type && !hasAllowedExtension) return 'Unsupported file extension.';
  return null;
}

export function NewCaseWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<WizardStep>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [form, setForm] = useState({
    caseType: 'sp2dk_response',
    packageCode: 'free_ai_scan',
    title: '',
    taxpayerName: '',
    taxpayerNpwp: '',
    taxpayerType: 'business'
  });
  const [files, setFiles] = useState<FileItem[]>([]);

  const availablePackages = useMemo(() => PACKAGES.filter((item) => packageSupportsCase(item, form.caseType)), [form.caseType]);
  const maxFiles = packageLimit(form.packageCode);
  const validFiles = files.filter((file) => file.state !== 'invalid');
  const failedFiles = files.filter((file) => file.state === 'failed');
  const uploadedFiles = files.filter((file) => file.state === 'uploaded');

  function updateForm(name: keyof typeof form, value: string) {
    setError(null);
    setMessage(null);
    setForm((current) => {
      if (name === 'caseType') {
        const packageStillValid = PACKAGES.find((item) => item.code === current.packageCode && packageSupportsCase(item, value));
        return { ...current, caseType: value, packageCode: packageStillValid ? current.packageCode : 'free_ai_scan' };
      }
      return { ...current, [name]: value };
    });
  }

  function updateFile(id: string, patch: Partial<FileItem>) {
    setFiles((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;
    setError(null);
    setMessage(null);
    setFiles((current) => {
      const currentValidCount = current.filter((item) => item.state !== 'invalid').length;
      let nextValidCount = currentValidCount;
      const nextItems = selectedFiles.map((file, index): FileItem => {
        const validationError = validateFile(file);
        const duplicate = current.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
        const overLimit = !validationError && !duplicate && nextValidCount >= maxFiles;
        const messageText = validationError ?? (duplicate ? 'Already added.' : overLimit ? `Package limit is ${maxFiles} files.` : 'Ready for upload.');
        const state: FileState = validationError || duplicate || overLimit ? 'invalid' : 'ready';
        if (state === 'ready') nextValidCount += 1;
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
          file,
          state,
          progress: 0,
          message: messageText
        };
      });
      return [...current, ...nextItems];
    });
    event.target.value = '';
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
  }

  function validateStep(targetStep: WizardStep) {
    if (targetStep === 0) {
      if (form.title.trim().length < 3) return 'Case title must be at least 3 characters.';
      if (!availablePackages.some((item) => item.code === form.packageCode)) return 'Select a package that supports this case type.';
    }
    if (targetStep === 2) {
      if (!validFiles.length) return 'Add at least one supported document.';
      if (validFiles.length > maxFiles) return `This package allows up to ${maxFiles} files.`;
      if (files.some((file) => file.state === 'invalid')) return 'Remove invalid files before submitting.';
    }
    return null;
  }

  function nextStep() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(3, current + 1) as WizardStep);
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(0, current - 1) as WizardStep);
  }

  function goToStep(targetStep: WizardStep) {
    if (targetStep <= step) {
      setError(null);
      setStep(targetStep);
      return;
    }
    for (let index = 0; index < targetStep; index += 1) {
      const validationError = validateStep(index as WizardStep);
      if (validationError) {
        setError(validationError);
        setStep(index as WizardStep);
        return;
      }
    }
    setError(null);
    setStep(targetStep);
  }

  async function createCase() {
    if (createdCaseId) return createdCaseId;
    setMessage('Creating case file...');
    const createRes = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseType: form.caseType,
        title: form.title.trim(),
        taxpayerType: form.taxpayerType,
        taxpayerName: form.taxpayerName.trim(),
        taxpayerNpwp: form.taxpayerNpwp.trim(),
        packageCode: form.packageCode,
        sourceChannel: 'app_intake'
      })
    });
    const createJson = await createRes.json();
    if (!createRes.ok) throw new Error(createJson.error?.message ?? 'Gagal membuat kasus.');
    setCreatedCaseId(createJson.case.id);
    return createJson.case.id as string;
  }

  function uploadFile(caseId: string, item: FileItem) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const payload = new FormData();
      payload.append('files', item.file);
      updateFile(item.id, { state: 'uploading', progress: 8, message: 'Uploading and extracting text...' });
      xhr.open('POST', `/api/cases/${caseId}/documents`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateFile(item.id, { progress: Math.max(8, Math.round((event.loaded / event.total) * 92)) });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateFile(item.id, { state: 'uploaded', progress: 100, message: 'Uploaded. OCR/text extraction queued or completed.' });
          resolve();
          return;
        }
        let messageText = `Upload failed with status ${xhr.status}.`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          messageText = parsed.error?.message ?? messageText;
        } catch {
          // Keep the generic status message.
        }
        updateFile(item.id, { state: 'failed', progress: 0, message: messageText });
        reject(new Error(messageText));
      };
      xhr.onerror = () => {
        updateFile(item.id, { state: 'failed', progress: 0, message: 'Network error during upload.' });
        reject(new Error('Network error during upload.'));
      };
      xhr.send(payload);
    });
  }

  async function queueTriage(caseId: string) {
    setMessage('Queueing AI/OCR triage...');
    const triageRes = await fetch(`/api/cases/${caseId}/triage`, { method: 'POST' });
    if (!triageRes.ok) throw new Error((await triageRes.json()).error?.message ?? 'Gagal menjalankan triage.');
  }

  async function uploadPendingFiles(caseId: string) {
    const pending = files.filter((item) => item.state === 'ready' || item.state === 'failed');
    const failures: string[] = [];
    for (const item of pending) {
      try {
        await uploadFile(caseId, item);
      } catch (uploadError) {
        failures.push(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
      }
    }
    return failures;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stepError = (validateStep(0) ?? validateStep(2));
    if (stepError) {
      setError(stepError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const caseId = await createCase();
      const failures = await uploadPendingFiles(caseId);
      if (failures.length) {
        setError(`${failures.length} file upload failed. Retry failed uploads or open the case file.`);
        setMessage('Case file was created, but triage has not been queued yet.');
        return;
      }
      await queueTriage(caseId);
      setMessage('Case file created and triage queued.');
      router.push(`/cases/${caseId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
    }
  }

  async function retryFailedUploads() {
    if (!createdCaseId) return;
    setBusy(true);
    setError(null);
    try {
      const failures = await uploadPendingFiles(createdCaseId);
      if (failures.length) {
        setError(`${failures.length} file upload still failed.`);
        return;
      }
      await queueTriage(createdCaseId);
      router.push(`/cases/${createdCaseId}`);
      router.refresh();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Retry failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="wizard-card" onSubmit={submit} noValidate>
      <div className="wizard-steps" aria-label="Intake progress">
        {STEPS.map((label, index) => (
          <button
            aria-current={step === index ? 'step' : undefined}
            className={`wizard-step ${step === index ? 'active' : ''} ${step > index ? 'done' : ''}`}
            disabled={busy}
            key={label}
            type="button"
            onClick={() => goToStep(index as WizardStep)}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="wizard-body">
        {step === 0 && (
          <section className="wizard-pane">
            <div className="form-heading">
              <h3>Case setup</h3>
              <p className="muted">Choose the tax workflow and package before the system accepts documents.</p>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="case-type">Tipe kasus</label>
                <select id="case-type" name="caseType" required value={form.caseType} onChange={(event) => updateForm('caseType', event.target.value)}>
                  {CASE_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="package-code">Paket</label>
                <select id="package-code" name="packageCode" value={form.packageCode} onChange={(event) => updateForm('packageCode', event.target.value)}>
                  {availablePackages.map((item) => <option value={item.code} key={item.code}>{item.name} / {formatPrice(item.priceIdr)}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="case-title">Judul kasus</label>
              <input id="case-title" name="title" placeholder="SP2DK PPN Masa 2024" required minLength={3} value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
            </div>
            <div className="package-summary">
              {availablePackages.map((item) => (
                <div className={item.code === form.packageCode ? 'package-card active' : 'package-card'} key={item.code}>
                  <strong>{item.name}</strong>
                  <span>{formatPrice(item.priceIdr)}</span>
                  <p>{item.requiresHumanReview ? 'Includes professional review gate.' : 'AI scan and generic checklist.'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="wizard-pane">
            <div className="form-heading">
              <h3>Taxpayer context</h3>
              <p className="muted">Keep this concise. Sensitive identifiers are protected server-side.</p>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="taxpayer-name">Nama WP/perusahaan</label>
                <input id="taxpayer-name" name="taxpayerName" placeholder="PT Contoh Makmur" value={form.taxpayerName} onChange={(event) => updateForm('taxpayerName', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="taxpayer-npwp">NPWP</label>
                <input id="taxpayer-npwp" name="taxpayerNpwp" inputMode="numeric" placeholder="01.234.567.8-901.000" value={form.taxpayerNpwp} onChange={(event) => updateForm('taxpayerNpwp', event.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="taxpayer-type">Tipe WP</label>
              <select id="taxpayer-type" name="taxpayerType" value={form.taxpayerType} onChange={(event) => updateForm('taxpayerType', event.target.value)}>
                <option value="business">Badan/Usaha</option>
                <option value="individual">Orang Pribadi</option>
              </select>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="wizard-pane">
            <div className="form-heading">
              <h3>Documents</h3>
              <p className="muted">Upload up to {maxFiles} files. PDF, images, CSV, XML, and text are accepted.</p>
            </div>
            <label className="upload-dropzone" htmlFor="case-files">
              <UploadCloud size={24} aria-hidden="true" />
              <span>Choose documents</span>
              <small>Do not upload DJP/Coretax credentials.</small>
            </label>
            <input ref={inputRef} id="case-files" className="sr-only" name="files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xml,.txt" onChange={addFiles} />
            <div className="file-queue" aria-live="polite">
              {!files.length ? <p className="muted">No files selected yet.</p> : files.map((item) => (
                <div className={`file-card ${item.state}`} key={item.id}>
                  <div>
                    <strong>{item.file.name}</strong>
                    <span className="rail-meta">{formatBytes(item.file.size)} / {item.file.type || 'extension validated'}</span>
                    <p className="muted">{item.message}</p>
                  </div>
                  <div className="file-actions">
                    <span className={`status ${item.state === 'failed' || item.state === 'invalid' ? 'danger' : item.state === 'uploaded' ? 'success' : 'info'}`}>{item.state}</span>
                    {item.state === 'uploading' && <progress max={100} value={item.progress} aria-label={`${item.file.name} upload progress`} />}
                    {item.state !== 'uploading' && item.state !== 'uploaded' && (
                      <button className="icon-button" type="button" onClick={() => removeFile(item.id)} aria-label={`Remove ${item.file.name}`}>
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="wizard-pane">
            <div className="form-heading">
              <h3>Review intake</h3>
              <p className="muted">Confirm the case file before upload and OCR/AI triage starts.</p>
            </div>
            <div className="review-grid">
              <div className="review-item"><span>Case</span><strong>{form.title || '-'}</strong></div>
              <div className="review-item"><span>Type</span><strong>{form.caseType.replaceAll('_', ' ')}</strong></div>
              <div className="review-item"><span>Package</span><strong>{PACKAGES.find((item) => item.code === form.packageCode)?.name}</strong></div>
              <div className="review-item"><span>Documents</span><strong>{validFiles.length} ready / {uploadedFiles.length} uploaded</strong></div>
            </div>
            <p className="muted-dark">Dengan melanjutkan, Anda menyetujui pemrosesan dokumen untuk analisis AI/OCR dan akses reviewer jika memilih paket berbayar.</p>
            {createdCaseId && (
              <div className="recovery-panel">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>Case file created. Failed uploads can be retried before triage runs.</span>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="form-status" aria-live="polite">
        {error && <p className="alert">{error}</p>}
        {message && <p className="muted">{message}</p>}
      </div>

      <div className="wizard-footer">
        <button className="button" type="button" onClick={previousStep} disabled={busy || step === 0}>
          <ChevronLeft size={18} aria-hidden="true" /> Back
        </button>
        {step < 3 ? (
          <button className="button primary" type="button" onClick={nextStep} disabled={busy}>
            Next <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <button className="button primary" type="submit" disabled={busy || failedFiles.length > 0}>
            <FilePlus2 size={18} aria-hidden="true" />
            {busy ? 'Processing...' : 'Create and run triage'}
          </button>
        )}
        {createdCaseId && failedFiles.length > 0 && (
          <button className="button" type="button" onClick={retryFailedUploads} disabled={busy}>
            <RotateCw size={18} aria-hidden="true" /> Retry failed uploads
          </button>
        )}
        {createdCaseId && (
          <button className="button" type="button" onClick={() => router.push(`/cases/${createdCaseId}`)} disabled={busy}>
            Open case
          </button>
        )}
      </div>
    </form>
  );
}
