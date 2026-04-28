import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatRelative = (
  value: string | number | Date | null | undefined,
  fallback = 'Never'
): string => {
  if (!value) return fallback;
  const d = dayjs(value);
  if (!d.isValid()) return fallback;
  return d.fromNow();
};
