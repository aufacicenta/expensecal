import { ReactNode } from "react";

export type Month = {
  year: string;
  month: string;
  label: string;
};

export type NavbarTopProps = {
  children?: ReactNode;
  className?: string;
  currentMonthIndex: number;
  availableMonths: Month[];
};
