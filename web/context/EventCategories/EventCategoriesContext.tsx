import { createContext } from "react";

import { EventCategoriesContextType } from "./EventCategoriesContext.types";

export const EventCategoriesContext = createContext<
  EventCategoriesContextType | undefined
>(undefined);
