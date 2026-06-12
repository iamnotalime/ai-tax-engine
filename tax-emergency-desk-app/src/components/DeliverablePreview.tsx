type Segment =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; text: string };

function parseMarkdownLite(markdown: string): Segment[] {
  const lines = markdown.split(/\r?\n/);
  const segments: Segment[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    segments.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    segments.push({ type: 'list', items: list });
    list = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        segments.push({ type: 'code', text: code.join('\n') });
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      segments.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph();
      flushList();
      segments.push({ type: 'quote', text: line.replace(/^>\s?/, '') });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (code.length) segments.push({ type: 'code', text: code.join('\n') });
  return segments;
}

export function DeliverablePreview({ contentMarkdown, title = 'Draft deliverable' }: { contentMarkdown: string; title?: string }) {
  const segments = parseMarkdownLite(contentMarkdown);
  return (
    <div className="card deliverable-card">
      <div className="panel-title">
        <div>
          <h3>{title}</h3>
          <p className="muted">Formatted for review. Structured JSON blocks are collapsed below each section.</p>
        </div>
        <span className="kpi">latest version</span>
      </div>
      <article className="deliverable-preview">
        {segments.map((segment, index) => {
          if (segment.type === 'heading') {
            const Tag = segment.level === 1 ? 'h2' : 'h3';
            return <Tag key={`${segment.text}-${index}`}>{segment.text}</Tag>;
          }
          if (segment.type === 'quote') return <blockquote key={`${segment.text}-${index}`}>{segment.text}</blockquote>;
          if (segment.type === 'list') {
            return (
              <ul className="clean-list" key={`list-${index}`}>
                {segment.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            );
          }
          if (segment.type === 'code') {
            return (
              <details className="technical-details" key={`code-${index}`}>
                <summary>Structured data block</summary>
                <pre className="json-trace">{segment.text}</pre>
              </details>
            );
          }
          return <p key={`${segment.text}-${index}`}>{segment.text}</p>;
        })}
      </article>
    </div>
  );
}
