import { useContext } from "react";

import { ExampleContext } from "./ExampleContext";

export const useExampleContext = () => {
  const context = useContext(ExampleContext);

  if (context === undefined) {
    throw new Error("useExampleContext must be used within a ExampleContext");
  }

  return context;
};
