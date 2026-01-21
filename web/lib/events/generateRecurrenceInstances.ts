import { RRuleSet, rrulestr } from "rrule";

/**
 * Options for generating recurrence instances
 */
export interface GenerateRecurrenceInstancesOptions {
  /**
   * RFC 5545 RRULE string (e.g., "FREQ=MONTHLY;INTERVAL=1;COUNT=12")
   */
  rruleString: string;

  /**
   * Start date of the recurrence (the first event date)
   */
  startDate: Date;

  /**
   * Optional end date for the recurrence
   * If not specified, uses UNTIL or COUNT from RRULE
   */
  endDate?: Date;
}

/**
 * Represents a single recurrence instance
 */
export interface RecurrenceInstance {
  /**
   * The date of this instance (in UTC)
   */
  date: Date;

  /**
   * The instance number (0-indexed)
   */
  index: number;
}

/**
 * Generates recurrence instances from an RFC 5545 RRULE string
 *
 * @param options Configuration for generating instances
 * @returns Array of recurrence instances
 * @throws Error if RRULE string is invalid
 *
 * @example
 * const instances = generateRecurrenceInstances({
 *   rruleString: "FREQ=MONTHLY;INTERVAL=1;COUNT=12",
 *   startDate: new Date("2025-01-01T00:00:00Z"),
 * });
 * // Returns 12 instances, one for each month
 */
export function generateRecurrenceInstances(
  options: GenerateRecurrenceInstancesOptions,
): RecurrenceInstance[] {
  const { rruleString, startDate, endDate } = options;

  try {
    // Parse the RRULE string
    // The rrulestr function expects a string without "RRULE:" prefix
    const rruleInput = rruleString.startsWith("RRULE:")
      ? rruleString.slice(6)
      : rruleString;

    // Create RRuleSet for parsing
    const rruleSet = new RRuleSet();

    // Add the RRULE
    const rule = rrulestr(rruleInput, { dtstart: startDate });

    rruleSet.rrule(rule);

    // Determine the end date for generating instances
    let maxDate = endDate;

    // If no endDate provided, try to extract from RRULE
    if (!maxDate) {
      // Check if RRULE has UNTIL clause
      const untilMatch = rruleInput.match(/UNTIL=(\d{8}T\d{6}Z?|\d{8})/);

      if (untilMatch) {
        maxDate = new Date(untilMatch[1]);
      } else {
        // Default to using COUNT if no UNTIL specified
        const hasCount = /COUNT=\d+/.test(rruleInput);

        if (!hasCount) {
          // Will default to 12 instances below
          maxDate = undefined;
        }
      }
    }

    // Get all occurrences
    let dates: Date[] = [];

    if (maxDate) {
      dates = rruleSet.between(
        startDate,
        maxDate,
        false, // Exclude boundaries; let RRULE determine occurrences
      );
    } else {
      // If still no maxDate, use COUNT from RRULE
      const countMatch = rruleInput.match(/COUNT=(\d+)/);
      const count = countMatch ? parseInt(countMatch[1], 10) : 12; // Default to 12

      // Get count+1 instances to account for the start date being included
      dates = rruleSet.all((date, i) => i < count + 1);
      // Remove duplicate if first date matches start date exactly
      if (dates.length > 0 && dates[0].getTime() === startDate.getTime()) {
        dates = dates.slice(1);
      }
      // Ensure we don't exceed the requested count
      dates = dates.slice(0, count);
    }

    // Convert to RecurrenceInstance format
    return dates.map((date, index) => ({
      date: new Date(date), // Ensure Date object
      index,
    }));
  } catch (error) {
    throw new Error(
      `Invalid RRULE string: ${rruleString}. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Validates an RFC 5545 RRULE string without generating instances
 *
 * @param rruleString The RRULE string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * const isValid = isValidRRule("FREQ=MONTHLY;INTERVAL=1;COUNT=12");
 */
export function isValidRRule(rruleString: string): boolean {
  try {
    const rruleInput = rruleString.startsWith("RRULE:")
      ? rruleString.slice(6)
      : rruleString;

    // Try to parse it
    rrulestr(rruleInput, { dtstart: new Date() });

    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the total count of recurrence instances from an RRULE
 *
 * @param rruleString The RRULE string
 * @param startDate The start date
 * @returns Total count of instances, or null if infinite recurrence
 *
 * @example
 * const count = getRecurrenceCount("FREQ=MONTHLY;INTERVAL=1;COUNT=12", new Date());
 * // Returns 12
 */
export function getRecurrenceCount(
  rruleString: string,
  startDate: Date,
): number | null {
  try {
    const rruleInput = rruleString.startsWith("RRULE:")
      ? rruleString.slice(6)
      : rruleString;

    // Check for COUNT parameter
    const countMatch = rruleInput.match(/COUNT=(\d+)/);

    if (countMatch) {
      return parseInt(countMatch[1], 10);
    }

    // Check for UNTIL parameter - count instances up to that date
    const untilMatch = rruleInput.match(/UNTIL=(\d{8}T\d{6}Z?|\d{8})/);

    if (untilMatch) {
      const until = new Date(untilMatch[1]);
      const instances = generateRecurrenceInstances({
        rruleString,
        startDate,
        endDate: until,
      });

      return instances.length;
    }

    // If neither COUNT nor UNTIL, it's infinite
    return null;
  } catch {
    return null;
  }
}
