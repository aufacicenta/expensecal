"use client";

import { useState } from "react";

import { ExampleContext } from "./ExampleContext";
import {
  ExampleContextControllerProps,
  ExampleContextType,
} from "./ExampleContext.types";

export const ExampleContextController = ({
  children,
}: ExampleContextControllerProps) => {
  const [state, setState] = useState(undefined);

  const props: ExampleContextType = {};

  return (
    <ExampleContext.Provider value={props}>{children}</ExampleContext.Provider>
  );
};
