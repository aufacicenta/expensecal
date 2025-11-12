import { useContext } from "react";

import { EventCategoriesContext } from "./EventCategoriesContext";

export const useEventCategoriesContext = () => {
  const context = useContext(EventCategoriesContext);

  if (context === undefined) {
    throw new Error(
      "useEventCategoriesContext must be used within a EventCategoriesContext",
    );
  }

  return context;
};
