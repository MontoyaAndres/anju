const NUL = String.fromCharCode(0);

// Discord renders Markdown natively — **bold**, *italic*, __underline__,
// ~~strike~~, `code`, ```fenced``` blocks, > quotes, and # headings all work in
// message content as-is. The only awkward case is masked links: `[text](url)`
// is NOT rendered in normal message content (only inside embeds), so it would
// show up literally. Convert those to `text (url)` so the reply stays readable.
// Source links are delivered separately as link buttons, not inline.
export const markdownToDiscord = (markdown: string): string => {
  if (!markdown) return markdown;

  const fences: string[] = [];
  // Protect fenced code blocks from the masked-link rewrite below.
  let text = markdown.replace(/```[\s\S]*?```/g, match => {
    const idx = fences.length;
    fences.push(match);
    return `${NUL}F${idx}${NUL}`;
  });

  const codes: string[] = [];
  // Protect inline code spans too.
  text = text.replace(/`[^`\n]+`/g, match => {
    const idx = codes.length;
    codes.push(match);
    return `${NUL}C${idx}${NUL}`;
  });

  // [label](https://…) → label (https://…). Keep bare/auto links untouched.
  text = text.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    (_, label: string, url: string) => `${label} (${url})`
  );

  const restoreRe = new RegExp(`${NUL}([CF])(\\d+)${NUL}`, 'g');
  return text.replace(restoreRe, (_, kind: string, idx: string) =>
    kind === 'C' ? codes[Number(idx)] : fences[Number(idx)]
  );
};
