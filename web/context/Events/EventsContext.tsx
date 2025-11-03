import { createContext } from "react";

import { EventsContextType } from "./EventsContext.types";

export const EventsContext = createContext<EventsContextType | undefined>(
  undefined,
);
