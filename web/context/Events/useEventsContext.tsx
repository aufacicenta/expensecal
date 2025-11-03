import { useContext } from "react";

import { EventsContext } from "./EventsContext";

export const useEventsContext = () => {
  const context = useContext(EventsContext);

  if (context === undefined) {
    throw new Error("useEventsContext must be used within a EventsContext");
  }

  return context;
};
