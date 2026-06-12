import { statusLabel } from './StatusBadge';

type AiTraceOutput = {
  id: string;
  outputType: string;
  outputJson: unknown;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function listStrings(value: unknown) {
  return asArray(value).map((item) => stringValue(item)).filter((item) => item !== '-');
}

function confidenceLabel(value: unknown) {
  return typeof value === 'number' ? `${Math.round(value * 100)}% confidence` : null;
}

function sourceCount(value: unknown) {
  return asArray(value).length;
}

function KeyValueGrid({ items }: { items: Array<[string, unknown]> }) {
  const visible = items.filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!visible.length) return null;
  return (
    <dl className="kv-grid">
      {visible.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{stringValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="trace-section">
      <h4>{title}</h4>
      <ul className="clean-list">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function ClassificationView({ data }: { data: JsonRecord }) {
  return (
    <>
      <KeyValueGrid items={[
        ['Category', data.category],
        ['Confidence', confidenceLabel(data.confidence)],
        ['Sources', sourceCount(data.source_refs)]
      ]} />
      {data.summary && <p className="trace-summary">{stringValue(data.summary)}</p>}
      <BulletList title="Missing information" items={listStrings(data.missing_information)} />
    </>
  );
}

function Sp2dkView({ data }: { data: JsonRecord }) {
  const letter = asRecord(data.letter);
  const issues = asArray(data.issues).map(asRecord);
  return (
    <>
      <KeyValueGrid items={[
        ['Letter number', letter.letter_number],
        ['Letter date', letter.letter_date],
        ['Received date', letter.received_date],
        ['Deadline', letter.deadline_date],
        ['KPP', letter.kpp_name],
        ['Taxpayer', letter.taxpayer_name]
      ]} />
      {letter.deadline_basis && <p className="trace-summary">{stringValue(letter.deadline_basis)}</p>}
      {!!issues.length && (
        <div className="trace-section">
          <h4>Detected issues</h4>
          <div className="trace-list">
            {issues.map((issue, index) => (
              <div className="trace-item" key={`${stringValue(issue.issue_code)}-${index}`}>
                <div className="dense-row">
                  <strong>{stringValue(issue.title)}</strong>
                  <span className="kpi">{stringValue(issue.severity)}</span>
                </div>
                <p className="muted">{stringValue(issue.description)}</p>
                <KeyValueGrid items={[
                  ['Tax type', issue.tax_type],
                  ['Period', issue.period],
                  ['Amount', issue.amount_visible],
                  ['Confidence', confidenceLabel(issue.confidence)]
                ]} />
              </div>
            ))}
          </div>
        </div>
      )}
      <BulletList title="Requested documents" items={listStrings(data.requested_documents)} />
      <BulletList title="Missing information" items={listStrings(data.missing_information)} />
    </>
  );
}

function CoretaxView({ data }: { data: JsonRecord }) {
  return (
    <>
      <KeyValueGrid items={[
        ['Error type', data.error_type],
        ['Module', data.module],
        ['Review required', data.review_required]
      ]} />
      {data.visible_error_message && <p className="trace-summary">{stringValue(data.visible_error_message)}</p>}
      <BulletList title="Likely causes" items={listStrings(data.likely_causes)} />
      <BulletList title="Fix checklist" items={listStrings(data.checklist)} />
    </>
  );
}

function EvidenceView({ data }: { data: JsonRecord }) {
  const items = asArray(data.items).map(asRecord);
  return (
    <>
      <KeyValueGrid items={[
        ['Overall completeness', data.overall_completeness],
        ['Checklist items', items.length]
      ]} />
      <div className="trace-list">
        {items.slice(0, 8).map((item, index) => (
          <div className="trace-item" key={`${stringValue(item.label)}-${index}`}>
            <div className="dense-row">
              <strong>{stringValue(item.label)}</strong>
              <span className="status neutral">{statusLabel(stringValue(item.status))}</span>
            </div>
            <p className="muted">{stringValue(item.description)}</p>
            <p className="trace-summary">{stringValue(item.reason)}</p>
          </div>
        ))}
      </div>
      <BulletList title="Notes" items={listStrings(data.notes)} />
    </>
  );
}

function DraftView({ data }: { data: JsonRecord }) {
  const sections = asArray(data.sections).map(asRecord);
  return (
    <>
      <KeyValueGrid items={[
        ['Title', data.title],
        ['Recipient', data.recipient],
        ['Review required', data.review_required],
        ['Sections', sections.length]
      ]} />
      <div className="trace-list">
        {sections.slice(0, 5).map((section, index) => (
          <div className="trace-item" key={`${stringValue(section.heading)}-${index}`}>
            <strong>{stringValue(section.heading)}</strong>
            <p className="muted">{stringValue(section.body)}</p>
          </div>
        ))}
      </div>
      <BulletList title="Attachments" items={listStrings(data.attachments)} />
      <BulletList title="Risk notes" items={listStrings(data.risk_notes)} />
      <BulletList title="Unsupported claims" items={listStrings(data.unsupported_claims)} />
    </>
  );
}

function SupportCheckView({ data }: { data: JsonRecord }) {
  return (
    <>
      <KeyValueGrid items={[
        ['Supported by sources', data.supported],
        ['Unsupported claims', asArray(data.unsupported_claims).length],
        ['Risky phrases', asArray(data.risky_language).length]
      ]} />
      <BulletList title="Unsupported claims" items={listStrings(data.unsupported_claims)} />
      <BulletList title="Risky language" items={listStrings(data.risky_language)} />
      <BulletList title="Suggested edits" items={listStrings(data.suggested_edits)} />
    </>
  );
}

function TraceBody({ output }: { output: AiTraceOutput }) {
  const data = asRecord(output.outputJson);
  if (output.outputType === 'document_classification') return <ClassificationView data={data} />;
  if (output.outputType === 'sp2dk_extraction') return <Sp2dkView data={data} />;
  if (output.outputType === 'coretax_error_extraction') return <CoretaxView data={data} />;
  if (output.outputType === 'evidence_checklist') return <EvidenceView data={data} />;
  if (output.outputType === 'draft_response_letter') return <DraftView data={data} />;
  if (output.outputType === 'hallucination_check') return <SupportCheckView data={data} />;
  return <p className="trace-summary">Structured result captured. Open the technical JSON only if you need audit-level detail.</p>;
}

export function AiTracePanel({ outputs, title = 'AI analysis' }: { outputs: AiTraceOutput[]; title?: string }) {
  return (
    <div className="card ai-panel">
      <div className="panel-title">
        <div>
          <h3>{title}</h3>
          <p className="muted">Readable summaries first. Full JSON remains available for audit traceability.</p>
        </div>
        <span className="kpi">{outputs.length} records</span>
      </div>
      {!outputs.length ? (
        <p className="muted">No AI records yet.</p>
      ) : (
        <div className="ai-records">
          {outputs.map((output) => (
            <section className="ai-record" key={output.id}>
              <div className="dense-row">
                <h4>{statusLabel(output.outputType)}</h4>
                <span className="kpi">{output.id.slice(0, 8)}</span>
              </div>
              <TraceBody output={output} />
              <details className="technical-details">
                <summary>Technical JSON</summary>
                <pre className="json-trace">{JSON.stringify(output.outputJson, null, 2)}</pre>
              </details>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
