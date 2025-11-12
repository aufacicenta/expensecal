import { ReactNode } from "react";

export type FilteringContextControllerProps = {
  children: ReactNode;
};

export type FilteringContextType = {
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  readInitialFilterFromUrl: () => void;
  syncFilterToUrl: (ids: string[]) => void;
};
