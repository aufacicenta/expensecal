import { createContext } from "react";

import { EventGroupsContextType } from "./EventGroupsContext.types";

export const EventGroupsContext = createContext<
  EventGroupsContextType | undefined
>(undefined);
