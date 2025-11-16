import { EventAttributes } from "@expensecal/database/models/Event";

export type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  events: EventAttributes[];
};

export type MonthGridProps = {
  year: number;
  month: number;
  calendarData?: Record<string, EventAttributes[]>;
  className?: string;
};
