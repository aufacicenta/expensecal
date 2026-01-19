import { createContext } from "react";

import { FilteringContextType } from "./FilteringContextController.types";

const defaultValue: FilteringContextType = {
  selectedCategoryIds: [],
  setSelectedCategoryIds: () => {},
  readInitialFilterFromUrl: () => {},
  syncFilterToUrl: () => {},
};

export const FilteringContext =
  createContext<FilteringContextType>(defaultValue);
