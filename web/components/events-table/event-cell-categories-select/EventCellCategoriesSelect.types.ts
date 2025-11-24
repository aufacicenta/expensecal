import { ReactNode } from "react";

import { CategoryData } from "@/app/api/v1/categories/types";
import { CalendarEvent } from "@/app/api/v2/calendar/types";

export type EventCellCategoriesSelectProps = {
  event: CalendarEvent;
  availableCategories: CategoryData[];
  onUpdate: (eventId: string, categoryIds: string[]) => Promise<void>;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
};
