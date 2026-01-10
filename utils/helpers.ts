
import { format, parse, startOfWeek, endOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';

export const getWeekDates = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const calculateShiftHours = (start: string, end: string): number => {
  const startTime = parse(start, 'HH:mm', new Date());
  const endTime = parse(end, 'HH:mm', new Date());
  let diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (diff < 0) diff += 24; // Handle overnight shifts if needed
  return diff;
};

export const isOverlapping = (s1Start: string, s1End: string, s2Start: string, s2End: string): boolean => {
  const t1s = parse(s1Start, 'HH:mm', new Date()).getTime();
  const t1e = parse(s1End, 'HH:mm', new Date()).getTime();
  const t2s = parse(s2Start, 'HH:mm', new Date()).getTime();
  const t2e = parse(s2End, 'HH:mm', new Date()).getTime();
  return t1s < t2e && t2s < t1e;
};

export const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
}
