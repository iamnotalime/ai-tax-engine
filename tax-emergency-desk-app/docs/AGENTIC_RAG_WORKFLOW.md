# Agentic RAG Workflow

The workflow is implemented in `src/server/ai/workflow.ts` and is intentionally deterministic at the orchestration layer. LLM calls are leaf nodes executed through Vercel AI SDK v5; state transitions, persistence, guardrails, and review gates are handled by application code.

## Nodes

1. `DocumentTextExtraction`
   - Stores text in `document_pages`.
   - PDFs/images route to OCR provider abstraction; mock/dev marks OCR required.

2. `DocumentClassificationAgent`
   - Prompt version: `prompt.document_classification.v1`.
   - Output: `document_classification` AI output + `document_extractions`.

3. `CaseExtractionAgent`
   - SP2DK: `prompt.sp2dk_extraction.v1`.
   - Coretax/e-Faktur: `prompt.coretax_error.v1`.
   - Output feeds `tax_issues` when relevant.

4. `KnowledgeRetriever`
   - Retrieves from `knowledge_chunks` with embeddings when production provider is enabled.
   - Falls back to deterministic seeded snippets in mock mode.

5. `EvidenceChecklistAgent`
   - Prompt version: `prompt.evidence_checklist.v1`.
   - Converts issues and available docs into reviewer-actionable evidence items.

6. `DraftResponseAgent`
   - Prompt version: `prompt.draft_response.v1`.
   - Generates draft only; never final advice.

7. `SupportCheckAgent`
   - Prompt version: `prompt.support_check.v1`.
   - Identifies unsupported claims and guarantee language before human review.

8. `ReviewerWorkbench`
   - Tax associate handles first pass.
   - Licensed consultant/admin handles senior QC approval.

9. `DeliverableVersioner`
   - Stores markdown deliverable versions.
   - Final approval remains audited.

## Persistence and observability

- Every LLM call creates an `ai_runs` row with provider/model/prompt version/status/latency.
- Every structured result creates an `ai_outputs` row.
- Case state changes emit `case_events`.
- Reviewer decisions are stored in `reviews`.
- Final user outcomes are stored in `case_outcomes` for future template/playbook learning.

## AI SDK v5 provider layer

The production provider is `src/server/ai/providers/openai.ts`. It uses:

- `generateObject` from `ai` for schema-validated structured outputs.
- `openai()` from `@ai-sdk/openai` for language models.
- `embedMany` from `ai` plus `openai.textEmbedding()` for RAG embeddings.
- `providerOptions.openai.store = false` so provider-side storage is disabled where supported.

The app keeps the `LlmProvider` interface so tests/local development can use `MockLlmProvider` without network access.

## Why this is agentic but controlled

The system decomposes a tax case into specialized agents and uses RAG before generation. However, agents do not autonomously mutate final business state without application gates. All material outputs are schema-validated, source-referenced, support-checked, and human-reviewed where required.
