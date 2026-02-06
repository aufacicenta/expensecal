import { createContext } from "react";

import { InventoryContextType } from "./InventoryContext.types";

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined,
);
