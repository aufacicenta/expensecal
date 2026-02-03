import { useContext } from "react";

import { InventoryContext } from "./InventoryContext";

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);

  if (context === undefined) {
    throw new Error(
      "useInventoryContext must be used within InventoryContextController",
    );
  }

  return context;
};
