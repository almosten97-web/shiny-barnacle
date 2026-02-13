import { format, isSameDay, parseISO } from 'date-fns';

export const getLocalTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';

export const toUtcISOString = (date: string, time: string) => {
  return new Date(`${date}T${time}:00`).toISOString();
};

export const formatLocalDateTimeWithZone = (iso: string) => {
  const parsed = parseISO(iso);
  return `${format(parsed, 'PPpp')} (${getLocalTimeZone()})`;
};

export const isSameLocalCalendarDay = (iso: string, referenceDate: Date) => {
  return isSameDay(parseISO(iso), referenceDate);
};
