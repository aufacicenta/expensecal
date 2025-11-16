import { useContext } from "react";

import { CalendarV2Context } from "./CalendarV2Context";

export const useCalendarV2Context = () => {
  const context = useContext(CalendarV2Context);

  if (context === undefined) {
    throw new Error(
      "useCalendarV2Context must be used within a CalendarV2Context",
    );
  }

  return context;
};
