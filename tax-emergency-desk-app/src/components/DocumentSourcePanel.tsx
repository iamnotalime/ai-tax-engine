import { StatusBadge } from './StatusBadge';

type SourcePage = {
  id: string;
  pageNumber: number;
  text: string | null;
  ocrConfidence: string | number | null;
};

type SourceDocument = {
  id: string;
  originalFilename: string;
  category: string;
  status: string;
  pages: SourcePage[];
};

function compactText(text: string | null) {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function confidenceText(value: string | number | null) {
  if (value === null || value === undefined) return 'OCR confidence unknown';
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 'OCR confidence unknown';
  return `${Math.round(numberValue * 100)}% OCR confidence`;
}

export function DocumentSourcePanel({ documents }: { documents: SourceDocument[] }) {
  return (
    <div className="card source-panel">
      <div className="panel-title">
        <div>
          <h3>Sources</h3>
          <p className="muted">Document text is grouped by file and page for reviewer scanning.</p>
        </div>
        <span className="kpi">{documents.length} files</span>
      </div>
      {!documents.length ? (
        <p className="muted">No source documents uploaded.</p>
      ) : (
        <div className="source-list">
          {documents.map((doc) => (
            <details className="source-card" key={doc.id}>
              <summary>
                <span>
                  <strong>{doc.originalFilename}</strong>
                  <small>{doc.category.replaceAll('_', ' ')}</small>
                </span>
                <StatusBadge status={doc.status} />
              </summary>
              <div className="source-pages">
                {doc.pages.length ? doc.pages.map((page) => {
                  const text = compactText(page.text);
                  return (
                    <section className="source-page" key={page.id}>
                      <div className="dense-row">
                        <strong>Page {page.pageNumber}</strong>
                        <span className="kpi">{confidenceText(page.ocrConfidence)}</span>
                      </div>
                      <p>{text || 'No extracted text for this page yet.'}</p>
                    </section>
                  );
                }) : <p className="muted">OCR/text extraction has not produced page text yet.</p>}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
