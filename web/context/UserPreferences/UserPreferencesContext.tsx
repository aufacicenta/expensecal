"use client";

import { createContext } from "react";

import { UserPreferencesContextType } from "./UserPreferencesContext.types";

export const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);
