import { createContext } from "react";

import { ExampleContextType } from "./ExampleContext.types";

export const ExampleContext = createContext<ExampleContextType | undefined>(
  undefined,
);
