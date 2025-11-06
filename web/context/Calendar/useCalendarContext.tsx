import { useContext } from "react";

import { CalendarContext } from "./CalendarContext";

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);

  if (context === undefined) {
    throw new Error("useCalendarContext must be used within a CalendarContext");
  }

  return context;
};
