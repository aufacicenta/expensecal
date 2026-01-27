import { useContext } from "react";

import { EventGroupsContext } from "./EventGroupsContext";

export const useEventGroupsContext = () => {
  const context = useContext(EventGroupsContext);

  if (context === undefined) {
    throw new Error(
      "useEventGroupsContext must be used within EventGroupsContext",
    );
  }

  return context;
};
