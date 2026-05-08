export const extractToolText = (result: unknown): string => {
  const content = (result as { content?: unknown })?.content;
  if (!Array.isArray(content)) return JSON.stringify(result);
  const texts = content
    .filter(
      (c): c is { type: 'text'; text: string } =>
        c?.type === 'text' && typeof c?.text === 'string'
    )
    .map(c => c.text);
  return texts.join('\n') || JSON.stringify(result);
};
