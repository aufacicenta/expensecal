import { useState } from "react";

import { CalendarContext } from "./CalendarContext";
import {
  CalendarContextControllerProps,
  CalendarContextType,
} from "./CalendarContext.types";

export const CalendarContextController = ({
  children,
}: CalendarContextControllerProps) => {
  const [state, setState] = useState(undefined);

  const props: CalendarContextType = {};

  return (
    <CalendarContext.Provider value={props}>
      {children}
    </CalendarContext.Provider>
  );
};
