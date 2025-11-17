import { GetCalendarV2SuccessResponse } from "@/app/api/v2/calendar/types";

export interface AvailableMonth {
  date: Date;
  year: string;
  month: string;
  label: string;
}

/**
 * Extract all available months from CalendarData and return them sorted
 * @param calendarData - The calendar data structure
 * @returns Array of available months sorted chronologically
 */
export const extractAvailableMonths = (
  calendarData: GetCalendarV2SuccessResponse["data"] | undefined,
): AvailableMonth[] => {
  if (!calendarData) {
    return [];
  }

  const months: AvailableMonth[] = [];
  const monthSet = new Set<string>();

  // Iterate through years
  for (const yearStr in calendarData) {
    const yearData = calendarData.calendar[yearStr];
    // Iterate through months
    for (const monthStr in yearData) {
      const key = `${yearStr}-${monthStr}`;
      if (!monthSet.has(key)) {
        monthSet.add(key);
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        // Create a Date object for this month (first day)
        const date = new Date(Date.UTC(year, month - 1, 1));

        // Create display label
        const label = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });

        months.push({
          date,
          year: yearStr,
          month: monthStr,
          label,
        });
      }
    }
  }

  // Sort chronologically
  months.sort((a, b) => a.date.getTime() - b.date.getTime());

  return months;
};

/**
 * Find the index of a month in the available months array
 * @param currentMonth - The month to find
 * @param availableMonths - Array of available months
 * @returns Index of the month, or -1 if not found
 */
export const findMonthIndex = (
  currentMonth: Date,
  availableMonths: AvailableMonth[],
): number => {
  const year = currentMonth.getUTCFullYear().toString();
  const month = String(currentMonth.getUTCMonth() + 1).padStart(2, "0");

  return availableMonths.findIndex((m) => m.year === year && m.month === month);
};
