import { createContext } from "react";

import { CalendarV2ContextType } from "./CalendarV2Context.types";

export const CalendarV2Context = createContext<CalendarV2ContextType | undefined>(undefined);
