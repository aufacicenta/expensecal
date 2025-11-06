import { createContext } from "react";

import { CalendarContextType } from "./CalendarContext.types";

export const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined,
);
