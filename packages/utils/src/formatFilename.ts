const cleanFilenamePart = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const formatFilename = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  // lastDot > 0 skips dotfiles like ".gitignore"; the upper bound skips trailing-dot files like "foo."
  const hasExtension = lastDot > 0 && lastDot < filename.length - 1;
  const basename = hasExtension ? filename.slice(0, lastDot) : filename;
  const extension = hasExtension ? filename.slice(lastDot + 1) : '';

  const timestamp = Date.now();
  const randomString = Math.random().toString(36).slice(2, 7);
  const stem = cleanFilenamePart(`${basename}-${timestamp}-${randomString}`);

  return extension ? `${stem}.${cleanFilenamePart(extension)}` : stem;
};
