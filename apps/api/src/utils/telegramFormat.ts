const NUL = String.fromCharCode(0);

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const processInline = (text: string): string => {
  let r = escapeHtml(text);

  r = r.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
  r = r.replace(/__([^_\n]+?)__/g, '<b>$1</b>');

  r = r.replace(/(^|[^*\w])\*([^*\n]+?)\*(?=[^*\w]|$)/g, '$1<i>$2</i>');
  r = r.replace(/(^|[^_\w])_([^_\n]+?)_(?=[^_\w]|$)/g, '$1<i>$2</i>');

  r = r.replace(/~~([^~\n]+?)~~/g, '<s>$1</s>');

  r = r.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

  return r;
};

export const markdownToTelegramHtml = (markdown: string): string => {
  const fences: string[] = [];
  let text = markdown.replace(
    /```([\w+-]*)\n?([\s\S]*?)```/g,
    (_, lang: string, code: string) => {
      const idx = fences.length;
      const escaped = escapeHtml(code.replace(/\n$/, ''));
      const html = lang
        ? `<pre><code class="language-${escapeHtml(lang)}">${escaped}</code></pre>`
        : `<pre>${escaped}</pre>`;
      fences.push(html);
      return `${NUL}F${idx}${NUL}`;
    }
  );

  const codes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    const idx = codes.length;
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `${NUL}C${idx}${NUL}`;
  });

  const lines = text.split('\n');
  const processed = lines.map(line => {
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) return `<b>${processInline(heading[2])}</b>`;

    const quote = line.match(/^\s{0,3}>\s?(.*)$/);
    if (quote) return `<blockquote>${processInline(quote[1])}</blockquote>`;

    const list = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/);
    if (list) return `${list[1]}• ${processInline(list[2])}`;

    if (/^\s*[-=*_]{3,}\s*$/.test(line)) return '———';

    return processInline(line);
  });

  let result = processed.join('\n');

  const restoreRe = new RegExp(`${NUL}([CF])(\\d+)${NUL}`, 'g');
  result = result.replace(restoreRe, (_, kind: string, idx: string) =>
    kind === 'C' ? codes[Number(idx)] : fences[Number(idx)]
  );

  return result;
};
