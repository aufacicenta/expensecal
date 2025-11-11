"use client";

import { DayModalContextType } from "@/components/calendar/day-modal/DayModal.types";
import { useContext } from "react";
import { DayModalContext } from "./DayModalContext";

export const useDayModalContext = (): DayModalContextType => {
  const context = useContext(DayModalContext);
  if (!context) {
    throw new Error(
      "useDayModalContext must be used within a DayModalContextController",
    );
  }
  return context;
};
