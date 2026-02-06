"use client";

import { useContext } from "react";

import { UserPreferencesContext } from "./UserPreferencesContext";

export const useUserPreferencesContext = () => {
  const context = useContext(UserPreferencesContext);

  if (context === undefined) {
    throw new Error(
      "useUserPreferencesContext must be used within a UserPreferencesContext",
    );
  }

  return context;
};
