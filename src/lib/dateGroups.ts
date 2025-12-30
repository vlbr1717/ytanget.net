import { isToday, isYesterday, isWithinInterval, subDays, format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

export interface DateGroup {
  label: string;
  conversations: any[];
}

export function groupConversationsByDate(conversations: any[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = subDays(today, 1);
  const last7DaysStart = subDays(today, 7);
  const last30DaysStart = subDays(today, 30);

  const groups: { [key: string]: any[] } = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Last 30 Days': [],
  };

  // Track month groups dynamically
  const monthGroups: { [key: string]: any[] } = {};

  conversations.forEach(conv => {
    const date = new Date(conv.updated_at);

    if (isToday(date)) {
      groups['Today'].push(conv);
    } else if (isYesterday(date)) {
      groups['Yesterday'].push(conv);
    } else if (isWithinInterval(date, { start: last7DaysStart, end: yesterday })) {
      groups['Last 7 Days'].push(conv);
    } else if (isWithinInterval(date, { start: last30DaysStart, end: last7DaysStart })) {
      groups['Last 30 Days'].push(conv);
    } else {
      // Group by month
      const monthKey = format(date, 'MMMM yyyy');
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(conv);
    }
  });

  // Build result array with non-empty groups
  const result: DateGroup[] = [];

  if (groups['Today'].length > 0) {
    result.push({ label: 'Today', conversations: groups['Today'] });
  }
  if (groups['Yesterday'].length > 0) {
    result.push({ label: 'Yesterday', conversations: groups['Yesterday'] });
  }
  if (groups['Last 7 Days'].length > 0) {
    result.push({ label: 'Last 7 Days', conversations: groups['Last 7 Days'] });
  }
  if (groups['Last 30 Days'].length > 0) {
    result.push({ label: 'Last 30 Days', conversations: groups['Last 30 Days'] });
  }

  // Sort month groups by date (most recent first)
  const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  sortedMonths.forEach(month => {
    result.push({ label: month, conversations: monthGroups[month] });
  });

  return result;
}
