import { z } from 'zod';
import type { EmbeddingProvider, LlmProvider, StructuredLlmRequest, StructuredLlmResult } from './types';

function detectCategory(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('sp2dk') || lower.includes('permintaan penjelasan')) return 'sp2dk_letter';
  if (lower.includes('coretax')) return 'coretax_screenshot';
  if (lower.includes('efaktur') || lower.includes('e-faktur')) return 'efaktur_error_file';
  if (lower.includes('faktur pajak')) return 'tax_invoice_faktur_pajak';
  if (lower.includes('invoice')) return 'invoice';
  if (lower.includes('mutasi') || lower.includes('rekening')) return 'bank_statement';
  if (lower.includes('spt')) return 'spt';
  return 'other';
}

function syntheticFor(schemaName: string, prompt: string) {
  const documentId = prompt.match(/DOCUMENT_ID:\s*([^\n]+)/)?.[1]?.trim() ?? 'doc_mock';
  if (schemaName === 'DocumentClassificationOutput') {
    const category = detectCategory(prompt);
    return {
      document_id: documentId,
      category,
      confidence: 0.78,
      summary: `Mock classification: dokumen terdeteksi sebagai ${category}.`,
      detected_fields: {},
      missing_information: ['Output mock. Jalankan provider AI/OCR produksi untuk hasil final.'],
      source_refs: [{ document_id: documentId, page_number: 1, field: 'document_text', confidence: 0.78 }]
    };
  }
  if (schemaName === 'Sp2dkExtractionOutput') {
    return {
      letter: {
        letter_number: null,
        letter_date: null,
        received_date: null,
        kpp_name: null,
        taxpayer_name: null,
        taxpayer_npwp_visible: null,
        deadline_date: null,
        deadline_basis: 'Output mock; tanggal terima perlu dikonfirmasi manual.'
      },
      issues: [
        {
          issue_code: 'NEEDS_MANUAL_EXTRACTION',
          title: 'Perlu ekstraksi manual/AI produksi',
          description: 'Dokumen perlu ditinjau dengan provider OCR/LLM produksi untuk mengidentifikasi isu pajak secara akurat.',
          tax_type: null,
          period: null,
          amount_visible: null,
          severity: 'medium',
          confidence: 0.55,
          source_refs: [{ document_id: documentId, page_number: 1, field: 'document_text', confidence: 0.55 }]
        }
      ],
      requested_documents: ['SP2DK lengkap', 'Dokumen pendukung transaksi yang disebut dalam surat'],
      missing_information: ['Nomor surat, tanggal, KPP, dan isu perlu dikonfirmasi.'],
      source_refs: []
    };
  }
  if (schemaName === 'CoretaxErrorExtractionOutput') {
    return {
      error_type: 'unknown_coretax_or_efaktur_error',
      visible_error_message: null,
      module: null,
      likely_causes: ['Pesan error belum dapat diekstrak oleh mock provider.'],
      checklist: ['Unggah screenshot lebih jelas atau file error/XML/CSV pendukung.', 'Review oleh tax associate diperlukan.'],
      review_required: true,
      source_refs: [{ document_id: documentId, page_number: 1, field: 'document_text', confidence: 0.5 }]
    };
  }
  if (schemaName === 'EvidenceChecklistOutput') {
    return {
      overall_completeness: 'medium',
      items: [
        {
          label: 'Dokumen utama kasus',
          description: 'SP2DK/screenshot error utama yang menjadi dasar kasus.',
          required: true,
          status: 'uploaded',
          reason: 'Setidaknya satu dokumen telah diunggah.',
          related_issue_code: null,
          source_refs: []
        },
        {
          label: 'Dokumen pendukung transaksi',
          description: 'Invoice, faktur pajak, bukti potong, mutasi, SPT, atau dokumen lain yang relevan.',
          required: true,
          status: 'missing',
          reason: 'Perlu dilengkapi berdasarkan isu yang teridentifikasi.',
          related_issue_code: 'NEEDS_MANUAL_EXTRACTION',
          source_refs: []
        }
      ],
      notes: ['Checklist ini dihasilkan mock dan wajib direview.']
    };
  }
  if (schemaName === 'DraftResponseOutput') {
    return {
      title: 'Draft Awal Response Pack Pajak',
      recipient: null,
      sections: [
        {
          heading: 'Catatan awal',
          body: 'Draft ini disusun sebagai kerangka awal berdasarkan dokumen yang diunggah. Detail kasus perlu dilengkapi dan direview profesional sebelum digunakan.',
          source_refs: []
        }
      ],
      attachments: ['Lampiran dokumen utama', 'Lampiran dokumen pendukung yang masih perlu dilengkapi'],
      review_required: true,
      risk_notes: ['Output mock; tidak boleh dikirim tanpa review profesional.'],
      unsupported_claims: []
    };
  }
  if (schemaName === 'SupportCheckOutput') {
    return { supported: false, unsupported_claims: [], risky_language: [], suggested_edits: ['Review profesional wajib.'] };
  }
  return {};
}

export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';
  readonly model = 'mock-structured-v1';

  async generateStructured<TSchema extends z.ZodTypeAny>(
    request: StructuredLlmRequest<TSchema>
  ): Promise<StructuredLlmResult<z.infer<TSchema>>> {
    const started = Date.now();
    const raw = syntheticFor(request.schemaName, request.userPrompt);
    const data = request.schema.parse(raw);
    return {
      data,
      rawText: JSON.stringify(raw),
      latencyMs: Date.now() - started,
      model: this.model,
      provider: this.name
    };
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly model = 'mock-embedding-v1';

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const arr = new Array(1536).fill(0);
      for (let i = 0; i < text.length; i++) arr[i % 1536] += text.charCodeAt(i) / 255;
      const norm = Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0)) || 1;
      return arr.map((v) => Number((v / norm).toFixed(6)));
    });
  }
}
