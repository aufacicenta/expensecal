import { StatsCellVariant } from "./StatsCell.types";

import { GetCalendarV2SuccessResponse } from "@/app/api/v2/calendar/types";

export type StatsDetailsType = "income" | "expense";

export type StatsDetailsPeriod = {
  year: string;
  month?: string;
  day?: string;
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: string;
  eventCount: number;
  events: Array<{
    id: string;
    description: string;
    amount: string;
    date: Date;
  }>;
};

export type StatsDetailsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  calendarV2Data: GetCalendarV2SuccessResponse["data"];
  variant: StatsCellVariant;
  period: StatsDetailsPeriod;
  type: StatsDetailsType;
};
