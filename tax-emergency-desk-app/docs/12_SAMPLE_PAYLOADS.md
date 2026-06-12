# 12 — Sample Payloads

Use these as fixtures for Codex implementation and tests. These are synthetic examples.

## Sample case creation

```json
{
  "caseType": "sp2dk_response",
  "title": "SP2DK klarifikasi PPN 2024",
  "taxpayerType": "business",
  "taxpayerName": "PT Contoh Makmur",
  "sourceChannel": "google_ads_sp2dk"
}
```

## Sample document classification output

```json
{
  "document_id": "doc_001",
  "category": "sp2dk_letter",
  "confidence": 0.94,
  "summary": "Dokumen tampak sebagai SP2DK dari KPP yang meminta klarifikasi data PPN masa Januari-Maret 2024.",
  "detected_fields": {
    "letter_number": "S-123/SP2DK/KPP.XX/2026",
    "kpp_name": "KPP Pratama Contoh",
    "tax_periods": ["2024-01", "2024-02", "2024-03"],
    "tax_type": "PPN"
  },
  "missing_information": ["Tanggal diterima Wajib Pajak tidak terlihat."],
  "source_refs": [
    {
      "document_id": "doc_001",
      "page_number": 1,
      "field": "letter_number",
      "quote": "S-123/SP2DK/KPP.XX/2026",
      "confidence": 0.94
    }
  ]
}
```

## Sample SP2DK extraction

```json
{
  "letter": {
    "letter_number": "S-123/SP2DK/KPP.XX/2026",
    "letter_date": "2026-06-01",
    "received_date": null,
    "kpp_name": "KPP Pratama Contoh",
    "taxpayer_name": "PT Contoh Makmur",
    "taxpayer_npwp_visible": "01.xxx.xxx.x-xxx.xxx",
    "deadline_date": null,
    "deadline_basis": "Tanggal terima tidak terlihat; jangan hitung deadline otomatis."
  },
  "issues": [
    {
      "issue_code": "PPN_OUTPUT_MISMATCH",
      "title": "Indikasi perbedaan data PPN keluaran",
      "description": "Surat meminta klarifikasi atas perbedaan data transaksi PPN keluaran periode Januari-Maret 2024.",
      "tax_type": "PPN",
      "period": "2024-01..2024-03",
      "amount_visible": null,
      "severity": "medium",
      "confidence": 0.82,
      "source_refs": [
        {
          "document_id": "doc_001",
          "page_number": 1,
          "field": "issue_text",
          "quote": "klarifikasi atas data PPN keluaran masa Januari sampai Maret 2024",
          "confidence": 0.82
        }
      ]
    }
  ],
  "requested_documents": [
    "Penjelasan tertulis atas data yang diminta",
    "Dokumen pendukung transaksi periode terkait"
  ],
  "missing_information": [
    "Tanggal diterima surat",
    "Daftar detail transaksi pembanding dari DJP tidak terlihat"
  ],
  "source_refs": []
}
```

## Sample evidence checklist

```json
{
  "overall_completeness": "medium",
  "items": [
    {
      "label": "SP2DK asli lengkap",
      "description": "Surat SP2DK lengkap semua halaman.",
      "required": true,
      "status": "uploaded",
      "reason": "Dokumen SP2DK telah diunggah, tetapi perlu cek apakah semua lampiran ada.",
      "related_issue_code": null,
      "source_refs": [{ "document_id": "doc_001", "page_number": 1, "field": "document" }]
    },
    {
      "label": "Faktur pajak keluaran periode terkait",
      "description": "Faktur pajak keluaran untuk masa Januari-Maret 2024.",
      "required": true,
      "status": "missing",
      "reason": "Diperlukan untuk mencocokkan isu PPN keluaran.",
      "related_issue_code": "PPN_OUTPUT_MISMATCH",
      "source_refs": []
    },
    {
      "label": "Invoice/kontrak transaksi terkait",
      "description": "Invoice atau kontrak yang menjadi dasar transaksi pada masa pajak yang disebut.",
      "required": true,
      "status": "missing",
      "reason": "Diperlukan untuk mendukung penjelasan transaksi.",
      "related_issue_code": "PPN_OUTPUT_MISMATCH",
      "source_refs": []
    }
  ],
  "notes": [
    "Tanggal terima surat perlu dikonfirmasi manual agar deadline akurat."
  ]
}
```

## Sample draft response output

```json
{
  "title": "Draft Tanggapan atas SP2DK S-123/SP2DK/KPP.XX/2026",
  "recipient": "Kepala KPP Pratama Contoh",
  "sections": [
    {
      "heading": "Pembuka",
      "body": "Sehubungan dengan Surat Permintaan Penjelasan atas Data dan/atau Keterangan nomor S-123/SP2DK/KPP.XX/2026 tanggal 1 Juni 2026, bersama ini kami menyampaikan penjelasan dan dokumen pendukung awal berdasarkan data yang tersedia.",
      "source_refs": [
        { "document_id": "doc_001", "page_number": 1, "field": "letter_number" },
        { "document_id": "doc_001", "page_number": 1, "field": "letter_date" }
      ]
    },
    {
      "heading": "Penjelasan atas data PPN keluaran",
      "body": "Berdasarkan dokumen yang telah tersedia, isu yang diminta klarifikasi berkaitan dengan data PPN keluaran masa Januari sampai Maret 2024. Penjelasan rinci perlu dilengkapi dengan faktur pajak keluaran, invoice, dan dokumen pendukung transaksi periode tersebut.",
      "source_refs": [
        { "document_id": "doc_001", "page_number": 1, "field": "issue_text" }
      ]
    }
  ],
  "attachments": [
    "Lampiran 1 - Salinan SP2DK",
    "Lampiran 2 - Faktur pajak keluaran periode terkait (perlu dilengkapi)",
    "Lampiran 3 - Invoice/kontrak transaksi terkait (perlu dilengkapi)"
  ],
  "review_required": true,
  "risk_notes": [
    "Draft ini belum final karena dokumen transaksi pendukung belum lengkap.",
    "Tanggal terima SP2DK perlu dikonfirmasi untuk memastikan batas waktu tanggapan."
  ],
  "unsupported_claims": []
}
```

## Sample Coretax error extraction

```json
{
  "error_type": "efaktur_approval_error",
  "visible_error_message": "Daftar faktur dan SPT tidak sinkron",
  "module": "e-Faktur / SPT Masa PPN",
  "likely_causes": [
    "Faktur belum berhasil approval",
    "Masa pajak pada faktur berbeda dengan masa SPT",
    "Data pembeli atau NITKU tidak sesuai",
    "Daftar faktur belum tersinkronisasi"
  ],
  "checklist": [
    "Cek status approval faktur",
    "Cek masa pajak dan tanggal faktur",
    "Cek NPWP/NITKU pembeli",
    "Cek apakah faktur muncul di daftar faktur periode yang benar"
  ],
  "review_required": true,
  "source_refs": [
    { "document_id": "doc_002", "page_number": 1, "field": "visible_error_message" }
  ]
}
```

## Sample case event

```json
{
  "event_type": "case.status_changed",
  "from_status": "reviewer_reviewing",
  "to_status": "senior_qc",
  "actor_user_id": "user_reviewer_001",
  "payload": {
    "reason": "First-pass review completed",
    "reviewId": "review_001"
  }
}
```

## Sample deliverable Markdown outline

```markdown
# Response Pack — SP2DK

Case ID: {{case_id}}
Status review: Reviewed by {{reviewer_name_or_role}}

> Catatan: Dokumen ini disusun berdasarkan dokumen yang Anda berikan. Tidak ada jaminan hasil/penerimaan oleh KPP.

## 1. Ringkasan Eksekutif

...

## 2. Metadata SP2DK

| Field | Nilai | Sumber |
|---|---|---|
| Nomor Surat | ... | Dokumen 1 halaman 1 |

## 3. Isu yang Diminta Klarifikasi

...

## 4. Evidence Matrix

...

## 5. Draft Surat Tanggapan

...

## 6. Daftar Lampiran

...

## 7. Catatan Reviewer

...
```
