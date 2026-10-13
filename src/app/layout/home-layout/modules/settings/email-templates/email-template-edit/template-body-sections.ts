export interface TemplateBodySection {
  kind: 'content' | 'dynamic';
  value: string;
  initialValue: string;
  label: string;
  editorValue?: string;
}
// Keep partials and entire conditional/iteration blocks outside the rich editor.
// Concatenating sections without edits reproduces the exact original source.
export function templateBodySections(source: string): TemplateBodySection[] {
  const sections: TemplateBodySection[] = [];
  const tokens = /{{{?[\s\S]*?}}}?/g;
  let cursor = 0;
  let blockStart = -1;
  let depth = 0;
  let match: RegExpExecArray | null;
  const push = (kind: 'content' | 'dynamic', start: number, end: number, label = '') => {
    if (end > start) sections.push({ kind, value: source.slice(start, end), initialValue: source.slice(start, end), label });
  };
  while ((match = tokens.exec(source))) {
    const token = match[0];
    if (/^{{\s*#/.test(token)) {
      if (!depth) { push('content', cursor, match.index); blockStart = match.index; }
      depth++;
    } else if (/^{{\s*\//.test(token) && depth) {
      if (!--depth) { push('dynamic', blockStart, tokens.lastIndex, 'Conditional content'); cursor = tokens.lastIndex; }
    } else if (!depth && /^{{\s*>/.test(token)) {
      push('content', cursor, match.index);
      const name = token.match(/^{{\s*>\s*([\w]+)/)?.[1] || 'Dynamic content';
      const labels: Record<string, string> = { ctaButton: 'Action button', orderSummaryCard: 'Order details', addressBlock: 'Address', cartItemsCard: 'Cart items', statusBadge: 'Status badge', infoBox: 'Information panel', otpCodeBlock: 'Verification code' };
      push('dynamic', match.index, tokens.lastIndex, labels[name] || name);
      cursor = tokens.lastIndex;
    }
  }
  if (depth) { push('dynamic', blockStart, source.length, 'Dynamic content'); cursor = source.length; }
  push('content', cursor, source.length);
  return sections;
}
