/**
 * Centralized date formatting utilities for the expense calendar application.
 * All functions work with UTC dates to maintain consistency across timezones.
 */

/**
 * Convert a Date to YYYY-MM-DD format (UTC)
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 * @example toDateString(new Date("2026-01-06T00:00:00Z")) => "2026-01-06"
 */
export const toDateString = (date: Date | string): string => {
  const d = new Date(date);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

/**
 * Convert a Date to YYYY-MM format (UTC)
 * @param date - The date to format
 * @returns Month string in YYYY-MM format
 * @example toMonthString(new Date("2026-01-15T00:00:00Z")) => "2026-01"
 */
export const toMonthString = (date: Date | string): string => {
  const d = new Date(date);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${year}-${month}`;
};

/**
 * Format a date for display in US locale (UTC timezone)
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * @example formatDateForDisplay(new Date("2026-01-06T00:00:00Z")) => "Jan 6, 2026"
 */
export const formatDateForDisplay = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  });
};

/**
 * Format a date for short display (UTC timezone)
 * @param date - The date to format
 * @returns Formatted short date string
 * @example formatDateShort(new Date("2026-01-06T00:00:00Z")) => "Jan 6"
 */
export const formatDateShort = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Get the start of a day (midnight UTC)
 * @param date - The date
 * @returns New Date set to midnight UTC
 * @example startOfDay(new Date("2026-01-06T15:30:45Z")) => 2026-01-06T00:00:00Z
 */
export const startOfDay = (date: Date | string): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of a day (23:59:59.999 UTC)
 * @param date - The date
 * @returns New Date set to end of day UTC
 */
export const endOfDay = (date: Date | string): Date => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * Get the start of a month (first day at midnight UTC)
 * @param date - Any date in the month
 * @returns New Date set to first day of month at midnight UTC
 * @example startOfMonth(new Date("2026-01-15T00:00:00Z")) => 2026-01-01T00:00:00Z
 */
export const startOfMonth = (date: Date | string): Date => {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of a month (last day at 23:59:59.999 UTC)
 * @param date - Any date in the month
 * @returns New Date set to last day of month
 */
export const endOfMonth = (date: Date | string): Date => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * Parse a month string (YYYY-MM or YYYYMM) and return start of month
 * @param monthStr - Month string in YYYY-MM or YYYYMM format
 * @returns Date object set to start of the month
 * @throws Error if format is invalid
 * @example parseMonthString("2026-01") => 2026-01-01T00:00:00Z
 */
export const parseMonthString = (monthStr: string): Date => {
  let year: number;
  let month: number;

  if (monthStr.includes("-")) {
    // YYYY-MM format
    const [yearStr, monthStr_] = monthStr.split("-");
    year = parseInt(yearStr, 10);
    month = parseInt(monthStr_, 10);
  } else if (monthStr.length === 6) {
    // YYYYMM format
    year = parseInt(monthStr.slice(0, 4), 10);
    month = parseInt(monthStr.slice(4, 6), 10);
  } else {
    throw new Error(
      `Invalid month string format: ${monthStr}. Expected YYYY-MM or YYYYMM`,
    );
  }

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month string: ${monthStr}`);
  }

  const date = new Date(Date.UTC(year, month - 1, 1));
  return date;
};

/**
 * Parse an ISO date string (YYYY-MM-DD) to Date object
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at midnight UTC
 * @throws Error if format is invalid
 * @example parseDateString("2026-01-06") => 2026-01-06T00:00:00Z
 */
export const parseDateString = (dateStr: string): Date => {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date;
};

/**
 * Get ISO 8601 week number (1-53) for a date (UTC)
 * @param date - The date
 * @returns ISO week number (1-53)
 * @example getWeekNumber(new Date("2026-01-06T00:00:00Z")) => 2
 */
export const getWeekNumber = (date: Date | string): number => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return weekNum;
};

/**
 * Get the date of the start of the ISO week (Monday) for a given date
 * @param date - The date
 * @returns Date set to Monday of that week at midnight UTC
 */
export const getWeekStart = (date: Date | string): Date => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const weekStart = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff),
  );
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Get the date of the end of the ISO week (Sunday) for a given date
 * @param date - The date
 * @returns Date set to Sunday of that week at 23:59:59.999 UTC
 */
export const getWeekEnd = (date: Date | string): Date => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * Add days to a date (UTC-safe)
 * @param date - The base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export const addDays = (date: Date | string, days: number): Date => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

/**
 * Add months to a date (UTC-safe)
 * @param date - The base date
 * @param months - Number of months to add (can be negative)
 * @returns New date with months added
 */
export const addMonths = (date: Date | string, months: number): Date => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

/**
 * Check if two dates are the same day (UTC)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are the same day
 */
export const isSameDay = (
  date1: Date | string,
  date2: Date | string,
): boolean => {
  return toDateString(date1) === toDateString(date2);
};

/**
 * Check if two dates are in the same month (UTC)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are in the same month
 */
export const isSameMonth = (
  date1: Date | string,
  date2: Date | string,
): boolean => {
  return toMonthString(date1) === toMonthString(date2);
};

/**
 * Get the difference in days between two dates (UTC)
 * @param date1 - Start date
 * @param date2 - End date
 * @returns Number of days between the dates (can be negative)
 */
export const getDaysDifference = (
  date1: Date | string,
  date2: Date | string,
): number => {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get the number of days in a month
 * @param date - Any date in the month
 * @returns Number of days in that month
 */
export const getDaysInMonth = (date: Date | string): number => {
  const d = new Date(date);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
};

/**
 * Format a month string (YYYY-MM) to short month name (UTC timezone)
 * @param monthStr - Month string in YYYY-MM format
 * @returns Short month name (e.g., "Jan")
 * @example formatMonthShort("2026-01") => "Jan"
 */
export const formatMonthShort = (monthStr: string): string => {
  const date = parseMonthString(monthStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
};

/**
 * Format a date to short day of week name (e.g., "Mon", "Tue", "Wed")
 * @param date - Date or date string (day number will be converted to date in current month context)
 * @returns Formatted day of week string (e.g., "Mon")
 * @example formatDayShort(new Date("2026-01-06T00:00:00Z")) => "Tue"
 * @example formatDayShort("2026-01-06") => "Tue"
 */
export const formatDayShort = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
};
