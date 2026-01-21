import { EventAttributes } from "@expensecal/database/models/Event";

export type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isCurrentDay: boolean;
  events: EventAttributes[];
};

export type MonthGridProps = {
  year: number;
  month: number;
  calendarData?: Record<string, EventAttributes[]>;
  selectedCategoryIds?: string[];
  className?: string;
};
