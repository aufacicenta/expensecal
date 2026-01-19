import { useContext } from "react";

import { FilteringContext } from "./FilteringContext";

export const useFilteringContext = () => {
  const context = useContext(FilteringContext);

  if (!context) {
    throw new Error(
      "useFilteringContext must be used within a FilteringContextController",
    );
  }

  return context;
};
